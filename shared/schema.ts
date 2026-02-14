import { pgTable, text, serial, integer, boolean, timestamp, jsonb, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Admins and Teachers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name"), // Foydalanuvchi ismi uchun qo'shildi
  email: text("email"),
  role: text("role").notNull().default("teacher"), // Supabase uchun enum string sifatida
  createdAt: timestamp("created_at").defaultNow(),
});

// The Exam Content
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: jsonb("content").notNull(), 
  timeLimit: integer("time_limit").notNull(), 
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student Sessions
export const examSessions = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  accessCode: text("access_code").notNull().unique(),
  password: text("password").notNull(),
  examId: integer("exam_id").notNull(), 
  status: text("status").notNull().default("active"),
  resultStatus: text("result_status").notNull().default("active"),
  writingScore: numeric("writing_score"),
  speakingScore: numeric("speaking_score"),
  readingScore: numeric("reading_score"),
  listeningScore: numeric("listening_score"),
  overallBand: numeric("overall_band"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  currentSection: text("current_section").default("listening"),
  remainingTime: integer("remaining_time"), 
  resultsReleased: boolean("results_released").default(false),
  assignedTeacherId: integer("assigned_teacher_id"),
  isCameraActive: boolean("is_camera_active").default(false),
  lastCameraPulse: timestamp("last_camera_pulse"),
});

// Student Answers
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().unique(), // Har bir sessiya uchun bitta javob
  answers: jsonb("answers").default({}),
  grading: jsonb("grading").default({
    writing: { task1: { feedback: "", score: 0 }, task2: { feedback: "", score: 0 }, overall: 0, feedback: "" },
    speaking: { score: 0, feedback: "" },
    autoGraded: { listening: { score: 0, total: 0 }, reading: { score: 0, total: 0 } },
    advancedAssessment: {
      writing: { task1: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 }, task2: { taskResponse: 0, coherenceCohesion: 0, lexicalResource: 0, grammaticalRange: 0 } },
      speaking: { fluency: 0, lexicalResource: 0, grammaticalRange: 0, pronunciation: 0 },
      diagnosticFeedback: ""
    },
    advanced_analysis: { writing: { task1: {}, task2: {} }, speaking: {} }
  }),
  lastSavedAt: timestamp("last_saved_at").defaultNow(),
});

// Violation Logs
export const violations = pgTable("violations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  type: text("type").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(examSessions).omit({ 
  id: true, 
  status: true, 
  startTime: true, 
  endTime: true, 
  currentSection: true,
  resultsReleased: true,
  resultStatus: true
});
export const insertSubmissionSchema = createInsertSchema(submissions).omit({ id: true, lastSavedAt: true });
export const insertViolationSchema = createInsertSchema(violations).omit({ id: true, timestamp: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type Exam = typeof exams.$inferSelect;
export type ExamSession = typeof examSessions.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type Violation = typeof violations.$inferSelect;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertExam = z.infer<typeof insertExamSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type InsertSubmission = z.infer<typeof insertSubmissionSchema>;
export type InsertViolation = z.infer<typeof insertViolationSchema>;

// Auth Types
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const studentLoginSchema = z.object({
  accessCode: z.string().min(1, "Access code is required"),
  password: z.string().min(1, "Password is required"),
});
export type StudentLoginRequest = z.infer<typeof studentLoginSchema>;