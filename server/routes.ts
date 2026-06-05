import type { Express } from "express";
import { type Server } from "http";
import { api } from "@shared/routes";
import { sendExamResultsEmail } from "./email";
import { supabase } from "./db";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // ------------------------------------------------------------
  // AUTH ROUTES
  // ------------------------------------------------------------
  app.post(api.auth.adminLogin.path, async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ message: "Login va parol kiritilishi shart" });
      }

      const { data: user, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .maybeSingle();

      if (error) throw error;
      if (!user) {
        return res.status(401).json({ message: "Xato login yoki parol" });
      }

      // Check for password or Password field
      const dbPassword = user.password || (user as any).Password;
      if (dbPassword !== password) {
        return res.status(401).json({ message: "Xato login yoki parol" });
      }

      res.json({ user });
    } catch (error) {
      console.error("Admin login xatosi:", error);
      res.status(500).json({ message: "Server xatosi" });
    }
  });

  // ---------- STUDENT LOGIN ----------
  app.post(api.auth.studentLogin.path, async (req, res) => {
    try {
      const { accessCode, password } = req.body;
      console.log("[LOGIN] 1. Qabul qilingan:", { accessCode, password: password ? "***" : null });

      if (!accessCode || !password) {
        return res.status(400).json({ message: "Kod va parol kiritilishi shart" });
      }

      const normalizedCode = accessCode.trim().toUpperCase();
      console.log("[LOGIN] 2. Normalashtirilgan kod:", normalizedCode);

      const { data: session, error } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("access_code", normalizedCode)
        .maybeSingle();

      if (error) {
        console.error("[LOGIN] 3. Supabase xatosi:", error);
        return res.status(500).json({ message: "Server xatosi: " + error.message });
      }

      if (!session) {
        console.log("[LOGIN] 4. Sessiya topilmadi");
        return res.status(401).json({ message: "Kirish kodi topilmadi" });
      }

      const possiblePasswordFields = ["password", "Password", "pass"];
      let dbPassword = null;
      let usedField = null;
      for (const field of possiblePasswordFields) {
        if (session[field] !== undefined && session[field] !== null) {
          dbPassword = session[field];
          usedField = field;
          break;
        }
      }

      console.log("[LOGIN] 5. Sessiya topildi:", {
        id: session.id,
        status: session.status,
        is_used: session.is_used,
        passwordFields: {
          password: !!session.password,
          Password: !!session.Password,
          pass: !!session.pass,
        },
        usedField: usedField,
        dbPassword: dbPassword ? "***" : null,
      });

      if (!dbPassword) {
        console.log("[LOGIN] 5a. Sessiyada parol saqlanmagan!");
        return res.status(500).json({ message: "Tizim xatosi: Sessiyada parol topilmadi." });
      }

      if (dbPassword.trim() !== password.trim()) {
        console.log("[LOGIN] 6. Parol mos kelmadi");
        return res.status(401).json({ message: "Parol noto'g'ri" });
      }

      console.log("[LOGIN] 7. Parol mos keldi");

      if (session.is_used === true && session.status !== "active") {
        console.log("[LOGIN] 8. Kod avval ishlatilgan");
        return res.status(403).json({ message: "Bu kod allaqachon ishlatilgan" });
      }

      if (session.status === "completed") {
        console.log("[LOGIN] 9. Imtihon yakunlangan");
        return res.status(403).json({ message: "Imtihon yakunlangan" });
      }

      const updatePayload: any = {
        status: "active",
        is_used: true,
      };

      if (!session.startedAt && !session.start_time) {
        updatePayload.startedAt = new Date().toISOString();
        updatePayload.start_time = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("exam_sessions")
        .update(updatePayload)
        .eq("id", session.id);

      if (updateError) {
        console.error("[LOGIN] 10. Yangilash xatosi:", updateError);
        return res.status(500).json({ message: "Sessiyani yangilashda xatolik" });
      }

      console.log("[LOGIN] 11. Muvaffaqiyatli!");

      // Use a robust way to exclude sensitive fields
      const { password: _, Password: __, pass: ___, ...sessionWithoutPassword } = session;
      return res.json({ session: sessionWithoutPassword });

    } catch (error) {
      console.error("[LOGIN] 12. Kutilmagan xatolik:", error);
      res.status(500).json({ message: "Serverda ichki xatolik" });
    }
  });

  // ------------------------------------------------------------
  // TEACHER & EXAM MANAGEMENT
  // ------------------------------------------------------------
  app.get("/api/admin/teachers", async (_req, res) => {
    try {
      const { data: teachers } = await supabase
        .from("users")
        .select("*")
        .eq("role", "teacher");
      res.json(teachers || []);
    } catch (error) {
      res.status(500).json({ message: "O'qituvchilarni olishda xatolik" });
    }
  });

  app.post("/api/admin/teachers/generate", async (_req, res) => {
    try {
      const randomName = `Teacher${Math.floor(Math.random() * 1000)}`;
      const randomPassword = Math.random().toString(36).slice(-8);
      const { data: teacher, error } = await supabase
        .from("users")
        .insert([{ username: randomName, password: randomPassword, role: "teacher" }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(teacher);
    } catch (error) {
      res.status(500).json({ message: "O'qituvchi yaratishda xatolik" });
    }
  });

  app.delete("/api/admin/teachers/:id", async (req, res) => {
    try {
      await supabase.from("users").delete().eq("id", Number(req.params.id));
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "O'qituvchini o'chirishda xatolik" });
    }
  });

  app.get(api.exams.list.path, async (_req, res) => {
    try {
      const { data: exams } = await supabase
        .from("exams")
        .select("*")
        .order("created_at", { ascending: false });
      res.json(exams || []);
    } catch (error) {
      res.status(500).json({ message: "Examlarni olishda xatolik" });
    }
  });

  app.get(api.exams.get.path, async (req, res) => {
    try {
      const { data: exam, error } = await supabase
        .from("exams")
        .select("*")
        .eq("id", Number(req.params.id))
        .maybeSingle();

      if (error) throw error;
      if (!exam) {
        return res.status(404).json({ message: "Exam topilmadi" });
      }
      res.json(exam);
    } catch (error) {
      res.status(500).json({ message: "Examni olishda xatolik" });
    }
  });

  // ------------------------------------------------------------
  // SESSION MANAGEMENT (ADMIN)
  // ------------------------------------------------------------
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const { examId, assignedTeacherId, studentName, firstName, lastName, email, accessCode, password } = req.body;

      console.log("[SESSION CREATE] Ma'lumotlar:", {
        examId,
        studentName,
        accessCode,
        hasPassword: !!password,
      });

      if (!password) {
        console.error("[SESSION CREATE] Password missing!");
        return res.status(400).json({ message: "Parol majburiy" });
      }

      const insertData: any = {
        examId: Number(examId),
        studentName,
        firstName: firstName || null,
        lastName: lastName || null,
        email: email || null,
        accessCode,
        password,
        status: "created",
        is_used: false,

        // snake_case variantlar (jadvalda mavjud)
        exam_id: Number(examId),
        student_name: studentName,
        first_name: firstName || null,
        last_name: lastName || null,
        access_code: accessCode,
      };

      if (assignedTeacherId) {
        insertData.assigned_teacher_id = Number(assignedTeacherId);
        insertData.assignedTeacherId = Number(assignedTeacherId);
      }

      const { data: session, error } = await supabase
        .from("exam_sessions")
        .insert([insertData])
        .select()
        .single();

      if (error) {
        console.error("[SESSION CREATE] Supabase error:", error);
        if (error.message.includes("column") || error.code === "42703") {
          const snakeData = { ...insertData };
          delete snakeData.examId;
          delete snakeData.studentName;
          delete snakeData.firstName;
          delete snakeData.lastName;
          delete snakeData.accessCode;
          delete snakeData.assignedTeacherId;
          delete snakeData.Password;

          const { data: retrySession, error: retryError } = await supabase
            .from("exam_sessions")
            .insert([snakeData])
            .select()
            .single();

          if (retryError) throw retryError;
          return res.status(201).json(retrySession);
        }
        throw error;
      }

      console.log("[SESSION CREATE] Muvaffaqiyatli:", session.id);
      res.status(201).json(session);
    } catch (error) {
      console.error("Sessiya yaratish xatosi:", error);
      res.status(400).json({ message: "Sessiya yaratib bo'lmadi: " + (error as any).message });
    }
  });

  app.get(api.sessions.list.path, async (req, res) => {
    try {
      let query = supabase.from("exam_sessions").select("*, exams(title)");
      const userStr = req.headers["x-user-context"] as string;
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.role === "teacher") {
            query = query.eq("assigned_teacher_id", user.id);
          }
        } catch (e) {}
      }
      const { data: sessions } = await query.order("created_at", { ascending: false });
      res.json(sessions || []);
    } catch (error) {
      res.status(500).json({ message: "Sessiyalarni olishda xatolik" });
    }
  });

  app.post(api.sessions.start.path, async (req, res) => {
    try {
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .update({ status: "active", startedAt: new Date().toISOString() })
        .eq("id", Number(req.params.id))
        .select()
        .single();

      if (error) throw error;
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Sessiyani boshlashda xatolik" });
    }
  });

  app.patch("/api/sessions/:id/progress", async (req, res) => {
    try {
      const { answers } = req.body;
      await supabase
        .from("submissions")
        .upsert({ session_id: Number(req.params.id), answers }, { onConflict: "session_id" });
      res.json({ message: "Saqlandi" });
    } catch (error) {
      res.status(500).json({ message: "Progressni saqlashda xatolik" });
    }
  });

  app.post("/api/sessions/:id/grade", async (req, res) => {
    try {
      const id = Number(req.params.id);
      await supabase
        .from("submissions")
        .update({ grading: req.body.grading })
        .eq("session_id", id);
      await supabase
        .from("exam_sessions")
        .update({ ...req.body.scores })
        .eq("id", id);
      res.json({ message: "Baho saqlandi" });
    } catch (error) {
      res.status(500).json({ message: "Baho saqlashda xatolik" });
    }
  });

  app.post("/api/sessions/:id/release", async (req, res) => {
    try {
      const { data: session, error } = await supabase
        .from("exam_sessions")
        .update({ result_status: "released" })
        .eq("id", Number(req.params.id))
        .select("*, exams(*)")
        .single();

      if (error) throw error;
      if (session) await sendExamResultsEmail(session);
      res.json({ message: "Yuborildi", session });
    } catch (error) {
      res.status(500).json({ message: "Natijalarni yuborishda xatolik" });
    }
  });

  // ------------------------------------------------------------
  // SUBMISSION & AUTO-GRADING
  // ------------------------------------------------------------
  app.post("/api/sessions/:id/submit", async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const { answers, scores, isFinal } = req.body;

      if (!answers) {
        return res.status(400).json({ message: "Javoblar topilmadi" });
      }

      // 1. Avval exam va contentni olish
      const { data: sessionData } = await supabase
        .from("exam_sessions")
        .select("exam_id, examId")
        .eq("id", sessionId)
        .maybeSingle();

      const resolvedExamId = sessionData?.exam_id || (sessionData as any)?.examId;

      if (!resolvedExamId) {
        return res.status(404).json({ message: "Sessiya yoki exam topilmadi" });
      }

      const { data: examData } = await supabase
        .from("exams")
        .select("content")
        .eq("id", resolvedExamId)
        .maybeSingle();

      if (!examData) {
        return res.status(404).json({ message: "Exam ma'lumotlari topilmadi" });
      }

      const content = examData.content;
      const listeningParts = content?.listening?.parts || [];
      const readingPassages = content?.reading?.passages || [];

      // 2. Listening savollarini baholash (global raqamlar bilan)
      let listeningTotal = 0;
      let listeningScore = 0;
      listeningParts.forEach((part: any) => {
        part.questions?.forEach((q: any, idx: number) => {
          listeningTotal++;
          let globalNum = idx + 1;
          for (let i = 0; i < listeningParts.indexOf(part); i++) {
            globalNum += listeningParts[i].questions?.length || 0;
          }
          const studentAns = answers.listening?.[globalNum];
          if (studentAns === undefined || studentAns === null) return;

          const correctAns = q.answer;
          if (!correctAns) return;

          if (q.type === "mcq_multi" && Array.isArray(correctAns)) {
            const studentArr = Array.isArray(studentAns) ? studentAns : [studentAns];
            const correctArr = correctAns;
            if (studentArr.length === correctArr.length && studentArr.every((v: any) => correctArr.includes(v))) {
              listeningScore++;
            }
          } else {
            if (studentAns.toString().trim().toLowerCase() === correctAns.toString().trim().toLowerCase()) {
              listeningScore++;
            }
          }
        });
      });

      // 3. Reading savollarini baholash (global raqamlar bilan)
      let readingTotal = 0;
      let readingScore = 0;
      readingPassages.forEach((passage: any, passageIdx: number) => {
        let passageStart = 1;
        for (let i = 0; i < passageIdx; i++) {
          passageStart += readingPassages[i].questions?.length || 0;
        }
        passage.questions?.forEach((q: any, idx: number) => {
          readingTotal++;
          const globalNum = passageStart + idx;
          const studentAns = answers.reading?.[globalNum];
          if (studentAns === undefined || studentAns === null) return;

          const correctAns = q.answer;
          if (!correctAns) return;

          if (studentAns.toString().trim().toLowerCase() === correctAns.toString().trim().toLowerCase()) {
            readingScore++;
          }
        });
      });

      const autoGrading = {
        listening: { score: listeningScore, total: listeningTotal },
        reading: { score: readingScore, total: readingTotal }
      };

      // 4. Javoblarni submissions jadvaliga saqlash
      await supabase
        .from("submissions")
        .upsert({ session_id: sessionId, answers }, { onConflict: "session_id" });

      // 5. Agar imtihon yakunlangan bo'lsa, auto-grading natijalarini saqlash
      if (isFinal) {
        const { data: sub } = await supabase
          .from("submissions")
          .select("grading")
          .eq("session_id", sessionId)
          .maybeSingle();

        const updatedGrading = { ...(sub?.grading || {}), autoGraded: autoGrading };

        await supabase
          .from("submissions")
          .update({ grading: updatedGrading })
          .eq("session_id", sessionId);

        const hasWriting = content?.writing?.tasks?.length > 0 || content?.writing?.questions?.length > 0;

        await supabase
          .from("exam_sessions")
          .update({
            status: hasWriting ? "pending_grading" : "completed",
            result_status: "marking",
            listening_score: listeningScore.toString(),
            reading_score: readingScore.toString()
          })
          .eq("id", sessionId);
      }

      res.json({ message: "Imtihon yakunlandi", autoGrading });
    } catch (error) {
      console.error("Submit xatosi:", error);
      res.status(500).json({ message: "Serverda xatolik yuz berdi" });
    }
  });

  app.post(api.sessions.logViolation.path, async (req, res) => {
    try {
      const { data: v, error } = await supabase
        .from("violations")
        .insert([{ session_id: Number(req.params.id), type: req.body.type }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(v);
    } catch (error) {
      res.status(500).json({ message: "Violation log qilishda xatolik" });
    }
  });

  app.get("/api/sessions/:id/violations", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from("violations")
        .select("*")
        .eq("session_id", Number(req.params.id))
        .order("created_at", { ascending: true });

      if (error) throw error;
      res.json(data || []);
    } catch (error) {
      console.error("Violations olishda xatolik:", error);
      res.json([]);
    }
  });

  return httpServer;
}
