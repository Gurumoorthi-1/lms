require('dotenv').config();
const { OpenAI } = require('openai');
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENAI_API_KEY
});

openai.chat.completions.create({
  model: 'openai/gpt-4o-mini',
  messages: [
    { role: 'system', content: `Generate 3 coding challenges for javascript. Return exactly the following JSON format: { "problems": [ { "title": "...", "description": "...", "difficulty": "Medium", "testCases": [ { "input": "...", "expectedOutput": "..." } ] } ] }` },
    { role: 'user', content: `Tailor the coding challenges to this user's profile: Skills: general programming, Experience: none` }
  ],
  response_format: { type: 'json_object' }
}).then(res => {
  console.log(res.choices[0].message.content);
}).catch(e => {
  console.error('API Error:', e.response ? e.response.data : e.message);
});
