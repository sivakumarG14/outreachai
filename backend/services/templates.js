/**
 * Email templates for all 8 flows.
 * Each template is a function returning { subject, text }.
 * English-only version for general business outreach.
 */

const templates = {
  // FLOW 1 — Cold Contact (Day 0)
  cold_contact: ({ name, company, industry }) => ({
    subject: `Quick idea for ${company}`,
    text: `Hi ${name},

I came across ${company} in the ${industry} space and wanted to share a quick thought.

Many businesses in your industry are discovering quiet growth opportunities — low effort, measurable ROI.

I'd love to show you what I mean in 2–3 sentences. Would you be open to it?

Best regards,
OutreachAI Team`,
  }),

  // Cold Exit
  cold_exit: ({ name, company }) => ({
    subject: `No problem, ${name}`,
    text: `Hi ${name},

Understood — no interest for ${company} at the moment. I completely respect that.

If anything changes, feel free to reach out.

All the best,
OutreachAI Team`,
  }),

  // FLOW 2 — Reminder 1 (Day 4-5)
  reminder_1: ({ name, company }) => ({
    subject: `Quick follow-up — ${company}`,
    text: `Hi ${name},

Just checking if my last message reached you.

It's about a specific opportunity for ${company} — no pitch, just a quick idea.

A simple yes or no is enough.

Best regards,
OutreachAI Team`,
  }),

  // FLOW 3 — Trust Building (Day 8-10)
  trust_building: ({ name, company, industry }) => ({
    subject: `What other ${industry} companies are doing right now`,
    text: `Hi ${name},

I want to show you something that could be relevant for ${company}.

Businesses in the ${industry} space are currently finding new ways to optimize their operations — minimal effort, maximum impact.

Results: 20–40% more efficiency, better conversion, higher revenue.

May I show you what this could look like specifically for ${company}? I just need a few minutes of your time.

Best regards,
OutreachAI Team`,
  }),

  // FLOW 4 — Reminder 2 / Self-Service (Day 15-20)
  reminder_2: ({ name, company }) => ({
    subject: `Check it yourself: potential for ${company}`,
    text: `Hi ${name},

If you'd prefer to get a first impression on your own — no problem.

Here you can assess the potential for ${company} in just a few minutes:
👉 [Open Dashboard]

I'm here if you have questions.

Best regards,
OutreachAI Team`,
  }),

  // FLOW 4 — Behavior trigger (link clicked)
  behavior_trigger: ({ name, company }) => ({
    subject: `I saw you looked at the options for ${company}`,
    text: `Hi ${name},

I noticed you took a look at the possibilities for ${company}.

I'd love to have a quick chat — not to sell anything, but to understand what would be relevant for you.

Do you have 15 minutes this week?

Best regards,
OutreachAI Team`,
  }),

  // FLOW 5 — Qualification: request details
  qualification_address: ({ name }) => ({
    subject: `Quick request, ${name}`,
    text: `Hi ${name},

To give you a concrete assessment, I just need a few details about your current setup.

It takes 30 seconds — and then I can show you what's really possible.

Best regards,
OutreachAI Team`,
  }),

  // FLOW 5 — SPIN qualification
  qualification_spin: ({ name, company }) => ({
    subject: `Questions about ${company} — quick assessment`,
    text: `Hi ${name},

Thank you for your questions. Before I give specific numbers, I'd like to briefly understand:

• What is your current situation at ${company}?
• Where are you hitting limits right now (capacity, team, revenue)?
• What would it mean for you to achieve 20–30% more growth?

These answers help me show you something truly relevant — no standard pitch.

Best regards,
OutreachAI Team`,
  }),

  // FLOW 6 — Call Warm-up (1 day before)
  call_warmup: ({ name, company }) => ({
    subject: `Tomorrow's call — quick prep`,
    text: `Hi ${name},

Looking forward to our call tomorrow.

To prepare: I'll show you a brief analysis for ${company} — concrete numbers, no theory.

If you have any questions beforehand, feel free to reach out.

See you tomorrow,
OutreachAI Team`,
  }),

  // FLOW 8 — Re-engagement (90 days)
  re_engagement: ({ name, company, industry }) => ({
    subject: `Update for ${company} — new opportunities`,
    text: `Hi ${name},

It's been a while since we last spoke.

Since then, things have moved — businesses in the ${industry} space have found new ways to accelerate their growth.

I wanted to check if this topic has become more relevant for ${company} now.

Best regards,
OutreachAI Team`,
  }),
};

/**
 * Get email content for a given template.
 */
function getTemplate(type, lang = 'en', data = {}) {
  const tmpl = templates[type];
  if (!tmpl) throw new Error(`Unknown template: ${type}`);
  return tmpl(data);
}

module.exports = { getTemplate, templates };
