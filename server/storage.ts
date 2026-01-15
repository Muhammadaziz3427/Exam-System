import { db } from "./db";
import {
  users, exams, examSessions, submissions, violations,
  type User, type Exam, type ExamSession, type Submission, type Violation,
  type InsertUser, type InsertExam, type InsertSession, type InsertSubmission, type InsertViolation
} from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Exams
  getExams(): Promise<Exam[]>;
  getExam(id: number): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;

  // Sessions
  createSession(session: InsertSession): Promise<ExamSession>;
  getSessionByCode(code: string): Promise<ExamSession | undefined>;
  getSession(id: number): Promise<ExamSession | undefined>;
  getSessions(): Promise<ExamSession[]>;
  updateSessionStatus(id: number, status: string): Promise<ExamSession>;
  startSession(id: number): Promise<ExamSession>;
  releaseResults(id: number): Promise<ExamSession>;

  // Submissions
  upsertSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(sessionId: number): Promise<Submission | undefined>;
  updateGrading(sessionId: number, grading: any): Promise<Submission>;
  getPendingGradingSubmissions(): Promise<(Submission & { session: ExamSession })[]>;

  // Violations
  logViolation(violation: InsertViolation): Promise<Violation>;
  getViolations(): Promise<Violation[]>;
}

export class DatabaseStorage implements IStorage {
  // --- USERS ---
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  // --- EXAMS ---
  async getExams(): Promise<Exam[]> {
    return await db.select().from(exams).orderBy(desc(exams.id));
  }

  async getExam(id: number): Promise<Exam | undefined> {
    const [exam] = await db.select().from(exams).where(eq(exams.id, id));
    return exam;
  }

  async createExam(exam: InsertExam): Promise<Exam> {
    const [newExam] = await db.insert(exams).values(exam).returning();
    return newExam;
  }

  // --- SESSIONS ---
  async createSession(session: InsertSession): Promise<ExamSession> {
    const [newSession] = await db.insert(examSessions).values(session).returning();
    return newSession;
  }

  async getSessionByCode(code: string): Promise<ExamSession | undefined> {
    const [session] = await db.select().from(examSessions).where(eq(examSessions.accessCode, code));
    return session;
  }

  async getSession(id: number): Promise<ExamSession | undefined> {
    const [session] = await db.select().from(examSessions).where(eq(examSessions.id, id));
    return session;
  }

  async getSessions(): Promise<ExamSession[]> {
    return await db.select().from(examSessions).orderBy(desc(examSessions.id));
  }

  async updateSessionStatus(id: number, status: string): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set({ status: status as any })
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async startSession(id: number): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set({ 
        status: 'in_progress', 
        startTime: new Date() 
      })
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async releaseResults(id: number): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set({ resultsReleased: true })
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  // --- SUBMISSIONS ---
  async upsertSubmission(submission: InsertSubmission): Promise<Submission> {
    const [existing] = await db
      .select()
      .from(submissions)
      .where(eq(submissions.sessionId, submission.sessionId));

    if (existing) {
      const [updated] = await db.update(submissions)
        .set({ 
          answers: submission.answers, 
          lastSavedAt: new Date() 
        })
        .where(eq(submissions.id, existing.id))
        .returning();
      return updated;
    } else {
      const [newSub] = await db.insert(submissions).values({
        ...submission,
        lastSavedAt: new Date()
      }).returning();
      return newSub;
    }
  }

  async getSubmission(sessionId: number): Promise<Submission | undefined> {
    const [sub] = await db.select().from(submissions).where(eq(submissions.sessionId, sessionId));
    return sub;
  }

  async updateGrading(sessionId: number, grading: any): Promise<Submission> {
    const [updated] = await db.update(submissions)
      .set({ grading })
      .where(eq(submissions.sessionId, sessionId))
      .returning();

    // Baholangandan so'ng sessiya statusini yangilaymiz
    await this.updateSessionStatus(sessionId, 'graded');
    return updated;
  }

  async getPendingGradingSubmissions(): Promise<(Submission & { session: ExamSession })[]> {
    const results = await db.select({
      submission: submissions,
      session: examSessions
    })
    .from(submissions)
    .innerJoin(examSessions, eq(submissions.sessionId, examSessions.id))
    .where(eq(examSessions.status, 'pending_grading'));

    return results.map(r => ({ ...r.submission, session: r.session }));
  }

  // --- VIOLATIONS ---
  async logViolation(violation: InsertViolation): Promise<Violation> {
    const [v] = await db.insert(violations).values(violation).returning();
    return v;
  }

  async getViolations(): Promise<Violation[]> {
    // Eng so'nggi qoidabuzarliklar birinchi ko'rinishi uchun timestamp bo'yicha tartiblaymiz
    return await db.select().from(violations).orderBy(desc(violations.timestamp));
  }
}

export const storage = new DatabaseStorage();