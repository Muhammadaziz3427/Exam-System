import type { Express } from "express";
import { type Server } from "http"; // createServer olib tashlandi, chunki ishlatilmayapti
import { storage } from "./storage";
import { api } from "@shared/routes";
// z olib tashlandi, chunki pastda api.exams... orqali ishlatilyapti

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Auth Routes ---
  app.post(api.auth.adminLogin.path, async (req, res) => {
    const { username, password } = req.body;
    console.log(`Login attempt - User: ${username}`);

    if (username === "admin" && password === "password123") {
      const user = await storage.getUserByUsername("admin");
      return res.json({ user });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ user });
  });

  app.post(api.auth.studentLogin.path, async (req, res) => {
    const { accessCode, password } = req.body;
    const session = await storage.getSessionByCode(accessCode);

    if (!session) {
      return res.status(401).json({ message: "Invalid access code" });
    }

    if (session.password !== password) {
       return res.status(401).json({ message: "Invalid password" });
    }

    if (session.status === 'completed') {
      return res.status(403).json({ message: "This exam has already been completed." });
    }

    res.json({ session });
  });

  // --- Exam Management ---
  app.get(api.exams.list.path, async (_req, res) => {
    const exams = await storage.getExams();
    res.json(exams);
  });

  app.post(api.exams.create.path, async (req, res) => {
    try {
      const input = api.exams.create.input.parse(req.body);
      const exam = await storage.createExam(input);
      res.status(201).json(exam);
    } catch (_e) {
      res.status(400).json({ message: "Invalid exam data" });
    }
  });

  app.get(api.exams.get.path, async (req, res) => {
    const exam = await storage.getExam(Number(req.params.id));
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json(exam);
  });

  // --- Session Management ---
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const existing = await storage.getSessionByCode(input.accessCode);
      if (existing) return res.status(400).json({ message: "Access code already in use" });

      const session = await storage.createSession(input);
      res.status(201).json(session);
    } catch (_e) {
      res.status(400).json({ message: "Invalid session data" });
    }
  });

  app.get(api.sessions.list.path, async (_req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.post(api.sessions.start.path, async (req, res) => {
    const session = await storage.startSession(Number(req.params.id));
    res.json(session);
  });

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

          let listeningScore = 0;
          if (content.listening && content.listening.questions) {
            content.listening.questions.forEach((q: any) => {
              const studentAnswer = answers.listening?.[q.id];
              const correctAnswer = q.answer;
              if (studentAnswer && correctAnswer && 
                  studentAnswer.toString().trim().toLowerCase() === correctAnswer.toString().trim().toLowerCase()) {
                listeningScore++;
              }
            });
            autoGrading.listening = { score: listeningScore, total: content.listening.questions.length };
          }

          let readingScore = 0;
          if (content.reading && content.reading.questions) {
            content.reading.questions.forEach((q: any) => {
              const studentAnswer = answers.reading?.[q.id];
              const correctAnswer = q.answer;
              if (studentAnswer && correctAnswer && 
                  studentAnswer.toString().trim().toLowerCase() === correctAnswer.toString().trim().toLowerCase()) {
                readingScore++;
              }
            });
            autoGrading.reading = { score: readingScore, total: content.reading.questions.length };
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

    res.json({ message: "Saved" });
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

  try {
    await seedData();
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("Seeding failed:", errorMessage);
  }

  return httpServer;
}

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