
import { z } from 'zod';
import { insertExamSchema, insertSessionSchema, insertUserSchema, insertSubmissionSchema, insertViolationSchema, exams, examSessions, submissions, violations, users } from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  notFound: z.object({ message: z.string() }),
  serverError: z.object({ message: z.string() }),
};

export const api = {
  auth: {
    adminLogin: {
      method: 'POST' as const,
      path: '/api/auth/admin/login',
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.object({ user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      },
    },
    studentLogin: {
      method: 'POST' as const,
      path: '/api/auth/student/login',
      input: z.object({ accessCode: z.string(), password: z.string() }),
      responses: {
        200: z.object({ session: z.custom<typeof examSessions.$inferSelect>() }),
        401: errorSchemas.unauthorized,
        403: z.object({ message: z.string() }), // For "already used" or "expired"
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: { 200: z.object({ message: z.string() }) },
    },
  },
  exams: {
    list: {
      method: 'GET' as const,
      path: '/api/exams',
      responses: { 200: z.array(z.custom<typeof exams.$inferSelect>()) },
    },
    create: {
      method: 'POST' as const,
      path: '/api/exams',
      input: insertExamSchema,
      responses: { 201: z.custom<typeof exams.$inferSelect>() },
    },
    get: {
      method: 'GET' as const,
      path: '/api/exams/:id',
      responses: { 200: z.custom<typeof exams.$inferSelect>(), 404: errorSchemas.notFound },
    },
  },
  sessions: {
    create: {
      method: 'POST' as const,
      path: '/api/sessions/generate', // Admin generates a session code
      input: insertSessionSchema,
      responses: { 201: z.custom<typeof examSessions.$inferSelect>() },
    },
    list: {
      method: 'GET' as const,
      path: '/api/sessions',
      responses: { 200: z.array(z.custom<typeof examSessions.$inferSelect>()) },
    },
    start: {
      method: 'POST' as const,
      path: '/api/sessions/:id/start',
      responses: { 200: z.custom<typeof examSessions.$inferSelect>() },
    },
    submit: {
      method: 'POST' as const,
      path: '/api/sessions/:id/submit',
      input: z.object({
        answers: z.any(), // JSON blob
        isFinal: z.boolean().optional(),
      }),
      responses: { 200: z.object({ message: z.string() }) },
    },
    logViolation: {
      method: 'POST' as const,
      path: '/api/sessions/:id/violation',
      input: z.object({ type: z.enum(['tab_switch', 'fullscreen_exit', 'window_blur']) }),
      responses: { 201: z.custom<typeof violations.$inferSelect>() },
    },
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
