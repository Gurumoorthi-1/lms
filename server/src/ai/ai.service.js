import { Types } from 'mongoose';
import OpenAI from 'openai';
import axios from 'axios';
import { YoutubeTranscript } from 'youtube-transcript';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');


export class AiService {
  constructor() {
    this.openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // YouTube Content Extraction: Apify → YoutubeTranscript → HTML Scrape
  async getYoutubeContent(videoId) {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    let title = 'Unknown Topic';
    let transcript = '';

    // Step 1: Try Apify YouTube Scraper for captions
    const apifyToken = process.env.APIFY_API_TOKEN;
    if (apifyToken) {
      try {
        console.log('[YouTube] Trying Apify scraper...');
        const runRes = await axios.post(
          `https://api.apify.com/v2/acts/bernardo~youtube-transcript-scraper/runs?token=${apifyToken}`,
          {
            urls: [videoUrl],
            outputFormat: 'plainText'
          },
          { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
        );

        const runId = runRes.data?.data?.id;
        if (runId) {
          // Wait for the run to complete (poll every 3s, max 60s)
          let attempts = 0;
          let status = 'RUNNING';
          while (status === 'RUNNING' && attempts < 20) {
            await new Promise(r => setTimeout(r, 3000));
            const statusRes = await axios.get(
              `https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`,
              { timeout: 10000 }
            );
            status = statusRes.data?.data?.status;
            attempts++;
          }

          if (status === 'SUCCEEDED') {
            const datasetId = runRes.data?.data?.defaultDatasetId;
            if (datasetId) {
              const itemsRes = await axios.get(
                `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`,
                { timeout: 10000 }
              );
              const items = itemsRes.data;
              if (items && items.length > 0) {
                const item = items[0];
                title = item.title || title;
                transcript = item.transcript || item.text || item.captions || '';
                if (typeof transcript === 'object') {
                  transcript = JSON.stringify(transcript);
                }
              }
            }
          }
        }

        if (transcript) {
          console.log(`[YouTube] Apify success! Got ${transcript.length} chars of transcript`);
        }
      } catch (apifyErr) {
        console.warn('[YouTube] Apify failed:', apifyErr.message);
      }
    }

    // Step 2: Fallback to YoutubeTranscript package
    if (!transcript) {
      try {
        console.log('[YouTube] Trying YoutubeTranscript package...');
        const transcriptLines = await YoutubeTranscript.fetchTranscript(videoId);
        transcript = transcriptLines.map((t) => t.text).join(' ');
        console.log(`[YouTube] YoutubeTranscript success! Got ${transcript.length} chars`);
      } catch (e) {
        console.warn('[YouTube] YoutubeTranscript failed:', e.message);
      }
    }

    // Step 3: Fallback to HTML scraping for title/description
    try {
      const response = await axios.get(videoUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        timeout: 10000
      });
      const html = response.data;
      const titleMatch = html.match(/<title>(.*?) - YouTube<\/title>/);
      if (titleMatch && title === 'Unknown Topic') title = titleMatch[1];

      if (!transcript) {
        const descMatch = html.match(/<meta name="description" content="(.*?)">/);
        const description = descMatch ? descMatch[1] : '';
        transcript = `Video Title: ${title}. Description: ${description}. (Note: No captions available. Generate questions based on the topic "${title}")`;
      }
    } catch (e) {
      console.warn('[YouTube] HTML scrape failed:', e.message);
    }

    let finalContent = transcript || `Topic: ${title}. Generate questions about this subject.`;
    if (finalContent.length > 20000) {
      finalContent = finalContent.substring(0, 20000);
    }

    return { transcript: finalContent, title };
  }

  async generateQuestions(formData, file) {
    const { sourceMode, difficulty, questionCount, topic, prompt, isAptitude, aptitudeScenario } = formData;
    console.log('[AiService] generateQuestions input:', { sourceMode, difficulty, questionCount, isAptitude, aptitudeScenario });
    let contextData = '';
    let detectedTopic = topic || 'AI Exam';

    try {
      // 1. Gather Base Context
      if (sourceMode === 'topic') {
        detectedTopic = prompt ? (prompt.length > 30 ? prompt.substring(0, 30) + '...' : prompt) : 'AI Exam';
        contextData = `Topic/Subject: ${prompt}.
        - Beginner: Focus on basic syntax, definitions, and core concepts.
        - Intermediate: Focus on real-world application, common design patterns, and debugging.
        - Advanced: Focus on performance optimizations, edge cases, deep internal architecture, and complex scenarios.`;
      } else if (sourceMode === 'youtube') {
        const url = formData.youtubeUrl || '';
        const videoIdMatch = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11}).*/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;
        if (!videoId) throw new Error('Invalid YouTube URL');
        const ytData = await this.getYoutubeContent(videoId);
        detectedTopic = ytData.title;
        contextData = `Transcript/Content: ${ytData.transcript || `Topic is ${ytData.title}.`}`;
      } else if (sourceMode === 'upload' && file) {
        if (file.mimetype === 'application/pdf') {
          const pdfData = await pdfParse(file.buffer);
          contextData = pdfData.text;
        } else if (file.mimetype.startsWith('image/')) {
          const base64Image = file.buffer.toString('base64');
          const visionResponse = await this.openai.chat.completions.create({
            model: 'openai/gpt-4o',
            messages: [{ 
              role: 'user', 
              content: [
                { type: 'text', text: 'Extract quiz content from this image.' }, 
                { type: 'image_url', image_url: { url: `data:${file.mimetype};base64,${base64Image}` } }
              ] 
            }]
          });
          contextData = (visionResponse.choices?.[0]?.message?.content) || '';
        } else {
          contextData = file.buffer.toString('utf-8');
        }
        if (contextData && contextData.length > 20000) contextData = contextData.substring(0, 20000);
        detectedTopic = formData.topic || 'Document Assessment';
      }

      // 2. Augment with Aptitude Instructions if needed
      if (isAptitude === 'true' || isAptitude === true) {
        let scenarios = [];
        try {
          scenarios = typeof aptitudeScenario === 'string' ? JSON.parse(aptitudeScenario) : aptitudeScenario;
        } catch(e) {
          scenarios = [aptitudeScenario || 'Aptitude & Logic'];
        }
        let scenarioText = Array.isArray(scenarios) ? scenarios.filter(s => s !== 'Select All').join(', ') : scenarios;
        if (!scenarioText) scenarioText = 'General Aptitude, Quantitative, Logical Reasoning';

        detectedTopic = `Aptitude: ${detectedTopic}`;
        
        contextData = `STRICT ASSESSMENT MODE: APTITUDE TEST
        SCENARIOS TO COVER: ${scenarioText}
        THEMATIC CONTEXT/SOURCE: ${contextData || prompt || 'General/Corporate'}
        
        SCENARIO DEFINITIONS:
        - Quantitative: Math problems, percentages, ratios, probability, time/work.
        - Logical: Patterns, sequences, syllogisms, blood relations, puzzles.
        - Verbal: Grammar, synonyms, reading comprehension, sentence completion.
        - Computer Science: OS, Networking, DS, Algo, Complexity analysis.
        - Psychometric/Behavioral: Situation-based personality & integrity questions.
        - Communication: Writing skills, professional etiquette, tone analysis.
        
        CRITICAL RULES:
        1. Every single question MUST be a mathematical, logical, or aptitude challenge.
        2. Use the THEMATIC CONTEXT/SOURCE strictly as the narrative setting for the word problems.
        3. DO NOT ask theoretical questions about the topic. Only use it as flavor text for APTITUDE puzzles.
        4. Ensure all questions STRICTLY fall under: ${scenarioText}.`;
        
        console.log('[AiService] Aptitude Mode active for scenarios:', scenarioText);
      }

      const fullPrompt = `Task: Generate EXACTLY ${questionCount} high-quality Multiple Choice Questions (MCQs).
      Difficulty Level: ${difficulty} (STRICT ADHERENCE REQUIRED).
      
      Topic/Context: ${contextData}
      
      Technical Requirements:
      1. CRITICAL: For technical or programming questions, you MUST NOT embed code within the sentence. NEVER do this: "What is the output of class A { ... }?". 
      2. INSTEAD: State the question, then provide a separate, valid Markdown code block using triple backticks and the language ID. 
      3. Language IDs are MANDATORY (java, python, javascript, cpp, etc.).
      4. Options (a, b, c, d) must be technically sound. One must be objectively correct.
      5. VERY IMPORTANT: You MUST generate EXACTLY ${questionCount} questions in the "questions" array. DO NOT generate just one question!
      
      Response Format (STRICT JSON ONLY - No conversational text):
      {
        "topic": "Summarized Topic Name",
        "questions": [
          {
            "id": 1,
            "text": "Question 1 text here",
            "code": "Only the code snippet here. CRITICAL: Use multiple lines, proper indentation, and escaped newlines (\\n). NEVER generate code on a single line.",
            "language": "javascript/java/python/etc",
            "options": [
              {"id": "a", "text": "Option A"},
              {"id": "b", "text": "Option B"},
              {"id": "c", "text": "Option C"},
              {"id": "d", "text": "Option D"}
            ],
            "correct": "a",
            "difficulty": "${difficulty}",
            "topic": "Sub-topic"
          },
          {
            "id": 2,
            "text": "Question 2 text here",
            "code": "",
            "language": "",
            "options": [
              {"id": "a", "text": "Option A"},
              {"id": "b", "text": "Option B"},
              {"id": "c", "text": "Option C"},
              {"id": "d", "text": "Option D"}
            ],
            "correct": "b",
            "difficulty": "${difficulty}",
            "topic": "Sub-topic"
          }
        ]
      }
      (Continue the array pattern until you reach EXACTLY ${questionCount} objects. Do NOT stop early!)`;

      console.log('[AiService] Sending fullPrompt to OpenAI:', fullPrompt);
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini', 
        messages: [{ role: 'user', content: fullPrompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });

      const rawText = response.choices?.[0]?.message?.content || '{}';
      const parsedData = JSON.parse(rawText);

      const finalTopic = parsedData.topic || detectedTopic;
      const questions = (parsedData.questions || []).map((q) => {
        const code = q.code || '';
        let image = q.image || q.imageUrl || null;

        // Code-to-Image Conversion Logic
        if (code.trim() && !image) {
          // Using Carbonara (popular code-to-image API)
          image = `https://carbonara.vercel.app/api/cook?code=${encodeURIComponent(code)}&backgroundColor=%231a1a1a&theme=dracula&fontSize=16px&exportSize=2x&paddingHorizontal=30px&paddingVertical=30px`;
        }

        return { 
          ...q, 
          image, 
          topic: finalTopic 
        };
      });

      return { questions, topic: finalTopic };
    } catch (error) {
      console.error('Final Error Details:', error);
      throw new Error(error?.message || 'Unknown AI Error');
    }
  }

  async getTutorResponse(question, type, userInput) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: `Task: ${type}. Question: ${question}. User Input: ${userInput || ''}. Response as a helpful tutor.` }],
        max_tokens: 1000
      });
      return { response: response.choices?.[0]?.message?.content };
    } catch (e) { return { response: 'Tutor unavailable.' }; }
  }

  async generateStudyPlan(stats) {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: `Create a structured study plan based on these assessment stats: ${JSON.stringify(stats)}. Return JSON with a "plan" array containing day-by-day tasks.` }],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}').plan || [];
    } catch (e) { return []; }
  }

  async analyzeCode(language, code) {
    try {
      const fullPrompt = `You are an expert ${language} code reviewer.
Analyze the following code step-by-step:
1. Potential logic bugs or edge cases.
2. Code style, naming, and best practices.
3. Performance/complexity.
4. Provide a summarized verdict on how to improve the code.

Return your response entirely formatted in Markdown.

Code:
\`\`\`${language}
${code}
\`\`\`
`;
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: fullPrompt }],
        max_tokens: 1500
      });
      return response.choices?.[0]?.message?.content || 'No review available.';
    } catch (error) {
      console.error('AI Review Error:', error);
      return `### ⚠️ AI Analysis Temporarily Unavailable
      
**The AI review service is currently experiencing high load or rate limits.**

However, here are some standard \`${language}\` best practices to manually verify:
1. **Edge Cases:** Check for null/undefined inputs and out-of-bounds errors.
2. **Performance:** Ensure you don't have unnecessary nested loops (aim for $O(N)$ or $O(N \\log N)$).
3. **Style:** Verify variable naming is descriptive and logic is modular.

*Please try clicking "AI Review" again in a few minutes!*`;
    }
  }

  async analyzeResume(text) {
    const analysisPrompt = `Analyze this resume and provide a comprehensive assessment. Return ONLY valid JSON with no extra text.

Resume Content:
${text.substring(0, 8000)}

Return this exact JSON structure:
{
  "atsScore": <number 0-100>,
  "skills": ["skill1", "skill2", ...],
  "primaryProgrammingLanguage": "javascript | python | java | cpp | typescript",
  "experience": ["exp1", "exp2", ...],
  "education": ["edu1", ...],
  "suggestions": ["suggestion1", "suggestion2", ...],
  "missingSkills": ["skill1", ...],
  "formattingIssues": ["issue1", ...],
  "strengths": ["strength1", ...],
  "jobTitles": ["title1", ...],
  "projects": ["project description 1", "project description 2", ...],
  "summary": "brief professional summary"
}

IMPORTANT for primaryProgrammingLanguage: Only choose ONE from [javascript, python, java, cpp, typescript] that is most prominent in their experience and projects.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert ATS resume analyzer. Return only valid JSON.' },
          { role: 'user', content: analysisPrompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
      console.warn('🛡️ [Resume Fallback] AI Analysis failed, using generic profile:', error.message);
      return {
        atsScore: 75,
        skills: ["javascript", "react", "node.js", "mongodb", "problem solving", "communication"],
        primaryProgrammingLanguage: "javascript",
        experience: ["Software Developer (Simulation Mode)"],
        education: ["Bachelor of Technology in Computer Science"],
        suggestions: ["Consider adding specific project details."],
        missingSkills: ["cloud-deployment", "unit-testing"],
        formattingIssues: [],
        strengths: ["Clean Code Practices", "Logic"],
        jobTitles: ["Software Engineer"],
        projects: ["LMS Platform Development"],
        summary: "A passionate developer with focus on fullstack web technologies."
      };
    }
  }

  async generateAptitudeQuestions(skills, numQuestions, scenario = 'General Aptitude', instructorTopic = '') {
    try {
      const skillsText = Array.isArray(skills) ? skills.join(', ') : String(skills || 'general knowledge');
      const scenarioText = Array.isArray(scenario) ? scenario.join(', ') : String(scenario || 'General Aptitude');
      const focusText = instructorTopic ? `Instructor's defined topic: "${instructorTopic}". Secondary context: ${skillsText}` : skillsText;

      const prompt = `Generate exactly ${numQuestions} high-quality, professional multiple-choice questions for a corporate Aptitude Test.

      CRITICAL INSTRUCTIONS:
      1. NO TECHNICAL/CODING QUESTIONS.
      2. TOPIC FOCUS: ${focusText}.
      3. SCENARIOS: ${scenarioText}.
      4. INTEGRATION: Ensure that the questions are a blend of the selected SCENARIOS and the candidate's Resume Skills (TOPIC FOCUS). For example, if the scenario is "Logical Reasoning" and the skill is "React.js", create a logical puzzle related to a frontend development scenario.
      5. ACCURACY & OPTIONS: Each question must have EXACTLY one logically and mathematically correct answer. The options array MUST contain the actual numerical or verbal answers.
      6. GUARANTEED CORRECT OPTION: The correct answer must be one of the 4 items in the 'options' array.
      7. CATEGORIES: Balanced mix based on the requested scenarios.
      8. VERY IMPORTANT: You MUST generate EXACTLY ${numQuestions} questions in the "questions" array. DO NOT generate just one question!

      Return ONLY a valid JSON object in this format:
      {
        "questions": [
          {
            "id": "q1",
            "question": "Question 1 text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 0, 
            "hint": "Brief hint",
            "category": "quantitative",
            "difficulty": "medium",
            "explanation": "Detailed step-by-step proof"
          },
          {
            "id": "q2",
            "question": "Question 2 text here",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correctAnswer": 2, 
            "hint": "Brief hint",
            "category": "logical",
            "difficulty": "medium",
            "explanation": "Detailed step-by-step proof"
          }
        ]
      }
      (Continue the array pattern until you reach EXACTLY ${numQuestions} objects. Do NOT stop early!)`;

      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert test designer. Return only valid JSON object.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      
      const content = response.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      return parsed.questions || [];
    } catch (error) {
      console.error('Aptitude Generation Error:', error);
      throw new Error('Failed to generate aptitude questions');
    }
  }

  async generateCodingProblems(ctx, detectedLanguage) {
    let attempts = 0;
    const maxAttempts = 2;
    let problems = [];

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const prompt = `Act as a Senior Technical Lead. Generate exactly 4 unique coding problems tailored to this candidate's resume.
Difficulty Progression:
- Problems 1-3: Easy (Standard foundational algorithms like Palindrome, Anagram, Vowel Count, String Reversal, etc.).
- Problem 4: Medium (Advanced logic derived from their skills: ${ctx.skills}).

[STRICT LOGIC RULES]
1. Every problem MUST have exactly 5 test cases.
2. Every test case MUST have a non-empty "input" string and a non-empty "expectedOutput" string.
3. [VERIFICATION STEP] You MUST dry-run the input through your proposed logic. Input/Output parity is mandatory.
   - [INPUT STANDARD] ALWAYS use single space-separated strings for multiple inputs. DO NOT use commas.
   - Example (Anagram): input: "listen silent" -> expectedOutput: "true".
   - Example (Palindrome): input: "racecar" -> expectedOutput: "true".
   - Example (Sum): input: "10 20" -> expectedOutput: "30".
4. [PROGRESSION] Task 4 MUST NOT be based on the candidate's resume projects. It MUST be a logical "Level Up" or "Boss Level" version of Task 1, 2, or 3.
   - Example: Task 1 is 'Check Palindrome' -> Task 4 is 'Longest Palindromic Substring'.
   - Example: Task 2 is 'Vowel Count' -> Task 4 is 'Advanced String Manipulation' or 'Frequency Analysis'.
   - Maintain a consistent conceptual thread; avoid jumping to unrelated project-based topics.
5. Expected output must be 100% mathematically and logically accurate based ON THE PROBLEM DESCRIPTION.
6. NEVER generate 'true' for a failing case or vice versa. Double-check all boolean and numeric outputs.

[CANDIDATE SKILLSET]
- Primary Technologies: ${ctx.skills}
- Target Language: ${detectedLanguage}

Return ONLY a valid JSON array of 4 objects:
[
  {
    "id": "p1",
    "title": "Title",
    "difficulty": "Easy",
    "description": "Problem statement",
    "examples": [{"input": "...", "output": "..."}],
    "starterCode": { "${detectedLanguage}": "${
      detectedLanguage === 'java' ? 'import java.util.Scanner;\\n\\npublic class Solution {\\n    public static void main(String[] args) {\\n        Scanner sc = new Scanner(System.in);\\n        // For multiple inputs (like anagrams), use sc.next() for each word\\n        // Example: String s1 = sc.next(); String s2 = sc.next();\\n        \\n        // Write your logic here\\n    }\\n}' :
      detectedLanguage === 'c' ? '#include <stdio.h>\\n\\nint main() {\\n    // code\\n    return 0;\\n}' :
      detectedLanguage === 'python' ? 'def solution():\\n    # code\\n    pass\\n\\nif __name__ == "__main__":\\n    solution()' :
      'function solution() {\\n    // code\\n}\\nsolution();'
    }" },
    "testCases": [{"input": "some_input", "expectedOutput": "some_output", "difficulty": "Easy"}],
    "resumeRelevance": "..."
  }
]`;

        const response = await this.openai.chat.completions.create({
          model: 'openai/gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are a precise coding challenge generator. Blank test cases are UNACCEPTABLE.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 3000
        });

        const rawText = response.choices?.[0]?.message?.content || '{}';
        let parsed;
        try {
          parsed = JSON.parse(rawText);
        } catch (e) {
          console.warn(`[AiService] JSON Parse failed on attempt ${attempts}. Retrying...`);
          continue; 
        }

        const rawProblems = Array.isArray(parsed) ? parsed : (parsed.problems || []);
        
        problems = rawProblems.slice(0, 4).map((p, i) => {
          const tcs = (p.testCases || p.test_cases || []).slice(0, 5).map(tc => ({
            input: String(tc.input || '').trim(),
            expectedOutput: String(tc.expectedOutput || tc.expected_output || tc.expected || '').trim(),
            difficulty: tc.difficulty || p.difficulty || 'Easy'
          }));

          return { ...p, id: p.id || `p${i + 1}`, testCases: tcs };
        });

        // STRICT VALIDATION: If any task has blank test cases, retry.
        const allValid = problems.every(p => 
          p.testCases.length >= 5 && 
          p.testCases.every(tc => tc.input.length > 0 && tc.expectedOutput.length > 0)
        );

        if (allValid && problems.length >= 4) {
          return problems;
        } else {
          console.warn(`[AiService] Attempt ${attempts} generated blank test cases. Retrying...`);
        }
      } catch (error) {
        console.error(`[AiService] Attempt ${attempts} failed:`, error.message);
        if (attempts >= maxAttempts) throw error;
      }
    }

    return problems;
  }

  async evaluateCodeSubmission(problem, language, code) {
    const evalPrompt = `Evaluate this ${language} code solution for problem: ${problem.title}. 
    Description: ${problem.description}
    Code: ${code}

    Return JSON:
    {
      "passed": true/false,
      "passedCount": number,
      "totalCount": number,
      "timeComplexity": "O(n)",
      "spaceComplexity": "O(1)",
      "feedback": "..."
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: evalPrompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
       console.error('Code Eval Error:', error);
       throw new Error('Failed to evaluate code');
    }
  }

  async generateHRQuestions(skills, experience, context, perfProfile) {
    const prompt = `Generate 7 personalized HR Interview questions for a candidate with the following profile:
    
    [CANDIDATE DATA]
    Aptitude Score: ${perfProfile?.aptitude?.percentage || 'N/A'}%
    Coding Score: ${perfProfile?.coding?.scorePercent || 'N/A'}%
    Resume Skills: ${skills || 'General Technical Background'}
    
    [INSTRUCTIONS]
    1. GAP PROBE: Ask about gaps if there is a mismatch between logical thinking (Aptitude) and practical implementation (Coding).
    2. WEAK AREAS: Deep-dive into any known weak topics.
    3. RESUME VALIDATION: Ask for specific examples related to their Resume Skills.
    4. SOFT SKILLS: Include questions on leadership, teamwork, and problem-solving.
    
    Return a JSON object strictly in this format: 
    { 
      "questions": [
        { 
          "id": "q1", 
          "question": "...", 
          "type": "behavioral", 
          "expectedDuration": 120, 
          "followUps": [], 
          "evaluationCriteria": "..." 
        }
      ] 
    }`;

    try {
      console.log(`[AiService] Generating HR questions for student. Skills: ${skills}`);
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an AI Executive Recruiter. Your goal is to generate challenging and insightful interview questions. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      const data = JSON.parse(response.choices?.[0]?.message?.content || '{}');
      if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
        console.warn('[AiService] AI returned empty or invalid questions structure:', data);
        return [];
      }
      return data.questions;
    } catch (error) {
       console.error('HR Questions Gen Error:', error);
       return []; // Return empty so fallback can handle it
    }
  }

  async evaluateInterviewResponse(question, answer, context) {
    const prompt = `Evaluate this interview response.
    Question: ${question}
    Answer: ${answer}
    
    [SCORING RULES]
    2 Marks: Accurate, detailed, and directly answers the question with specific examples.
    1 Mark: Relevant to the topic but lacks detail or specific examples.
    0 Marks: Irrelevant, factually incorrect, or no meaningful response.

    Return JSON:
    {
      "score": <strictly 0, 1, or 2 based on rules above>,
      "technicalConsistency": "...",
      "communication": "...",
      "problemSolving": "...",
      "actionableAdvice": "...",
      "followUp": "...",
      "strengths": [],
      "improvements": []
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
       console.error('Interview Eval Error:', error);
       // Return a mock fallback instead of throwing a 400 error
       return {
         score: 1,
         technicalConsistency: "Answer recorded via fallback.",
         communication: "Acceptable.",
         problemSolving: "Neutral.",
         actionableAdvice: "Provide more details in future responses.",
         followUp: "Can you elaborate further?",
         strengths: ["Attempted to answer."],
         improvements: ["More depth required."]
       };
    }
  }

  async generatePersonalizedGapAnalysis(perfData) {
    const prompt = `Act as an AI Career Coach. Analyze this student's performance across multiple rounds and provide deeply personalized strengths and areas for improvement.
    
    [PERFORMANCE DATA]
    - MCQ Round: ${perfData.mcq?.score || 0}% (Weak Areas: ${(perfData.mcq?.weakAreas || []).join(', ')})
    - Aptitude: ${perfData.aptitude?.percentage || 0}%
    - Coding: ${perfData.coding?.scorePercent || 0}% (Feedback: ${perfData.coding?.feedback || 'None'})
    - Resume Skills: ${(perfData.resume?.skills || []).join(', ')}
    
    [OUTPUT RULES]
    1. STRENGTHS: Identify 3-4 specific technical or behavioral strengths.
    2. IMPROVEMENTS: Identify 3-4 specific areas to focus on.
    3. GAP ANALYSIS: Explain the relationship between their scores (e.g., strong logic but weak implementation).
    4. READINESS: Provide a final verdict on their industry readiness.
    
    Return JSON:
    {
      "strengths": ["...", "..."],
      "improvements": ["...", "..."],
      "theoryVsPractical": "...",
      "overallReadiness": "..."
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a career development expert. Return ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (e) {
      console.error('AI Gap Analysis Error:', e);
      return null;
    }
  }

  async generateFinalInterviewReport(interviewData, context) {
    const prompt = `Generate final Executive Interview Report in JSON format.
    Data: ${JSON.stringify(interviewData)}
    
    Return Structure:
    {
      "executiveSummary": "...",
      "roundWiseBreakdown": { "mcq": "...", "aptitude": "...", "coding": "...", "hrInterview": "..." },
      "criticalImprovementAreas": [],
      "finalVerdict": "Hire | Develop | Reject",
      "overallScore": 0-100
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
       throw new Error('Failed to generate final report');
    }
  }

  async generateInstitutionalReport(stage, data, realScore, realStatus) {
    const prompt = `Act as an AI Academic Counselor. Generate a professional report for ${stage} round.
    Score: ${realScore}%
    Status: ${realStatus}
    
    Return JSON:
    {
      "performance": "...",
      "strengths": [],
      "weaknesses": [],
      "improvementTips": [],
      "score": ${realScore},
      "status": "${realStatus}",
      "generatedAt": "${new Date().toISOString()}"
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (error) {
      return {
        performance: "Performance data recorded.",
        strengths: ["Completed"],
        weaknesses: [],
        improvementTips: [],
        score: realScore,
        status: realStatus,
        generatedAt: new Date().toISOString()
      };
    }
  }

  async generatePlacementReadinessReport(studentData) {
    const prompt = `Act as a Senior Career Consultant and Data Analyst. Your goal is to generate a comprehensive 'Placement Readiness Report' for a student based on their performance across 5 rounds: MCQ, Resume, Aptitude, Coding, and HR Interview. You must go beyond marks and provide deep behavioral and technical insights.

    [ANALYTICAL LOGIC RULES]
    1. Lag Detection: If time spent is 20% higher than average but score is high, tag as 'Good Logic, Poor Speed'.
    2. Conceptual Clarity: If answer changes > 3 for a question, tag topic as 'Needs Fundamental Revision'.
    3. Integrity Check: If Overall Score > 90% but Trust Score < 70%, flag as 'Potential Malpractice Warning'.
    4. Topic Exclusion: EXCLUDE any 'MCQ', 'Theory', or 'Multiple Choice' topics from the competency heatmap. Focus only on practical skills like Coding, Aptitude, and Soft Skills.

    [STUDENT DATA]
    Performance Scores: ${JSON.stringify(studentData.scores)}
    Behavioral Data: ${JSON.stringify(studentData.behavioral)}
    Coding Metrics: ${JSON.stringify(studentData.coding)}
    HR Sentiment: ${JSON.stringify(studentData.hrSentiment)}
    Topic breakdown: ${JSON.stringify(studentData.topicPerformance)}

    [OUTPUT STRUCTURE - JSON ONLY]
    {
      "radarData": [
        { "subject": "Technical", "A": 0-100, "fullMark": 100 },
        { "subject": "Logic", "A": 0-100, "fullMark": 100 },
        { "subject": "Speed", "A": 0-100, "fullMark": 100 },
        { "subject": "Communication", "A": 0-100, "fullMark": 100 },
        { "subject": "Integrity", "A": 0-100, "fullMark": 100 }
      ],
      "competencyHeatmap": {
        "strengths": [{ "topic": "...", "score": 0-100 }],
        "weaknesses": [{ "topic": "...", "score": 0-100 }]
      },
      "struggleLog": [
        { "round": "...", "issue": "...", "reason": "..." }
      ],
      "actionableRoadmap": [
        { "task": "...", "timeframe": "48 hours | 1 week | 2 weeks", "goal": "..." }
      ],
      "improvementIndex": 0-100,
      "technicalAssessment": "...",
      "behavioralInsights": "...",
      "finalVerdict": "Ready | Needs Polish | Development Required"
    }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1500
      });
      return JSON.parse(response.choices?.[0]?.message?.content || '{}');
    } catch (e) {
      console.error('AI Placement Report Error:', e);
      
      // Calculate a local fallback if AI fails
      const s = studentData.scores || {};
      const tech = Math.round(((s.mcq || 0) + (s.coding || 0)) / 2) || 0;
      const logic = s.aptitude || 0;
      const comm = s.hr || 0;
      const trust = 100 - ((studentData.behavioral?.proctoringViolations || 0) * 10);
      const integrity = Math.max(0, trust);
      const overall = Math.round((tech + logic + comm) / 3) || 0;
      
      let finalVerdict = "Development Required";
      if (overall >= 75 && integrity >= 80) finalVerdict = "Ready";
      else if (overall >= 50) finalVerdict = "Needs Polish";

      return {
        radarData: [
          { subject: 'Technical', A: tech, fullMark: 100 },
          { subject: 'Logic', A: logic, fullMark: 100 },
          { subject: 'Speed', A: logic, fullMark: 100 }, // Approximation
          { subject: 'Communication', A: comm, fullMark: 100 },
          { subject: 'Integrity', A: integrity, fullMark: 100 }
        ],
        competencyHeatmap: { 
          strengths: [
            ...(tech >= 70 ? [{ topic: 'Technical Skills', score: tech }] : []),
            ...(logic >= 70 ? [{ topic: 'Logical Reasoning', score: logic }] : []),
            ...(comm >= 70 ? [{ topic: 'Communication', score: comm }] : [])
          ], 
          weaknesses: [
            ...(tech < 50 ? [{ topic: 'Technical Skills', score: tech }] : []),
            ...(logic < 50 ? [{ topic: 'Logical Reasoning', score: logic }] : []),
            ...(comm < 50 ? [{ topic: 'Communication', score: comm }] : [])
          ]
        },
        struggleLog: studentData.behavioral?.proctoringViolations > 0 ? [
          { round: 'Proctoring', issue: 'Violations Detected', reason: 'System flagged suspicious activities during the assessment.' }
        ] : [],
        actionableRoadmap: [
          { task: 'Review Weak Areas', timeframe: 'Immediate', goal: 'Focus on topics with scores below 50%.' },
          { task: 'Practice Mock Tests', timeframe: '1 Week', goal: 'Improve overall speed and accuracy.' }
        ],
        improvementIndex: overall,
        technicalAssessment: tech >= 70 ? "Candidate shows strong technical fundamentals." : "Technical skills require significant improvement.",
        behavioralInsights: comm >= 70 ? "Good communication and behavioral traits observed." : "Needs to work on communication and presentation.",
        finalVerdict
      };
    }
  }

  async evaluateCustomInput(language, code, input, output) {
    const prompt = `Evaluate code logic for CUSTOM input.
    Input: ${input}
    Output: ${output}
    Code: ${code}
    
    Return JSON: { "verdict": "SUCCESS/FAILURE", "feedback": "..." }`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        max_tokens: 1024
      });
      const result = JSON.parse(response.choices?.[0]?.message?.content || '{}');
      return {
        success: result.verdict === 'SUCCESS',
        feedback: result.feedback
      };
    } catch (error) {
      return { success: false, feedback: 'AI evaluation failed' };
    }
  }
}
