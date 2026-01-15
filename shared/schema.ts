
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

// Admins and Teachers
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role", { enum: ["admin", "teacher"] }).notNull().default("teacher"),
  createdAt: timestamp("created_at").defaultNow(),
});

// The Exam Content
export const exams = pgTable("exams", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  // JSON structure for sections: { listening: { audioUrl, questions: [] }, reading: { passage, questions: [] }, writing: { prompts: [] } }
  content: jsonb("content").notNull(), 
  timeLimit: integer("time_limit").notNull(), // in minutes
  isPublished: boolean("is_published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Student Sessions (One-time credentials)
export const examSessions = pgTable("exam_sessions", {
  id: serial("id").primaryKey(),
  studentName: text("student_name").notNull(),
  accessCode: text("access_code").notNull().unique(), // The "Test ID"
  password: text("password").notNull(), // One-time password
  examId: integer("exam_id").notNull(), // Linked exam
  status: text("status", { enum: ["created", "in_progress", "completed", "pending_grading", "graded"] }).default("created"),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  currentSection: text("current_section").default("listening"),
  resultsReleased: boolean("results_released").default(false),
});

// Student Answers
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  // JSON structure: { listening: { q1: "a", ... }, reading: { ... }, writing: "text..." }
  answers: jsonb("answers").default({}),
  // Grading details
  grading: jsonb("grading").default({
    writing: {
      taskResponse: 0,
      cohesion: 0,
      vocabulary: 0,
      grammar: 0,
      average: 0,
      feedback: ""
    }
  }),
  lastSavedAt: timestamp("last_saved_at").defaultNow(),
});

// Violation Logs (Lockdown)
export const violations = pgTable("violations", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull(),
  type: text("type").notNull(), // 'tab_switch', 'fullscreen_exit'
  timestamp: timestamp("timestamp").defaultNow(),
});

// === SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertExamSchema = createInsertSchema(exams).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(examSessions).omit({ id: true, status: true, startTime: true, endTime: true, currentSection: true });
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

// Auth Login Types
export const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});
export type LoginRequest = z.infer<typeof loginSchema>;

export const studentLoginSchema = z.object({
  accessCode: z.string(),
  password: z.string(),
});
export type StudentLoginRequest = z.infer<typeof studentLoginSchema>;
