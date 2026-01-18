import nodemailer from "nodemailer";

export async function sendExamResultsEmail(session: any) {
  const { studentName, email, listeningScore, readingScore, writingScore, speakingScore, overallBand, advanced_analysis } = session;

  if (!email) {
    console.log(`No email provided for student ${studentName}, skipping email.`);
    return;
  }

  // Create a test account if no real credentials are provided
  // In a real app, you'd use environment variables for SMTP settings
  const transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, 
    auth: {
      user: "maddison53@ethereal.email", // Mock credentials
      pass: "jn7jnK9jue9j63pVX1",
    },
  });

  let advancedContent = "";
  if (advanced_analysis) {
    const analysis = typeof advanced_analysis === 'string' ? JSON.parse(advanced_analysis) : advanced_analysis;
    
    advancedContent = `
      <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e2e8f0;">
        <h3 style="color: #1e40af; margin-bottom: 15px;">Advanced Performance Analysis</h3>
        
        <div style="background-color: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <h4 style="color: #0369a1; margin-top: 0;">Detailed Strengths & Weaknesses</h4>
          <p style="white-space: pre-wrap;">${analysis.breakdown || 'Analysis not available.'}</p>
        </div>

        ${analysis.teacherFeedback ? `
          <div style="background-color: #fdf2f8; padding: 15px; border-radius: 8px; border-left: 4px solid #db2777;">
            <h4 style="color: #9d174d; margin-top: 0;">Teacher's Diagnostic Note</h4>
            <p style="font-style: italic; color: #4b5563;">${analysis.teacherFeedback}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #2563eb;">Exam Results Released</h2>
      <p>Dear <strong>${studentName}</strong>,</p>
      <p>Your exam results have been approved and released. Here is your score breakdown:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <tr style="background-color: #f8fafc;">
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: left;">Section</th>
          <th style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">Score</th>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">Listening</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${listeningScore || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">Reading</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${readingScore || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">Writing</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${writingScore || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e2e8f0;">Speaking</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center;">${speakingScore || 'N/A'}</td>
        </tr>
        <tr style="background-color: #f1f5f9; font-weight: bold;">
          <td style="padding: 10px; border: 1px solid #e2e8f0;">Overall Band</td>
          <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: center; color: #2563eb; font-size: 1.2em;">${overallBand || 'N/A'}</td>
        </tr>
      </table>

      ${advancedContent}

      <div style="margin: 30px 0; text-align: center;">
        <a href="${process.env.APP_URL || 'http://localhost:5000'}/student/detailed-results/${session.id}" 
           style="background-color: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          View Full Breakdown Online
        </a>
      </div>

      <p>Congratulations on completing your exam!</p>
      <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #64748b; font-size: 0.85em; margin: 0;">Platform Founder: <strong>Yursinaliyev Muhammadaziz</strong></p>
        <p style="color: #94a3b8; font-size: 0.8em; margin: 5px 0 0 0;">Email: yursinaliyevm@gmail.com</p>
      </div>
      <p style="color: #94a3b8; font-size: 0.75em; text-align: center; margin-top: 20px;">This is an automated message. Please do not reply directly to this email.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: '"Exam Center" <noreply@examcenter.com>',
      to: email,
      subject: `Exam Results: ${studentName}`,
      html: html,
    });

    console.log("Email sent: %s", info.messageId);
    // Preview URL for Ethereal emails
    console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error("Error sending email:", error);
  }
}
