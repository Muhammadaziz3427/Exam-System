import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function parseExamPdf(filePath: string, section: string): Promise<any> {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  const text = data.text;
  
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Gemini API kaliti topilmadi (GEMINI_API_KEY)');
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `You are an expert IELTS instructor and content extractor.
  Extract the questions from the following IELTS ${section} section text.
  Return ONLY a valid JSON object matching the standard format for the ${section} section of an IELTS exam.
  Do not include any extra text or markdown formatting.
  
  For reading, the format is:
  {
    "reading": {
      "timeLimit": 60,
      "passages": [
        {
          "title": "Passage Title",
          "content": "Full text...",
          "questions": [
            { "type": "tfng", "content": "Question text...", "answer": "TRUE" }
          ]
        }
      ]
    }
  }
  
  For listening:
  {
    "listening": {
      "audioUrl": "",
      "parts": [
        {
          "questions": [
            { "type": "fill", "content": "Question...", "answer": "Answer" }
          ]
        }
      ]
    }
  }
  
  For writing:
  {
    "writing": {
      "timeLimit": 60,
      "tasks": [
        { "content": "Task 1 description..." },
        { "content": "Task 2 description..." }
      ]
    }
  }
  
  Text to parse:
  ${text}
  `;

  const result = await model.generateContent(prompt);
  let responseText = result.response.text();
  
  // Clean up potential markdown formatting
  responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  
  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error('JSON Parsing Error:', error, responseText);
    throw new Error('AI qaytargan javobni JSON formatiga o\'girib bo\'lmadi');
  }
}
