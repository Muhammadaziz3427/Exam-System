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
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: multerStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ------------------------------------------------------------
  // AI EXAM GENERATION ROUTES
  // ------------------------------------------------------------
  app.post("/api/exams/analyze-pdf", upload.single("pdf"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "PDF yuklanmadi" });
      }

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
      let responseText = result.response.text().replace(/```json|```/gi, "").trim();

      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) responseText = jsonMatch[0];

      let parsedData;
      try {
        parsedData = JSON.parse(responseText);
      } catch (e) {
        console.error("AI javobini parse qilishda xatolik:", e);
        return res.status(500).json({ message: "AI javobini o‘qib bo‘lmadi" });
      }

      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.json(parsedData);
    } catch (error) {
      console.error("AI tahlil xatosi:", error);
      res.status(500).json({ message: "AI tahlilida xatolik" });
    }
  });

  app.post("/api/exams/save", upload.fields([{ name: "audio", maxCount: 1 }]), async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { title, type, questions } = req.body;

      if (!title || !type || !questions) {
        return res.status(400).json({ message: "title, type va questions majburiy" });
      }

      let audioUrl = "";
      if (files?.audio?.[0]) {
        audioUrl = await uploadToSupabase(files.audio[0].path, files.audio[0].originalname);
        if (fs.existsSync(files.audio[0].path)) {
          fs.unlinkSync(files.audio[0].path);
        }
      }

      const parsedQuestions = JSON.parse(questions);
      const examContent: any = {};

      if (type === "reading") {
        examContent.reading = {
          passages: [
            {
              id: Date.now(),
              title,
              content: "Generated",
              questions: parsedQuestions,
            },
          ],
        };
      } else if (type === "writing") {
        examContent.writing = parsedQuestions.writing;
      } else {
        examContent.listening = { audioUrl, questions: parsedQuestions };
      }

      const { data: exam, error: insertError } = await supabase
        .from("exams")
        .insert([
          {
            title,
            content: examContent,
            time_limit: 60,              // snake_case bo‘lishi mumkin, tekshiring
            is_published: false,
          },
        ])
        .select()
        .single();

      if (insertError) throw insertError;

      res.status(201).json(exam);
    } catch (error) {
      console.error("Exam saqlashda xatolik:", error);
      res.status(500).json({ message: "Testni saqlashda xatolik" });
    }
  });

  // ------------------------------------------------------------
  // AUTH ROUTES
  // ------------------------------------------------------------
  app.post(api.auth.adminLogin.path, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Login va parol kiritilishi shart" });
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .maybeSingle();  // topilmasa null, xatolik emas

      if (error) throw error;
      if (!user) {
        return res.status(401).json({ message: "Xato login yoki parol" });
      }

      // Parolni tekshirish (ochiq matn, kelajakda bcrypt qo‘shing)
      if (user.password !== password) {
        return res.status(401).json({ message: "Xato login yoki parol" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Admin login xatosi:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // ---------- STUDENT LOGIN (TO‘LIQ QAYTA YOZILDI) ----------
  app.post(api.auth.studentLogin.path, async (req, res) => {
    try {
      const { accessCode, password } = req.body;
      console.log("[LOGIN] 1. Qabul qilingan:", { accessCode, password });

      if (!accessCode || !password) {
        return res.status(400).json({ message: "Kod va parol kiritilishi shart" });
      }

      const normalizedCode = accessCode.trim().toUpperCase();
      console.log("[LOGIN] 2. Normalashtirilgan kod:", normalizedCode);

      // Sessiyani qidirish
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("access_code", normalizedCode)
        .maybeSingle();   // .single() emas – agar topilmasa null qaytaradi, error emas

      if (error) {
        console.error("[LOGIN] 3. Supabase xatosi:", error);
        return res.status(500).json({ message: "Server xatosi" });
      }

      if (!session) {
        console.log("[LOGIN] 4. Sessiya topilmadi");
        return res.status(401).json({ message: "Kirish kodi topilmadi" });
      }

      console.log("[LOGIN] 5. Sessiya topildi:", {
        id: session.id,
        status: session.status,
        is_used: session.is_used,
        dbPassword: session.password,
      });

      // Parolni tekshirish (ochiq matn)
      if (session.password !== password.trim()) {
        console.log("[LOGIN] 6. Parol mos kelmadi");
        return res.status(401).json({ message: "Parol noto'g'ri" });
      }

      console.log("[LOGIN] 7. Parol mos keldi");

      // Sessiya holatini tekshirish
      if (session.is_used === true) {
        console.log("[LOGIN] 8. Kod avval ishlatilgan");
        return res.status(403).json({ message: "Kod ishlatilgan" });
      }

      if (session.status === "completed") {
        console.log("[LOGIN] 9. Imtihon yakunlangan");
        return res.status(403).json({ message: "Imtihon yakunlangan" });
      }

      // Sessiyani yangilash
      const { error: updateError } = await supabase
        .from("exam_sessions")
        .update({
          is_used: true,
          status: "active",
          start_time: new Date().toISOString(),
        })
        .eq("id", session.id);

      if (updateError) {
        console.error("[LOGIN] 10. Yangilash xatosi:", updateError);
        return res.status(500).json({ message: "Sessiyani yangilashda xatolik" });
      }

      console.log("[LOGIN] 11. Muvaffaqiyatli!");

      // Parolni olib tashlab javob qaytarish
      const { password: _, ...sessionWithoutPassword } = session;
      res.json({ session: sessionWithoutPassword });

    } catch (error) {
      console.error("[LOGIN] 12. Kutilmagan xatolik:", error);
      res.status(500).json({ message: "Serverda ichki xatolik" });
    }
  });

  app.post("/api/exams/save-from-json", async (req, res) => {
    try {
      const { title, jsonContent } = req.body;
      if (!title || !jsonContent) {
        return res.status(400).json({ message: "title va jsonContent majburiy" });
      }

      let parsed;
      try {
        parsed = typeof jsonContent === "string" ? JSON.parse(jsonContent) : jsonContent;
      } catch (e) {
        return res.status(400).json({ message: "JSON formati noto'g'ri" });
      }

      if (!parsed.listening && !parsed.reading && !parsed.writing) {
        return res.status(400).json({
          message: "JSON ichida listening, reading yoki writing kalitlari bo'lishi shart",
        });
      }

      const { data: exam, error } = await supabase
        .from("exams")
        .insert([
          {
            title,
            content: parsed,
            time_limit: 60,
            is_published: true,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(exam);
    } catch (error) {
      console.error("JSON dan saqlash xatosi:", error);
      res.status(500).json({ message: "JSON orqali saqlashda xatolik" });
    }
  });

  // ------------------------------------------------------------
  // TEACHER & EXAM MANAGEMENT
  // ------------------------------------------------------------
  app.get("/api/admin/teachers", async (_req, res) => {
    try {
      const { data: teachers } = await supabase
        .from("users")
        .select("*")
        .eq("role", "teacher");
      res.json(teachers || []);
    } catch (error) {
      res.status(500).json({ message: "O'qituvchilarni olishda xatolik" });
    }
  });

  app.post("/api/admin/teachers/generate", async (_req, res) => {
    try {
      const randomName = `Teacher${Math.floor(Math.random() * 1000)}`;
      const randomPassword = Math.random().toString(36).slice(-8);
      const { data: teacher, error } = await supabase
        .from("users")
        .insert([{ username: randomName, password: randomPassword, role: "teacher" }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(teacher);
    } catch (error) {
      res.status(500).json({ message: "O'qituvchi yaratishda xatolik" });
    }
  });

  app.delete("/api/admin/teachers/:id", async (req, res) => {
    try {
      await supabase.from("users").delete().eq("id", Number(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "O'qituvchini o'chirishda xatolik" });
    }
  });

  app.get(api.exams.list.path, async (_req, res) => {
    try {
      const { data: exams } = await supabase
        .from("exams")
        .select("*")
        .order("created_at", { ascending: false });
      res.json(exams || []);
    } catch (error) {
      res.status(500).json({ message: "Examlarni olishda xatolik" });
    }
  });

  app.get(api.exams.get.path, async (req, res) => {
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", Number(req.params.id))
        .maybeSingle();

      if (error) throw error;
      if (!exam) {
        return res.status(404).json({ message: "Exam topilmadi" });
      }
      res.json(exam);
    } catch (error) {
      res.status(500).json({ message: "Examni olishda xatolik" });
    }
  });

  // ------------------------------------------------------------
  // SESSION MANAGEMENT (ADMIN)
  // ------------------------------------------------------------
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const { examId, assignedTeacherId, ...rest } = req.body;

      const { data: session, error } = await supabase
        .from("exam_sessions")
        .insert([
          {
            ...rest,
            exam_id: Number(examId),
            assigned_teacher_id: assignedTeacherId ? Number(assignedTeacherId) : null,
            status: "created",
            is_used: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(session);
    } catch (error) {
      console.error("Sessiya yaratish xatosi:", error);
      res.status(400).json({ message: "Sessiya yaratib bo'lmadi" });
    }
  });

  app.get(api.sessions.list.path, async (req, res) => {
    try {
      let query = supabase.from("exam_sessions").select("*, exams(title)");
      const userStr = req.headers["x-user-context"] as string;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role === "teacher") {
            query = query.eq("assigned_teacher_id", user.id);
          }
        } catch (e) {
          // ignore
        }
      }
      const { data: sessions } = await query.order("created_at", { ascending: false });
      res.json(sessions || []);
    } catch (error) {
      res.status(500).json({ message: "Sessiyalarni olishda xatolik" });
    }
  });

  app.post(api.sessions.start.path, async (req, res) => {
    try {
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .update({ status: "active", start_time: new Date().toISOString() })
        .eq("id", Number(req.params.id))
        .select()
        .single();

      if (error) throw error;
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Sessiyani boshlashda xatolik" });
    }
  });

  app.patch("/api/sessions/:id/progress", async (req, res) => {
    try {
      const { answers } = req.body;
      await supabase
        .from("submissions")
        .upsert({ session_id: Number(req.params.id), answers }, { onConflict: "session_id" });
      res.json({ message: "Saqlandi" });
    } catch (error) {
      res.status(500).json({ message: "Progressni saqlashda xatolik" });
    }
  });

  app.post("/api/sessions/:id/grade", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await supabase
        .from("submissions")
        .update({ grading: req.body.grading })
        .eq("session_id", id);
      await supabase
        .from("exam_sessions")
        .update({ ...req.body.scores })
        .eq("id", id);
      res.json({ message: "Baho saqlandi" });
    } catch (error) {
      res.status(500).json({ message: "Baho saqlashda xatolik" });
    }
  });

  app.post("/api/sessions/:id/release", async (req, res) => {
    try {
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .update({ result_status: "released" })
        .eq("id", Number(req.params.id))
        .select("*, exams(*)")
        .single();

      if (error) throw error;
      if (session) await sendExamResultsEmail(session);
      res.json({ message: "Yuborildi", session });
    } catch (error) {
      res.status(500).json({ message: "Natijalarni yuborishda xatolik" });
    }
  });

  // ------------------------------------------------------------
  // SUBMISSION & AUTO-GRADING
  // ------------------------------------------------------------
  app.post(api.sessions.submit.path, async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const { answers, isFinal } = req.body;
      let autoGrading: any = {};

      if (isFinal) {
        const { data: session } = await supabase
          .from("exam_sessions")
          .select("exam_id")
          .eq("id", sessionId)
          .maybeSingle();

        if (session?.exam_id) {
          const { data: exam } = await supabase
            .from("exams")
            .select("content")
            .eq("id", session.exam_id)
            .maybeSingle();

          if (exam) {
            const content = exam.content as any;
            ["listening", "reading"].forEach((skill) => {
              const skillContent = content[skill];
              let questionsList = skillContent?.questions || [];
              if (skill === "reading" && skillContent?.passages) {
                questionsList = skillContent.passages.flatMap((p: any) => p.questions || []);
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
      }

      await supabase
        .from("submissions")
        .upsert({ session_id: sessionId, answers }, { onConflict: "session_id" });

      if (isFinal) {
        const { data: sub } = await supabase
          .from("submissions")
          .select("grading")
          .eq("session_id", sessionId)
          .maybeSingle();

        await supabase
          .from("submissions")
          .update({ grading: { ...(sub?.grading || {}), autoGraded: autoGrading } })
          .eq("session_id", sessionId);

        const { data: sData } = await supabase
          .from("exam_sessions")
          .select("exam_id")
          .eq("id", sessionId)
          .maybeSingle();

        if (sData?.exam_id) {
          const { data: eData } = await supabase
            .from("exams")
            .select("content")
            .eq("id", sData.exam_id)
            .maybeSingle();

          const hasWriting = (eData?.content as any)?.writing?.tasks?.length > 0;

          await supabase
            .from("exam_sessions")
            .update({
              status: hasWriting ? "pending_grading" : "completed",
              result_status: "marking",
            })
            .eq("id", sessionId);
        }
      }

      res.json({ message: "Yakunlandi" });
    } catch (error) {
      console.error("Submit xatosi:", error);
      res.status(500).json({ message: "Xatolik" });
    }
  });

  app.post(api.sessions.logViolation.path, async (req, res) => {
    try {
      const { data: v, error } = await supabase
        .from("violations")
        .insert([{ session_id: Number(req.params.id), type: req.body.type }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(v);
    } catch (error) {
      res.status(500).json({ message: "Violation log qilishda xatolik" });
    }
  });

  return httpServer;
}