const axios = require('axios');

/**
 * Triggers the n8n webhook with lead data.
 * n8n handles: Groq email generation → Gmail send → update-lead status
 */
async function triggerWebhook(payload) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    console.warn('N8N_WEBHOOK_URL not set — skipping webhook');
    return;
  }

  await axios.post(url, payload, { timeout: 60000 });
  console.log(`Webhook triggered for lead: ${payload.email}`);
}

module.exports = { triggerWebhook };
