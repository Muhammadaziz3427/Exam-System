import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { db } from "./db";
import { exams, examSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendExamResultsEmail } from "./email";
import multer from "multer";
import path from "path";
import fs from "fs";
import * as pdf from "pdf-parse"; // Tuzatildi: import * as pdf
import { GoogleGenerativeAI } from "@google/generative-ai";
import { uploadToSupabase } from "./supabase-service";

// AI sozlamalari
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- MULTER SOZLAMALARI ---
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
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
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
      // pdf-parse ba'zan asinxron emasdek ko'rinishi mumkin, lekin await bilan ishlatish xavfsiz
      const pdfData = await (pdf as any)(dataBuffer); 
      const pdfText = pdfData.text;

      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `
        I am building an IELTS exam system. Extract questions from this PDF text.
        Text: ${pdfText.substring(0, 10000)}

        Return ONLY a JSON object with this exact structure:
        {
          "questions": [
            {
              "id": 1,
              "questionText": "Question text here",
              "options": ["A", "B", "C", "D"],
              "answer": "Correct answer text",
              "type": "multiple-choice"
            }
          ]
        }
        Strictly return ONLY JSON.
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text().replace(/```json|```/g, "").trim();

      const parsedData = JSON.parse(responseText);

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json(parsedData);
    } catch (error) {
      console.error("AI Analysis error:", error);
      res.status(500).json({ message: "AI tahlilida xatolik yuz berdi" });
    }
  });

  app.post("/api/exams/save", upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'images', maxCount: 10 }
  ]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { title, type, questions } = req.body;

      let audioUrl = "";
      if (files?.audio?.[0]) {
        // uploadToSupabase Promise qaytarishiga ishonch hosil qiling
        audioUrl = await uploadToSupabase(files.audio[0].path, files.audio[0].originalname);
        fs.unlinkSync(files.audio[0].path);
      }

      const parsedQuestions = JSON.parse(questions);
      const examContent: any = {};

      if (type === 'reading') {
        examContent.reading = { 
          passages: [{ id: Date.now(), title, content: "Generated Passage", questions: parsedQuestions }] 
        };
      } else {
        examContent.listening = { audioUrl, questions: parsedQuestions };
      }

      const exam = await storage.createExam({
        title,
        content: examContent,
        timeLimit: 60,
        isPublished: false
      });

      res.status(201).json(exam);
    } catch (error) {
      console.error("Save Exam error:", error);
      res.status(500).json({ message: "Testni saqlashda xatolik" });
    }
  });

  // ==========================================
  // --- MAVJUD FAYL YUKLASH ROUTE ---
  // ==========================================
  app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Fayl yuklanmadi" });
      const publicUrl = await uploadToSupabase(req.file.path, req.file.originalname);
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      res.json({ url: publicUrl });
    } catch (error) {
      res.status(500).json({ message: "Yuklash xatosi" });
    }
  });

  // ==========================================
  // --- AUTH ROUTES ---
  // ==========================================
  app.post(api.auth.adminLogin.path, async (req, res) => {
    const { username, password } = req.body;
    if (username === "admin" && password === "password123") {
      const user = await storage.getUserByUsername("admin");
      return res.json({ user });
    }
    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Xato foydalanuvchi nomi yoki parol" });
    }
    res.json({ user });
  });

  app.post(api.auth.studentLogin.path, async (req, res) => {
    const { accessCode, password } = req.body;
    const session = await storage.getSessionByCode(accessCode);
    if (!session) return res.status(401).json({ message: "Kirish kodi noto'g'ri" });
    if (session.password !== password) return res.status(401).json({ message: "Parol noto'g'ri" });
    if (session.status === 'completed') return res.status(403).json({ message: "Imtihon yakunlangan." });
    res.json({ session });
  });

  // ==========================================
  // --- TEACHER MANAGEMENT ---
  // ==========================================
  app.get("/api/admin/teachers", async (_req, res) => {
    const teachers = await storage.getTeachers();
    res.json(teachers);
  });

  app.post("/api/admin/teachers/generate", async (_req, res) => {
    const adjectives = ["Smart", "Quick", "Wise", "Kind"];
    const nouns = ["Mentor", "Coach", "Tutor"];
    const randomName = `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}${Math.floor(Math.random() * 1000)}`;
    const randomPassword = Math.random().toString(36).slice(-8);
    const teacher = await storage.createUser({
      username: randomName,
      password: randomPassword,
      role: "teacher"
    });
    res.status(201).json(teacher);
  });

  app.delete("/api/admin/teachers/:id", async (req, res) => {
    await storage.deleteUser(Number(req.params.id));
    res.sendStatus(204);
  });

  // ==========================================
  // --- EXAM MANAGEMENT ---
  // ==========================================
  app.get(api.exams.list.path, async (_req, res) => {
    const examsList = await storage.getExams();
    res.json(examsList);
  });

  app.post(api.exams.create.path, async (req, res) => {
    try {
      const input = api.exams.create.input.parse(req.body);
      const exam = await storage.createExam(input);
      res.status(201).json(exam);
    } catch (e) {
      res.status(400).json({ message: "Ma'lumotlar xato" });
    }
  });

  app.put("/api/exams/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const input = api.exams.create.input.parse(req.body);
      const [updated] = await db.update(exams)
        .set({ 
          title: input.title, 
          content: input.content, 
          timeLimit: input.timeLimit,
          isPublished: input.isPublished 
        })
        .where(eq(exams.id, id))
        .returning();
      res.json(updated);
    } catch (e) {
      res.status(400).json({ message: "Xato" });
    }
  });

  app.get(api.exams.get.path, async (req, res) => {
    const exam = await storage.getExam(Number(req.params.id));
    res.json(exam);
  });

  // ==========================================
  // --- SESSION MANAGEMENT ---
  // ==========================================
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const { firstName, lastName, email, studentName, accessCode, password, examId, assignedTeacherId } = req.body;
      const session = await storage.createSession({
        firstName, lastName, email, studentName,
        accessCode, password, examId: Number(examId),
        assignedTeacherId: assignedTeacherId ? Number(assignedTeacherId) : undefined
      } as any);
      res.status(201).json(session);
    } catch (e) {
      res.status(400).json({ message: "Sessiya xatosi" });
    }
  });

  app.get(api.sessions.list.path, async (req, res) => {
    const userStr = req.headers['x-user-context'] as string;
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === 'teacher') {
        const sessions = await storage.getSessionsByTeacher(user.id);
        return res.json(sessions);
      }
    }
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.post(api.sessions.start.path, async (req, res) => {
    const session = await storage.startSession(Number(req.params.id));
    res.json(session);
  });

  app.post("/api/sessions/:id/terminate", async (req, res) => {
    await db.update(examSessions)
      .set({ status: 'completed', resultStatus: 'marking' })
      .where(eq(examSessions.id, Number(req.params.id)));
    res.json({ success: true });
  });

  app.get("/api/sessions/:id/submission", async (req, res) => {
    const submission = await storage.getSubmission(Number(req.params.id));
    res.json(submission);
  });

  app.patch("/api/sessions/:id/progress", async (req, res) => {
    await storage.upsertSubmission({ sessionId: Number(req.params.id), answers: req.body.answers });
    res.json({ message: "Saqlandi" });
  });

  app.post("/api/sessions/:id/grade", async (req, res) => {
    await storage.updateGrading(Number(req.params.id), req.body.grading);
    await storage.updateSessionScores(Number(req.params.id), req.body.scores);
    res.json({ message: "Baho saqlandi" });
  });

  app.post("/api/sessions/:id/release", async (req, res) => {
    const sessionId = Number(req.params.id);
    const updatedSession = await storage.releaseResults(sessionId);
    await storage.updateSessionResultStatus(sessionId, 'released');
    await sendExamResultsEmail(updatedSession);
    res.json({ message: "Yuborildi", session: updatedSession });
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    await storage.deleteSession(Number(req.params.id));
    res.sendStatus(204);
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
        const session = await storage.getSession(sessionId);
        if (!session) return res.status(404).json({ message: "Sessiya topilmadi" });
        
        const exam = await storage.getExam(session.examId);
        if (exam) {
          const content = exam.content as any;
          ['listening', 'reading'].forEach(skill => {
            if (content[skill]?.questions) {
              let score = 0;
              content[skill].questions.forEach((q: any) => {
                const studentAns = answers[skill]?.[q.id]?.toString().trim().toLowerCase();
                const correctAns = q.answer?.toString().trim().toLowerCase();
                if (studentAns && studentAns === correctAns) score++;
              });
              autoGrading[skill] = { score, total: content[skill].questions.length };
            }
          });
        }
      }

      await storage.upsertSubmission({ sessionId, answers });

      if (isFinal) {
        const submission = await storage.getSubmission(sessionId);
        if (submission) {
          const currentGrading = (submission.grading as any) || {};
          await storage.updateGrading(sessionId, { ...currentGrading, autoGraded: autoGrading });
        }
        
        const session = await storage.getSession(sessionId);
        const exam = session ? await storage.getExam(session.examId) : null;
        const content = exam?.content as any;
        const hasWriting = content?.writing?.tasks?.length > 0;
        
        // Agar writing bo'lsa pending_grading, bo'lmasa completed
        await storage.updateSessionStatus(sessionId, hasWriting ? 'pending_grading' : 'completed');
        await storage.updateSessionResultStatus(sessionId, 'marking');
      }
      res.json({ message: "Muvaffaqiyatli yakunlandi" });
    } catch (error) {
      console.error("Submit error:", error);
      res.status(500).json({ message: "Xatolik yuz berdi" });
    }
  });

  // ==========================================
  // --- VIOLATIONS ---
  // ==========================================
  app.post(api.sessions.logViolation.path, async (req, res) => {
    const violation = await storage.logViolation({ sessionId: Number(req.params.id), type: req.body.type });
    res.status(201).json(violation);
  });

  try { await seedData(); } catch (err) { console.error("Seeding failed:", err); }

  return httpServer;
}

async function seedData() {
  const admin = await storage.getUserByUsername("admin");
  if (!admin) {
    await storage.createUser({ username: "admin", password: "password123", role: "admin" });
  }
}