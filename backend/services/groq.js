const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const WORD_LIMITS = { initial: 120, followup: 80, reminder: 60 };

const SYSTEM_PROMPT = `You are a professional outreach specialist writing emails to business decision-makers on behalf of OutreachAI.
Style: Professional, calm, confident. No aggressive selling. Focus on growth, ROI, and untapped potential.
Language: English.
Structure: 1. Greeting 2. Introduction 3. Personalized observation 4. Value proposition (ROI/Growth) 5. Bullet points 6. Soft CTA.
Rules: No placeholders. No explanations. Only output the final email text.`;

function buildUserPrompt(name, company, industry, type) {
  const limit = WORD_LIMITS[type] || 120;
  const instructions = {
    initial: `Introduce OutreachAI. Mention growth potential. CTA = short conversation. Max ${limit} words.`,
    followup: `Mention ROI or missed opportunity. CTA = offer ROI example. Max ${limit} words.`,
    reminder: `Very short. Polite follow-up. CTA = Yes/No answer. Max ${limit} words.`,
  };

  return `Name: ${name}, Company: ${company}, Industry: ${industry}, Type: ${type}. ${instructions[type] || instructions.initial}`;
}

function fallbackTemplate(name, company, industry) {
  return `Hi ${name},\n\nI came across ${company} in the ${industry} space and wanted to share a quick idea on how you could further grow your business.\n\nWould you have a moment for a quick chat?\n\nBest regards,\nOutreachAI Team`;
}

async function generateEmail({ name, company, industry, type = 'initial' }) {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(name, company, industry, type) },
        ],
        temperature: 0.7,
        max_tokens: 300,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    return response.data.choices[0].message.content.trim();
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error('Groq API error:', detail);
    return fallbackTemplate(name, company, industry);
  }
}

module.exports = { generateEmail, fallbackTemplate };
