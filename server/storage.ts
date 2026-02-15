import { supabase } from "./db";
import {
  type User, type Exam, type ExamSession, type Submission, type Violation,
  type InsertUser, type InsertExam, type InsertSession, type InsertSubmission, type InsertViolation
} from "@shared/schema";

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
    const { data } = await supabase.from('users').select('*').eq('username', username).single();
    return data || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const { data, error } = await supabase.from('users').insert([user]).select().single();
    if (error) throw error;
    return data;
  }

  async getTeachers(): Promise<User[]> {
    const { data } = await supabase.from('users').select('*').eq('role', 'teacher').order('id', { ascending: false });
    return data || [];
  }

  async deleteUser(id: number): Promise<void> {
    await supabase.from('users').delete().eq('id', id);
  }

  // --- EXAMS ---
  async getExams(): Promise<Exam[]> {
    const { data } = await supabase.from('exams').select('*').order('id', { ascending: false });
    return data || [];
  }

  async getExam(id: number): Promise<Exam | undefined> {
    const { data } = await supabase.from('exams').select('*').eq('id', id).single();
    return data || undefined;
  }

  async createExam(exam: InsertExam): Promise<Exam> {
    const { data, error } = await supabase.from('exams').insert([exam]).select().single();
    if (error) throw error;
    return data;
  }

  // --- SESSIONS ---
  async createSession(session: InsertSession): Promise<ExamSession> {
    const { data, error } = await supabase.from('exam_sessions').insert([{
      ...session,
      status: 'created',
      resultStatus: 'active',
      startTime: null,
      isCameraActive: false,
      resultsReleased: false,
      isUsed: false
    }]).select().single();
    if (error) throw error;
    return data;
  }

  async getSessionByCode(code: string): Promise<ExamSession | undefined> {
    const { data } = await supabase.from('exam_sessions').select('*').eq('accessCode', code).single();
    return data || undefined;
  }

  async getSession(id: number): Promise<ExamSession | undefined> {
    const { data } = await supabase.from('exam_sessions').select('*').eq('id', id).single();
    return data || undefined;
  }

  async getSessions(): Promise<ExamSession[]> {
    const { data } = await supabase.from('exam_sessions').select('*').order('id', { ascending: false });
    return data || [];
  }

  async getSessionsByTeacher(teacherId: number): Promise<ExamSession[]> {
    const { data } = await supabase.from('exam_sessions').select('*').eq('assignedTeacherId', teacherId).order('id', { ascending: false });
    return data || [];
  }

  async updateSessionStatus(id: number, status: string): Promise<ExamSession> {
    const payload: any = { status };
    if (status === 'completed' || status === 'pending_grading') {
      payload.endTime = new Date().toISOString();
    }
    const { data, error } = await supabase.from('exam_sessions').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async updateSessionState(id: number, state: { currentSection?: string, remainingTime?: number }): Promise<ExamSession> {
    const { data, error } = await supabase.from('exam_sessions').update(state).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async updateSessionResultStatus(id: number, resultStatus: string): Promise<ExamSession> {
    const { data, error } = await supabase.from('exam_sessions').update({ resultStatus }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async updateSessionScores(id: number, scores: any): Promise<ExamSession> {
    const { data, error } = await supabase.from('exam_sessions').update(scores).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async updateSessionInfo(id: number, info: any): Promise<ExamSession> {
    const { data, error } = await supabase.from('exam_sessions').update(info).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async updateCameraStatus(id: number, isActive: boolean): Promise<void> {
    await supabase.from('exam_sessions').update({ 
      isCameraActive: isActive, 
      lastCameraPulse: new Date().toISOString() 
    }).eq('id', id);
  }

  async startSession(id: number): Promise<ExamSession> {
    const { data, error } = await supabase.from('exam_sessions').update({
      status: 'in_progress',
      startTime: new Date().toISOString()
    }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async releaseResults(id: number): Promise<ExamSession> {
    const { data, error } = await supabase.from('exam_sessions').update({ resultsReleased: true }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async deleteSession(id: number): Promise<void> {
    await supabase.from('violations').delete().eq('sessionId', id);
    await supabase.from('submissions').delete().eq('sessionId', id);
    await supabase.from('exam_sessions').delete().eq('id', id);
  }

  // --- SUBMISSIONS ---
  async upsertSubmission(submission: InsertSubmission): Promise<Submission> {
    // Supabase .upsert() funksiyasi onConflict bilan ishlaydi
    const { data, error } = await supabase.from('submissions').upsert({
      ...submission,
      lastSavedAt: new Date().toISOString()
    }, { onConflict: 'sessionId' }).select().single();

    if (error) throw error;
    return data;
  }

  async getSubmission(sessionId: number): Promise<Submission | undefined> {
    const { data } = await supabase.from('submissions').select('*').eq('sessionId', sessionId).single();
    return data || undefined;
  }

  async updateGrading(sessionId: number, grading: any): Promise<Submission> {
    const submission = await this.getSubmission(sessionId);
    if (!submission) throw new Error("Submission not found");
    const currentGrading = (submission.grading as any) || {};

    const updatedGrading = { ...currentGrading, ...grading };

    const { data, error } = await supabase.from('submissions')
      .update({ grading: updatedGrading })
      .eq('sessionId', sessionId)
      .select().single();

    if (error) throw error;

    if (grading.status === 'graded') {
      await this.updateSessionStatus(sessionId, 'graded');
    }
    return data;
  }

  async updateAdvancedAssessment(sessionId: number, assessment: any): Promise<Submission> {
    const submission = await this.getSubmission(sessionId);
    if (!submission) throw new Error("Submission not found");

    const currentGrading = (submission.grading as any) || {};
    const updatedGrading = {
      ...currentGrading,
      advancedAssessment: { ...(currentGrading.advancedAssessment || {}), ...assessment }
    };

    const { data, error } = await supabase.from('submissions').update({ grading: updatedGrading }).eq('sessionId', sessionId).select().single();
    if (error) throw error;
    return data;
  }

  async updateAdvancedAnalysis(sessionId: number, analysis: any): Promise<Submission> {
    const submission = await this.getSubmission(sessionId);
    if (!submission) throw new Error("Submission not found");

    const currentGrading = (submission.grading as any) || {};
    const updatedGrading = {
      ...currentGrading,
      advanced_analysis: { ...(currentGrading.advanced_analysis || {}), ...analysis }
    };

    const { data, error } = await supabase.from('submissions').update({ grading: updatedGrading }).eq('sessionId', sessionId).select().single();
    if (error) throw error;
    return data;
  }

  async getPendingGradingSubmissions(): Promise<(Submission & { session: ExamSession })[]> {
    // Supabase-da Join qilish usuli (exam_sessions jadvali foreign key orqali bog'langan bo'lishi kerak)
    const { data, error } = await supabase
      .from('submissions')
      .select('*, session:exam_sessions!inner(*)')
      .eq('session.status', 'pending_grading');

    if (error) throw error;
    return data.map((item: any) => ({ ...item, session: item.session }));
  }

  // --- VIOLATIONS ---
  async logViolation(violation: InsertViolation): Promise<Violation> {
    const { data, error } = await supabase.from('violations').insert([violation]).select().single();
    if (error) throw error;
    return data;
  }

  async getViolations(): Promise<Violation[]> {
    const { data } = await supabase.from('violations').select('*').order('created_at', { ascending: false });
    return data || [];
  }
}

export const storage = new DatabaseStorage();