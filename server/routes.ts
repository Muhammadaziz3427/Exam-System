
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Auth Routes ---

  app.post(api.auth.adminLogin.path, async (req, res) => {
    const { username, password } = req.body;
    // In a real app, use hashed passwords! For this mock platform, simple comparison.
    const user = await storage.getUserByUsername(username);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    
    // For simplicity in this mock, we return the user object. 
    // In production, use session/JWT.
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
    
    // If it's a first login, it might be 'created'. If they are reconnecting, it's 'in_progress'.
    // We allow reconnection if 'in_progress'.

    res.json({ session });
  });

  // --- Exam Management ---

  app.get(api.exams.list.path, async (req, res) => {
    const exams = await storage.getExams();
    res.json(exams);
  });

  app.post(api.exams.create.path, async (req, res) => {
    try {
      const input = api.exams.create.input.parse(req.body);
      const exam = await storage.createExam(input);
      res.status(201).json(exam);
    } catch (e) {
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
    const input = api.sessions.create.input.parse(req.body);
    // Ensure access code is unique (simple check, DB constraint handles it too)
    const existing = await storage.getSessionByCode(input.accessCode);
    if (existing) return res.status(400).json({ message: "Access code already in use" });
    
    const session = await storage.createSession(input);
    res.status(201).json(session);
  });

  app.get(api.sessions.list.path, async (req, res) => {
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
    
    // Auto-grading logic for Listening and Reading
    let autoGrading: any = {};
    if (isFinal) {
      const session = await storage.getSession(sessionId);
      if (session) {
        const exam = await storage.getExam(session.examId);
        if (exam) {
          const content = exam.content as any;
          
          // Grade Listening
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
            autoGrading.listening = {
              score: listeningScore,
              total: content.listening.questions.length
            };
          }

          // Grade Reading
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
            autoGrading.reading = {
              score: readingScore,
              total: content.reading.questions.length
            };
          }
        }
      }
    }

    await storage.upsertSubmission({
      sessionId,
      answers
    });

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

  app.get('/api/violations', async (req, res) => {
    const allViolations = await storage.getViolations();
    res.json(allViolations);
  });


  // --- Seed Data ---
  await seedData();

  return httpServer;
}

async function seedData() {
  // Create an Admin if not exists
  const admin = await storage.getUserByUsername("admin");
  if (!admin) {
    await storage.createUser({
      username: "admin",
      password: "password123", // Static credential as requested
      role: "admin"
    });
    console.log("Seeded Admin: admin / password123");
  }

  // Create a sample Exam
  const exams = await storage.getExams();
  if (exams.length === 0) {
    await storage.createExam({
      title: "IELTS Mock Test 1",
      timeLimit: 120, // 2 hours
      content: {
        listening: {
          audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", // Public sample
          questions: [
            { id: 1, text: "What is the main topic of the conversation?", options: ["Travel", "Food", "Study"], answer: "Travel" }
          ]
        },
        reading: {
          passage: "The history of the IELTS exam dates back to 1980...",
          questions: [
             { id: 1, text: "When did IELTS start?", options: ["1980", "1990", "2000"], answer: "1980" }
          ]
        },
        writing: {
          prompts: ["Describe a memorable journey you have taken."]
        }
      },
      isPublished: true
    });
    console.log("Seeded Sample Exam");
  }

  // Seed violations for testing if needed
  const sessions = await storage.getSessions();
  if (sessions.length > 0) {
     const violations = await storage.getViolations();
     if (violations.length === 0) {
        await storage.logViolation({ sessionId: sessions[0].id, type: 'tab_switch' });
        console.log("Seeded sample violation");
     }
  }
}
