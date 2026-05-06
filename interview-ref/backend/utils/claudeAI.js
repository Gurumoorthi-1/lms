/**
 * Claude AI Utility - Wrapper for Anthropic API calls
 */

const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

/**
 * Send a message to Claude and get a response
 * @param {string} prompt - The user prompt
 * @param {string} systemPrompt - Optional system prompt
 * @param {number} maxTokens - Max tokens for response
 */
async function askClaude(prompt, systemPrompt = '', maxTokens = 2000) {
  try {
    const messages = [{ role: 'user', content: prompt }];
    
    const params = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      messages
    };

    if (systemPrompt) {
      params.system = systemPrompt;
    }

    const response = await client.messages.create(params);
    return response.content[0].text;
  } catch (error) {
    console.error('Claude API error:', error.message);
    throw new Error(`AI service error: ${error.message}`);
  }
}

/**
 * Parse JSON from Claude's response safely
 */
function parseJsonResponse(text) {
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // Try to extract JSON from the text
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Failed to parse AI response as JSON');
  }
}

module.exports = { askClaude, parseJsonResponse };
