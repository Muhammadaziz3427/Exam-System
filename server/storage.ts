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
  getTeachers(): Promise<User[]>;
  deleteUser(id: number): Promise<void>;

  // Exams
  getExams(): Promise<Exam[]>;
  getExam(id: number): Promise<Exam | undefined>;
  createExam(exam: InsertExam): Promise<Exam>;

  // Sessions
  createSession(session: InsertSession): Promise<ExamSession>;
  getSessionByCode(code: string): Promise<ExamSession | undefined>;
  getSession(id: number): Promise<ExamSession | undefined>;
  getSessions(): Promise<ExamSession[]>;
  getSessionsByTeacher(teacherId: number): Promise<ExamSession[]>;
  updateSessionStatus(id: number, status: string): Promise<ExamSession>;
  updateSessionState(id: number, state: { currentSection?: string, remainingTime?: number }): Promise<ExamSession>;
  updateSessionResultStatus(id: number, resultStatus: string): Promise<ExamSession>;
  updateSessionScores(id: number, scores: { writingScore?: string, speakingScore?: string, readingScore?: string, listeningScore?: string, overallBand?: string }): Promise<ExamSession>;
  updateSessionInfo(id: number, info: { firstName?: string, lastName?: string, email?: string }): Promise<ExamSession>;
  updateCameraStatus(id: number, isActive: boolean): Promise<void>;
  startSession(id: number): Promise<ExamSession>;
  releaseResults(id: number): Promise<ExamSession>;
  deleteSession(id: number): Promise<void>;

  // Submissions
  upsertSubmission(submission: InsertSubmission): Promise<Submission>;
  getSubmission(sessionId: number): Promise<Submission | undefined>;
  updateGrading(sessionId: number, grading: any): Promise<Submission>;
  updateAdvancedAssessment(sessionId: number, assessment: any): Promise<Submission>;
  updateAdvancedAnalysis(sessionId: number, analysis: any): Promise<Submission>;
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

  async getTeachers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, 'teacher')).orderBy(desc(users.id));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
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
    const [newSession] = await db.insert(examSessions).values({
      ...session,
      status: 'active',
      resultStatus: 'active'
    }).returning();
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

  async getSessionsByTeacher(teacherId: number): Promise<ExamSession[]> {
    return await db.select().from(examSessions).where(eq(examSessions.assignedTeacherId, teacherId)).orderBy(desc(examSessions.id));
  }

  async updateSessionStatus(id: number, status: string): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set({ status: status as any })
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async updateSessionState(id: number, state: { currentSection?: string, remainingTime?: number }): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set({
        currentSection: state.currentSection,
        remainingTime: state.remainingTime
      })
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async updateSessionResultStatus(id: number, resultStatus: string): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set({ resultStatus: resultStatus as any })
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async updateSessionScores(id: number, scores: { writingScore?: string, speakingScore?: string, readingScore?: string, listeningScore?: string, overallBand?: string }): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set({
        writingScore: scores.writingScore,
        speakingScore: scores.speakingScore,
        readingScore: scores.readingScore,
        listeningScore: scores.listeningScore,
        overallBand: scores.overallBand,
      })
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async updateSessionInfo(id: number, info: { firstName?: string, lastName?: string, email?: string }): Promise<ExamSession> {
    const [updated] = await db.update(examSessions)
      .set(info)
      .where(eq(examSessions.id, id))
      .returning();
    return updated;
  }

  async updateCameraStatus(id: number, isActive: boolean): Promise<void> {
    await db.update(examSessions)
      .set({ 
        isCameraActive: isActive,
        lastCameraPulse: new Date()
      })
      .where(eq(examSessions.id, id));
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

  async deleteSession(id: number): Promise<void> {
    // Delete violations first due to foreign key constraints if any (though not explicitly defined in schema, good practice)
    await db.delete(violations).where(eq(violations.sessionId, id));
    // Delete submission
    await db.delete(submissions).where(eq(submissions.sessionId, id));
    // Delete session
    await db.delete(examSessions).where(eq(examSessions.id, id));
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
    const submission = await this.getSubmission(sessionId);
    if (!submission) throw new Error("Submission not found");
    const currentGrading = (submission.grading as any) || {};

    const updatedGrading = {
      ...currentGrading,
      ...grading
    };

    const [updated] = await db.update(submissions)
      .set({ grading: updatedGrading })
      .where(eq(submissions.sessionId, sessionId))
      .returning();

    // Baholangandan so'ng sessiya statusini yangilaymiz
    await this.updateSessionStatus(sessionId, 'graded');
    return updated;
  }

  async updateAdvancedAssessment(sessionId: number, assessment: any): Promise<Submission> {
    const submission = await this.getSubmission(sessionId);
    if (!submission) throw new Error("Submission not found");

    const currentGrading = (submission.grading as any) || {};
    const updatedGrading = {
      ...currentGrading,
      advancedAssessment: {
        ...(currentGrading.advancedAssessment || {}),
        ...assessment
      }
    };

    const [updated] = await db.update(submissions)
      .set({ grading: updatedGrading })
      .where(eq(submissions.sessionId, sessionId))
      .returning();
    
    return updated;
  }

  async updateAdvancedAnalysis(sessionId: number, analysis: any): Promise<Submission> {
    const submission = await this.getSubmission(sessionId);
    if (!submission) throw new Error("Submission not found");

    const currentGrading = (submission.grading as any) || {};
    const updatedGrading = {
      ...currentGrading,
      advanced_analysis: {
        ...(currentGrading.advanced_analysis || {}),
        ...analysis
      }
    };

    const [updated] = await db.update(submissions)
      .set({ grading: updatedGrading })
      .where(eq(submissions.sessionId, sessionId))
      .returning();

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
    return await db.select().from(violations).orderBy(desc(violations.timestamp));
  }
}

export const storage = new DatabaseStorage();
