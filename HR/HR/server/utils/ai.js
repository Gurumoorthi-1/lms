import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'dummy_key',
});

export const generateQuestion = async (jobRole, previousQuestions, context, phase = 0) => {
  const getFallbackQuestion = (p) => {
    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';
    switch(p) {
      case 0: return `Good ${timeOfDay}, welcome. Can you introduce yourself?`;
      case 1: return `Tell me about your strengths and why you are a good fit for this role.`;
      case 2: return `Tell me about a time you handled pressure or a difficult challenge.`;
      case 3: return `What would you do if your team misses an important deadline?`;
      case 4: return `What was the most challenging project you've worked on recently, and how did you overcome the technical or logical obstacles?`;
      case 5: return `Why should we hire you?`;
      case 6: return `Do you have any questions for us?`;
      default: return `Could you elaborate on your experience?`;
    }
  };

  try {
    if (!process.env.OPENAI_API_KEY) {
      return getFallbackQuestion(phase);
    }

    const hour = new Date().getHours();
    let timeOfDay = 'morning';
    if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
    else if (hour >= 17) timeOfDay = 'evening';

    let phaseInstruction = "";
    switch (phase) {
      case 0:
        phaseInstruction = `PHASE 1: Introduction Round. You MUST start by saying "Good ${timeOfDay}, welcome." Then ask the candidate to introduce themselves. Do NOT ask any other questions yet.`;
        break;
      case 1:
        phaseInstruction = `PHASE 2: Basic HR Questions. Ask ONE foundational HR question such as strengths, weaknesses, or why they want the role.`;
        break;
      case 2:
        phaseInstruction = `PHASE 3: Behavioral Round. Ask ONE behavioral question expecting a STAR method answer (e.g., handling pressure, teamwork, overcoming challenges).`;
        break;
      case 3:
        phaseInstruction = `PHASE 4: Situational Round. Ask ONE hypothetical situational question relevant to the role (e.g., missing a deadline, conflict).`;
        break;
      case 4:
        phaseInstruction = `PHASE 5: Experience Round. Ask about their most challenging project. Focus on how they handled technical obstacles or difficult decisions.`;
        break;
      case 5:
        phaseInstruction = `PHASE 6: Motivation Round. Ask the candidate: "Why should we hire you?"`;
        break;
      case 6:
        phaseInstruction = `PHASE 7: Closing Round. Conclude the interview and ask exactly: "Do you have any questions for us?"`;
        break;
      default:
        phaseInstruction = "Ask a relevant follow-up question.";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Act as a professional HR interviewer from an MNC. Ask behavioral and technical questions based on the candidate's resume. IMPORTANT: NEVER repeat a question that has already been asked." },
        { role: "user", content: `The candidate's resume/context: ${context.substring(0, 1500)}. \n\nPrevious questions already asked: ${previousQuestions.length > 0 ? previousQuestions.join(', ') : 'None'}. \n\nINSTRUCTION FOR THIS QUESTION: ${phaseInstruction} Make sure it is DIFFERENT from any previous questions. Keep it concise.` }
      ],
      max_tokens: 150
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error.message);
    return getFallbackQuestion(phase);
  }
};

export const evaluateAnswer = async (jobRole, question, answer) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        feedback: "Good answer, but try to be more specific with examples.",
        score: Math.floor(Math.random() * 5) + 5
      };
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "Act as a professional HR interviewer. Evaluate the candidate's answer. Provide concise feedback and a score out of 10. Format as JSON: { \"feedback\": \"string\", \"score\": number }" },
        { role: "user", content: `Role: ${jobRole}\nQuestion: ${question}\nAnswer: ${answer}` }
      ],
      response_format: { type: "json_object" }
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error("AI Error:", error.message);
    return { feedback: "Good effort. Let's move to the next topic.", score: 7 };
  }
};

export const extractJobRole = async (resumeText) => {
  try {
    if (!process.env.OPENAI_API_KEY || !resumeText) {
      return "General Candidate";
    }

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are a recruitment assistant. Extract the primary job title or role the candidate is seeking or has the most experience in from their resume text. Return ONLY the job title (e.g., 'Full Stack Developer', 'Data Scientist', 'Marketing Manager'). If you cannot find one, return 'Candidate'." },
        { role: "user", content: `Resume Text: ${resumeText.substring(0, 2000)}` }
      ],
      max_tokens: 30
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("AI Role Extraction Error:", error.message);
    return "Candidate";
  }
};
