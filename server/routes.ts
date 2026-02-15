import type { Express } from "express";
import { type Server } from "http";
import { api } from "@shared/routes";
import { sendExamResultsEmail } from "./email";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as pdfLib from "pdf-parse"; 
import { GoogleGenerativeAI } from "@google/generative-ai";
import { uploadToSupabase } from "./supabase-service";
import { supabase } from "./db";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ==========================================
  // --- AI EXAM GENERATION ROUTES ---
  // ==========================================
  app.post("/api/exams/analyze-pdf", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "PDF yuklanmadi" });
      const dataBuffer = fs.readFileSync(req.file.path);
      const pdfParser = (pdfLib as any).default || pdfLib;
      const pdfData = await pdfParser(dataBuffer);
      const pdfText = pdfData.text;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are an expert IELTS exam creator. Extract questions from the following PDF text.
        TEXT CONTENT: ${pdfText.substring(0, 15000)}
        INSTRUCTIONS: Create a valid JSON object containing questions.
        REQUIRED JSON STRUCTURE:
        { "questions": [ { "id": 1, "questionText": "...", "options": ["..."], "answer": "...", "type": "multiple-choice" } ] }
        IMPORTANT: Return ONLY raw JSON. No markdown.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text().replace(/```json|```/gi, "").trim();

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        throw new Error("AI javobini o'qib bo'lmadi");
      }

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json(parsedData);
    } catch (error) {
      res.status(500).json({ message: "AI tahlilida xatolik" });
    }
  });

  app.post("/api/exams/save", upload.fields([{ name: 'audio', maxCount: 1 }]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { title, type, questions } = req.body;

      let audioUrl = "";
      if (files?.audio?.[0]) {
        audioUrl = await uploadToSupabase(files.audio[0].path, files.audio[0].originalname);
        if (fs.existsSync(files.audio[0].path)) fs.unlinkSync(files.audio[0].path);
      }

      const parsedQuestions = JSON.parse(questions);
      const examContent: any = {};

      if (type === 'reading') {
        examContent.reading = { passages: [{ id: Date.now(), title, content: "Generated", questions: parsedQuestions }] };
      } else if (type === 'writing') {
        examContent.writing = parsedQuestions.writing;
      } else {
        examContent.listening = { audioUrl, questions: parsedQuestions };
      }

      const { data: exam, error: insertError } = await supabase
        .from('exams')
        .insert([{ title, content: examContent, time_limit: 60, is_published: false }])
        .select().single();

      if (insertError) throw insertError;
      res.status(201).json(exam);
    } catch (error) {
      res.status(500).json({ message: "Testni saqlashda xatolik" });
    }
  });

  // ==========================================
  // --- AUTH ROUTES ---
  // ==========================================
  app.post(api.auth.adminLogin.path, async (req, res) => {
    const { username, password } = req.body;
    const { data: user, error } = await supabase.from('users').select('*').eq('username', username).single();

    if (error || !user || user.password !== password) {
      return res.status(401).json({ message: "Xato login yoki parol" });
    }
    res.json({ user });
  });

  app.post(api.auth.studentLogin.path, async (req, res) => {
    try {
      const { accessCode, password } = req.body;

      if (!accessCode || !password) {
        return res.status(400).json({ message: "Kod va parol kiritilishi shart" });
      }

      // SKRINSHOTDA KO'RINGANIDEK: accessCode ustunidan qidiramiz
      const { data: session, error } = await supabase
        .from('exam_sessions')
        .select('*')
        .eq('accessCode', accessCode.trim().toUpperCase())
        .single();

      if (error || !session) {
        return res.status(401).json({ message: "Kirish kodi topilmadi" });
      }

      if (session.password !== password.trim()) {
        return res.status(401).json({ message: "Parol noto'g'ri" });
      }

      // BIR MARTALIK KIRISH VA STATUS TEKSHIRUVI
      if (session.isUsed === true || session.status === 'completed') {
        return res.status(403).json({ message: "Bu koddan foydalanib bo'lingan yoki imtihon yakunlangan." });
      }

      // Muvaffaqiyatli kirsa, isUsed ni TRUE qilamiz
      const { error: updateError } = await supabase
        .from('exam_sessions')
        .update({ isUsed: true, status: 'active', startTime: new Date() })
        .eq('id', session.id);

      if (updateError) throw updateError;

      res.json({ session });
    } catch (err) {
      res.status(500).json({ message: "Serverda ichki xatolik" });
    }
  });

  // ==========================================
  // --- TEACHER & EXAM MANAGEMENT ---
  // ==========================================
  app.get("/api/admin/teachers", async (_req, res) => {
    const { data: teachers } = await supabase.from('users').select('*').eq('role', 'teacher');
    res.json(teachers || []);
  });

  app.post("/api/admin/teachers/generate", async (_req, res) => {
    const randomName = `Teacher${Math.floor(Math.random() * 1000)}`;
    const randomPassword = Math.random().toString(36).slice(-8);
    const { data: teacher, error } = await supabase.from('users').insert([{ username: randomName, password: randomPassword, role: "teacher" }]).select().single();
    if (error) return res.status(500).json({ message: "Xatolik" });
    res.status(201).json(teacher);
  });

  app.delete("/api/admin/teachers/:id", async (req, res) => {
    await supabase.from('users').delete().eq('id', Number(req.params.id));
    res.sendStatus(204);
  });

  app.get(api.exams.list.path, async (_req, res) => {
    const { data: exams } = await supabase.from('exams').select('*').order('created_at', { ascending: false });
    res.json(exams || []);
  });

  app.get(api.exams.get.path, async (req, res) => {
    const { data: exam, error } = await supabase.from('exams').select('*').eq('id', Number(req.params.id)).single();
    if (error) return res.status(404).json({ message: "Topilmadi" });
    res.json(exam);
  });

  // ==========================================
  // --- SESSION MANAGEMENT (ADMIN) ---
  // ==========================================
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const { examId, assignedTeacherId, ...rest } = req.body;
      const { data: session, error } = await supabase
        .from('exam_sessions')
        .insert([{ 
          ...rest, 
          exam_id: Number(examId), 
          assigned_teacher_id: assignedTeacherId ? Number(assignedTeacherId) : null,
          status: 'created',
          isUsed: false 
        }])
        .select().single();

      if (error) throw error;
      res.status(201).json(session);
    } catch (e) {
      res.status(400).json({ message: "Sessiya yaratib bo'lmadi" });
    }
  });

  app.get(api.sessions.list.path, async (req, res) => {
    let query = supabase.from('exam_sessions').select('*, exams(title)');
    const userStr = req.headers['x-user-context'] as string;
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.role === 'teacher') query = query.eq('assigned_teacher_id', user.id);
      } catch (e) {}
    }
    const { data: sessions } = await query.order('created_at', { ascending: false });
    res.json(sessions || []);
  });

  app.post(api.sessions.start.path, async (req, res) => {
    const { data: session } = await supabase.from('exam_sessions').update({ status: 'active', start_time: new Date() }).eq('id', Number(req.params.id)).select().single();
    res.json(session);
  });

  app.patch("/api/sessions/:id/progress", async (req, res) => {
    const { answers } = req.body;
    await supabase.from('submissions').upsert({ session_id: Number(req.params.id), answers }, { onConflict: 'session_id' });
    res.json({ message: "Saqlandi" });
  });

  app.post("/api/sessions/:id/grade", async (req, res) => {
    const id = Number(req.params.id);
    await supabase.from('submissions').update({ grading: req.body.grading }).eq('session_id', id);
    await supabase.from('exam_sessions').update({ ...req.body.scores }).eq('id', id);
    res.json({ message: "Baho saqlandi" });
  });

  app.post("/api/sessions/:id/release", async (req, res) => {
    const { data: session } = await supabase.from('exam_sessions').update({ result_status: 'released' }).eq('id', Number(req.params.id)).select('*, exams(*)').single();
    if (session) await sendExamResultsEmail(session);
    res.json({ message: "Yuborildi", session });
  });

  // ==========================================
  // --- SUBMISSION & AUTO-GRADING ---
  // ==========================================
  app.post(api.sessions.submit.path, async (req, res) => {
    const sessionId = Number(req.params.id);
    const { answers, isFinal } = req.body;
    let autoGrading: any = {};

    try {
      if (isFinal) {
        const { data: session } = await supabase.from('exam_sessions').select('exam_id').eq('id', sessionId).single();
        const { data: exam } = await supabase.from('exams').select('content').eq('id', session?.exam_id).single();

        if (exam) {
          const content = exam.content as any;
          ['listening', 'reading'].forEach(skill => {
            const skillContent = content[skill];
            let questionsList = skillContent?.questions || [];
            if (skill === 'reading' && skillContent?.passages) {
               questionsList = skillContent.passages.flatMap((p: any) => p.questions);
            }

            if (questionsList.length > 0) {
              let score = 0;
              questionsList.forEach((q: any) => {
                const studentAns = answers[skill]?.[q.id]?.toString().trim().toLowerCase();
                const correctAns = q.answer?.toString().trim().toLowerCase();
                if (studentAns && studentAns === correctAns) score++;
              });
              autoGrading[skill] = { score, total: questionsList.length };
            }
          });
        }
      }

      await supabase.from('submissions').upsert({ session_id: sessionId, answers }, { onConflict: 'session_id' });

      if (isFinal) {
        const { data: sub } = await supabase.from('submissions').select('grading').eq('session_id', sessionId).single();
        await supabase.from('submissions').update({ grading: { ...sub?.grading, autoGraded: autoGrading } }).eq('session_id', sessionId);

        const { data: sData } = await supabase.from('exam_sessions').select('exam_id').eq('id', sessionId).single();
        const { data: eData } = await supabase.from('exams').select('content').eq('id', sData?.exam_id).single();
        const hasWriting = (eData?.content as any)?.writing?.tasks?.length > 0;

        await supabase.from('exam_sessions').update({ 
          status: hasWriting ? 'pending_grading' : 'completed',
          result_status: 'marking' 
        }).eq('id', sessionId);
      }
      res.json({ message: "Yakunlandi" });
    } catch (error) {
      res.status(500).json({ message: "Xatolik" });
    }
  });

  app.post(api.sessions.logViolation.path, async (req, res) => {
    const { data: v } = await supabase.from('violations').insert([{ session_id: Number(req.params.id), type: req.body.type }]).select().single();
    res.status(201).json(v);
  });

  return httpServer;
}