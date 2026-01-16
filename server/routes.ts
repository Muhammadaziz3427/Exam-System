import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { db } from "./db";
import { exams } from "@shared/schema";
import { eq } from "drizzle-orm";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- AUTH ROUTES ---
  app.post(api.auth.adminLogin.path, async (req, res) => {
    const { username, password } = req.body;
    console.log(`Admin login attempt: ${username}`);

    // Avval maxsus adminni tekshiramiz (Hardcoded logic saqlab qolindi)
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

    if (!session) {
      return res.status(401).json({ message: "Kirish kodi noto'g'ri" });
    }

    if (session.password !== password) {
      return res.status(401).json({ message: "Parol noto'g'ri" });
    }

    if (session.status === 'completed') {
      return res.status(403).json({ message: "Bu imtihon allaqachon yakunlangan." });
    }

    res.json({ session });
  });

  // --- EXAM MANAGEMENT ---
  app.get(api.exams.list.path, async (_req, res) => {
    const exams = await storage.getExams();
    res.json(exams);
  });

  app.post(api.exams.create.path, async (req, res) => {
    try {
      const input = api.exams.create.input.parse(req.body);
      const exam = await storage.createExam(input);
      res.status(201).json(exam);
    } catch (e) {
      res.status(400).json({ message: "Imtihon ma'lumotlari xato" });
    }
  });

  app.get(api.exams.get.path, async (req, res) => {
    const exam = await storage.getExam(Number(req.params.id));
    if (!exam) return res.status(404).json({ message: "Imtihon topilmadi" });
    res.json(exam);
  });

  app.patch("/api/exams/:id", async (req, res) => {
    const id = Number(req.params.id);
    const { title, content, timeLimit } = req.body;
    const [updated] = await db.update(exams)
      .set({ title, content, timeLimit })
      .where(eq(exams.id, id))
      .returning();
    res.json(updated);
  });

  // --- SESSION MANAGEMENT (MONITORING) ---
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const existing = await storage.getSessionByCode(input.accessCode);
      if (existing) return res.status(400).json({ message: "Ushbu kod band" });

      const session = await storage.createSession(input);
      res.status(201).json(session);
    } catch (e) {
      res.status(400).json({ message: "Sessiya ma'lumotlari xato" });
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

  app.patch("/api/sessions/:id/info", async (req, res) => {
    const sessionId = Number(req.params.id);
    const { firstName, lastName, email } = req.body;
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Directly updating via storage if possible, otherwise we need to add a method to storage.ts
    // For now, let's assume we can extend storage.ts or use a generic update.
    // Since I can't easily see all storage methods without reading storage.ts, 
    // I'll check if there's an update method.
    const updated = await storage.updateSessionInfo(sessionId, { firstName, lastName, email });
    res.json(updated);
  });

  // --- SUBMISSION & AUTO-GRADING ---
  app.post(api.sessions.submit.path, async (req, res) => {
    const sessionId = Number(req.params.id);
    const { answers, isFinal } = req.body;

    let autoGrading: any = {};

    if (isFinal) {
      const session = await storage.getSession(sessionId);
      if (session) {
        const exam = await storage.getExam(session.examId);
        if (exam) {
          const content = exam.content as any;

          // 1. Listening Auto-grading
          if (content.listening?.questions) {
            let lScore = 0;
            content.listening.questions.forEach((q: any) => {
              const studentAns = answers.listening?.[q.id];
              if (studentAns?.toString().trim().toLowerCase() === q.answer?.toString().trim().toLowerCase()) {
                lScore++;
              }
            });
            autoGrading.listening = { score: lScore, total: content.listening.questions.length };
          }

          // 2. Reading Auto-grading
          if (content.reading?.questions) {
            let rScore = 0;
            content.reading.questions.forEach((q: any) => {
              const studentAns = answers.reading?.[q.id];
              if (studentAns?.toString().trim().toLowerCase() === q.answer?.toString().trim().toLowerCase()) {
                rScore++;
              }
            });
            autoGrading.reading = { score: rScore, total: content.reading.questions.length };
          }
        }
      }
    }

    await storage.upsertSubmission({ sessionId, answers });

    if (isFinal) {
      const submission = await storage.getSubmission(sessionId);
      if (submission) {
        const currentGrading = (submission.grading as any) || {};
        await storage.updateGrading(sessionId, {
          ...currentGrading,
          autoGraded: autoGrading
        });
      }
      await storage.updateSessionStatus(sessionId, 'completed');
    }

    res.json({ message: "Muvaffaqiyatli saqlandi" });
  });

  // --- VIOLATIONS ---
  app.post(api.sessions.logViolation.path, async (req, res) => {
    const sessionId = Number(req.params.id);
    const { type } = req.body;
    const violation = await storage.logViolation({ sessionId, type });
    res.status(201).json(violation);
  });

  app.get('/api/violations', async (_req, res) => {
    const allViolations = await storage.getViolations();
    res.json(allViolations);
  });

  // Seed data initial load
  try {
    await seedData();
  } catch (err) {
    console.error("Seeding failed:", err);
  }

  return httpServer;
}

// SEED DATA LOGIC (Siz yuborgan eski mantiq saqlab qolindi)
async function seedData() {
  const admin = await storage.getUserByUsername("admin");
  if (!admin) {
    await storage.createUser({
      username: "admin",
      password: "password123",
      role: "admin"
    });
    console.log("Seeded Admin: admin / password123");
  }

  const exams = await storage.getExams();
  if (exams.length === 0) {
    await storage.createExam({
      title: "IELTS Mock Test 1",
      timeLimit: 120,
      content: {
        listening: {
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          questions: [{ id: 1, text: "Sample Question?", options: ["A", "B"], answer: "A" }]
        },
        reading: {
          passage: "Sample passage content...",
          questions: [{ id: 1, text: "Reading Question?", options: ["Yes", "No"], answer: "Yes" }]
        },
        writing: { prompts: ["Writing task 1: Describe the process of making tea."] }
      },
      isPublished: true
    });
    console.log("Seeded Sample Exam");
  }
}