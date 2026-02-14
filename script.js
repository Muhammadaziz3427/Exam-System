  // Supabase sozlamalari
  const SUPABASE_URL = 'https://wvmmrbjzlxoxookbsdme.supabase.co';
  const SUPABASE_KEY = 'SIZNING_ANON_KEY_SHU_YERGA'; // Supabase Dashboarddan olingan key

  async function getExamSessions() {
      const endpoint = `${SUPABASE_URL}/rest/v1/exam_sessions?select=studentName,firstName,lastName,email,examId,accessCode,password`;

      try {
          const response = await fetch(endpoint, {
              method: 'GET',
              headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${SUPABASE_KEY}`,
                  'Content-Type': 'application/json'
              }
          });

          if (!response.ok) {
              throw new Error(`Xatolik yuz berdi: ${response.status}`);
          }

          const data = await response.json();
          console.log("Ma'lumotlar olindi:", data);

          // Agar ma'lumotlarni ekranga chiqarmoqchi bo'lsangiz:
          displayData(data);

      } catch (error) {
          console.error("Xato:", error.message);
      }
  }

  function displayData(sessions) {
      // Replit-dagi index.html ichida id="results" bo'lgan div bo'lishi kerak
      const container = document.getElementById('results');
      if (!container) return;

      if (sessions.length === 0) {
          container.innerHTML = "<p>Ma'lumot topilmadi.</p>";
          return;
      }

      container.innerHTML = sessions.map(s => `
          <div style="border: 1px solid #ccc; margin: 10px; padding: 10px; border-radius: 8px;">
              <p><strong>Talaba:</strong> ${s.firstName} ${s.lastName}</p>
              <p><strong>Email:</strong> ${s.email}</p>
              <p><strong>Parol:</strong> ${s.password}</p>
          </div>
      `).join('');
  }

  // Sahifa yuklanganda funksiyani ishga tushirish
  window.onload = getExamSessions;