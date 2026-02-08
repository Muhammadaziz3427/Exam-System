import { z } from 'zod';
import { insertExamSchema, insertSessionSchema, exams, examSessions, violations, users } from './schema';

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
        403: z.object({ message: z.string() }),
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
    // Serverdagi PUT metodiga moslab qo'shildi
    update: {
      method: 'PUT' as const,
      path: '/api/exams/:id',
      input: insertExamSchema,
      responses: { 200: z.custom<typeof exams.$inferSelect>(), 404: errorSchemas.notFound },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/exams/:id',
      responses: { 204: z.null(), 404: errorSchemas.notFound },
    },
  },
  sessions: {
    create: {
      method: 'POST' as const,
      path: '/api/sessions/generate',
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
        answers: z.any(),
        isFinal: z.boolean().optional(),
        currentSection: z.string().optional(),
        remainingTime: z.number().optional(),
      }),
      responses: { 200: z.object({ message: z.string() }) },
    },
    logViolation: {
      method: 'POST' as const,
      path: '/api/sessions/:id/violation',
      input: z.object({ type: z.enum(['tab_switch', 'fullscreen_exit', 'window_blur']) }),
      responses: { 201: z.custom<typeof violations.$inferSelect>() },
    },
    terminate: {
      method: 'POST' as const,
      path: '/api/sessions/:id/terminate',
      input: z.object({}),
      responses: { 
        200: z.object({ message: z.string() }),
        404: errorSchemas.notFound 
      },
    },
    release: {
      method: 'POST' as const,
      path: '/api/sessions/:id/release',
      input: z.object({}),
      responses: { 200: z.object({ message: z.string() }) },
    }
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