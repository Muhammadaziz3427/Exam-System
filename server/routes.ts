import type { Express } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { db } from "./db";
import { exams, examSessions } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sendExamResultsEmail } from "./email";
// YANGI IMPORTLAR
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // 1. UPLOADS PAPKASINI TEKSHIRISH VA YARATISH
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // 2. STATIK FAYLLAR UCHUN YO'LAK (Rasmlar va audiolarni ko'rish uchun)
  app.use("/uploads", express.static(uploadsDir));

  // 3. MULTER SOZLAMALARI (PC-dan yuklash uchun)
  const storageConfig = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      // Fayl nomini unikal qilish (Vaqt + original nomi)
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const cleanName = file.originalname.replace(/\s+/g, '-').replace(/[^a-zA-Z0-9.-]/g, '');
      cb(null, uniqueSuffix + "-" + cleanName);
    },
  });

  const upload = multer({ 
    storage: storageConfig,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
  });

  // 4. FAYL YUKLASH ENDPOINTI (Admin panel uchun)
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "Fayl yuklanmadi" });
      }
      // Frontendga yuklangan fayl nomini qaytaramiz (only filename)
      res.json({ 
        url: `/uploads/${req.file.filename}`, 
        filename: req.file.filename 
      });
    } catch (error) {
      res.status(500).json({ message: "Serverda yuklash xatosi" });
    }
  });

  // --- AUTH ROUTES ---
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
    if (session.status === 'completed') return res.status(403).json({ message: "Bu imtihon allaqachon yakunlangan." });
    res.json({ session });
  });

  // --- TEACHER MANAGEMENT ---
  app.get("/api/admin/teachers", async (_req, res) => {
    const teachers = await storage.getTeachers();
    res.json(teachers);
  });

  app.post("/api/admin/teachers/generate", async (_req, res) => {
    const adjectives = ["Smart", "Quick", "Wise", "Kind", "Bright", "Super", "Cool"];
    const nouns = ["Mentor", "Coach", "Tutor", "Guide", "Sensei", "Guru"];
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

  // --- EXAM MANAGEMENT ---
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
      res.status(400).json({ message: "Imtihon ma'lumotlari xato" });
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

      if (!updated) {
        return res.status(404).json({ message: "Imtihon topilmadi" });
      }
      res.json(updated);
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
      const { firstName, lastName, email, accessCode, password, examId } = req.body;
      const existing = await storage.getSessionByCode(accessCode);
      if (existing) return res.status(400).json({ message: "Ushbu kod band" });

      const studentName = `${firstName} ${lastName}`.trim();
      const session = await storage.createSession({
        firstName, lastName, email, studentName,
        accessCode, password, examId: Number(examId)
      } as any);
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

  app.post("/api/sessions/:id/terminate", async (req, res) => {
    const sessionId = Number(req.params.id);
    try {
      await db.update(examSessions)
        .set({ 
          status: 'completed',
          resultStatus: 'marking' 
        })
        .where(eq(examSessions.id, sessionId));
      res.json({ success: true, message: "Sessiya muvaffaqiyatli yopildi" });
    } catch (error) {
      res.status(500).json({ message: "Bazani yangilashda xatolik" });
    }
  });

  app.patch("/api/sessions/:id/info", async (req, res) => {
    const sessionId = Number(req.params.id);
    const { firstName, lastName, email } = req.body;
    const updated = await storage.updateSessionInfo(sessionId, { firstName, lastName, email });
    res.json(updated);
  });

  app.post("/api/sessions/:id/camera-pulse", async (req, res) => {
    const sessionId = Number(req.params.id);
    const { isActive } = req.body;
    await storage.updateCameraStatus(sessionId, isActive);
    res.json({ success: true });
  });

  app.get("/api/sessions/:id/submission", async (req, res) => {
    const submission = await storage.getSubmission(Number(req.params.id));
    if (!submission) return res.status(404).json({ message: "Submission not found" });
    res.json(submission);
  });

  app.patch("/api/sessions/:id/progress", async (req, res) => {
    const sessionId = Number(req.params.id);
    const { answers } = req.body;
    try {
      await storage.upsertSubmission({ sessionId, answers });
      res.json({ message: "Muvaffaqiyatli saqlandi" });
    } catch (e) {
      res.status(500).json({ message: "Progress saqlashda xatolik" });
    }
  });

  app.patch("/api/sessions/:id", async (req, res) => {
    const sessionId = Number(req.params.id);
    const { email } = req.body;
    try {
      const updated = await storage.updateSessionInfo(sessionId, { email });
      res.json(updated);
    } catch (e) {
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.get("/api/sessions/:id", async (req, res) => {
    const session = await storage.getSession(Number(req.params.id));
    if (!session) return res.status(404).json({ message: "Session not found" });
    res.json(session);
  });

  app.post("/api/sessions/:id/grade", async (req, res) => {
    const sessionId = Number(req.params.id);
    const { grading, scores } = req.body;
    await storage.updateGrading(sessionId, grading);
    await storage.updateSessionScores(sessionId, scores);
    res.json({ message: "Grading saved" });
  });

  app.post("/api/sessions/:id/advanced-assessment", async (req, res) => {
    const sessionId = Number(req.params.id);
    const { assessment } = req.body;
    try {
      const updated = await storage.updateAdvancedAssessment(sessionId, assessment);
      res.json(updated);
    } catch (e) {
      res.status(404).json({ message: "Submission not found" });
    }
  });

  app.post("/api/sessions/:id/release", async (req, res) => {
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Sessiya topilmadi" });

    const updatedSession = await storage.releaseResults(sessionId);
    await storage.updateSessionResultStatus(sessionId, 'released');
    await sendExamResultsEmail(updatedSession);
    res.json({ message: "Results released and email sent", session: updatedSession });
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    const sessionId = Number(req.params.id);
    await storage.deleteSession(sessionId);
    res.sendStatus(204);
  });

  app.post(api.sessions.submit.path, async (req, res) => {
    const sessionId = Number(req.params.id);
    const { answers, isFinal } = req.body;
    let autoGrading: any = {};

    if (isFinal) {
      const session = await storage.getSession(sessionId);
      const exam = session ? await storage.getExam(session.examId) : null;
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

    if (req.body.currentSection !== undefined || req.body.remainingTime !== undefined) {
      await storage.updateSessionState(sessionId, {
        currentSection: req.body.currentSection,
        remainingTime: req.body.remainingTime
      });
    }

    if (isFinal) {
      const submission = await storage.getSubmission(sessionId);
      if (submission) {
        const currentGrading = (submission.grading as any) || {};
        await storage.updateGrading(sessionId, { ...currentGrading, autoGraded: autoGrading });
      }
      const session = await storage.getSession(sessionId);
      const exam = session ? await storage.getExam(session.examId) : null;
      const hasWriting = (exam?.content as any)?.writing?.tasks?.length > 0;
      await storage.updateSessionStatus(sessionId, hasWriting ? 'pending_grading' : 'completed');
      await storage.updateSessionResultStatus(sessionId, 'marking');
    }
    res.json({ message: "Muvaffaqiyatli saqlandi" });
  });

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

  try { await seedData(); } catch (err) { console.error("Seeding failed:", err); }

  return httpServer;
}

async function seedData() {
  const admin = await storage.getUserByUsername("admin");
  if (!admin) {
    await storage.createUser({ username: "admin", password: "password123", role: "admin" });
  }
}