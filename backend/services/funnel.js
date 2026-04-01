const { v4: uuidv4 } = require('uuid');
const Lead = require('../models/Lead');
const { sendEmail } = require('./mailer');
const { getTemplate } = require('./templates');
const { emit } = require('./socket');
const nodemailer = require('nodemailer');

const ANA_EMAIL = process.env.ANA_EMAIL || 'anaramonavasar12@gmail.com';

// Score increments
const SCORE = { reply: 10, replyYes: 20, linkClick: 10, emailOpen: 5, address: 30, callScheduled: 20 };

/**
 * Ensure lead has a trackingId.
 */
async function ensureTrackingId(lead) {
  if (!lead.trackingId) {
    lead.trackingId = uuidv4();
    await lead.save();
  }
  return lead.trackingId;
}

/**
 * Send a funnel email and update lead tracking fields.
 */
async function sendFunnelEmail(lead, templateType) {
  const { subject, text } = getTemplate(templateType, 'en', {
    name: lead.name, company: lead.company, industry: lead.industry,
  });

  const trackingId = await ensureTrackingId(lead);
  const result = await sendEmail({ to: lead.email, company: lead.company, body: text, subject, trackingId });

  lead.lastEmailSent = templateType;
  lead.lastEmailDate = new Date();
  await lead.save();
  return result;
}

/**
 * Notify team with context about the lead.
 */
async function notifyAna(lead, message) {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });
  await transporter.sendMail({
    from: `OutreachAI CRM <${process.env.GMAIL_USER}>`,
    to: ANA_EMAIL,
    subject: `[OutreachAI] ${message} — ${lead.name} / ${lead.company}`,
    text: `Lead: ${lead.name}\nCompany: ${lead.company}\nIndustry: ${lead.industry}\nEmail: ${lead.email}\nStatus: ${lead.status}\nScore: ${lead.score}\nNotes: ${lead.notes}\n\n${message}`,
  });
  console.log(`Notification sent: ${message} for ${lead.email}`);
}

/**
 * FLOW 1: Entry — send cold contact email on lead creation.
 */
async function flow1_entry(lead) {
  await sendFunnelEmail(lead, 'cold_contact');
  lead.flow = 1;
  lead.status = 'Cold';
  await lead.save();

  emit('leadAdded', {
    leadId: lead._id,
    name: lead.name,
    company: lead.company,
    status: lead.status,
    score: lead.score,
  });

  console.log(`FLOW 1: Cold contact sent to ${lead.email}`);
}

async function flow2_reminder1(lead) {
  await sendFunnelEmail(lead, 'reminder_1');
  lead.flow = 2;
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status, flow: lead.flow });
  console.log(`FLOW 2: Reminder 1 sent to ${lead.email}`);
}

async function flow3_trustBuilding(lead) {
  await sendFunnelEmail(lead, 'trust_building');
  lead.flow = 3;
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status, flow: lead.flow });
  console.log(`FLOW 3: Trust building sent to ${lead.email}`);
}

async function flow4_reminder2(lead) {
  await sendFunnelEmail(lead, 'reminder_2');
  lead.flow = 4;
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status, flow: lead.flow });
  console.log(`FLOW 4: Reminder 2 sent to ${lead.email}`);
}

async function flow4_behaviorTrigger(lead) {
  lead.score += SCORE.linkClick;
  lead.status = 'Engaged';
  await sendFunnelEmail(lead, 'behavior_trigger');
  await notifyAna(lead, 'Lead clicked link — immediate follow-up needed');
  await lead.save();

  emit('linkClicked', {
    leadId: lead._id,
    name: lead.name,
    company: lead.company,
    score: lead.score,
    status: lead.status,
  });

  console.log(`FLOW 4: Behavior trigger for ${lead.email}`);
}

async function flow5_requestAddress(lead) {
  await sendFunnelEmail(lead, 'qualification_address');
  lead.flow = 5;
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status, flow: lead.flow });
}

async function flow5_spin(lead) {
  await sendFunnelEmail(lead, 'qualification_spin');
  lead.flow = 5;
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status, flow: lead.flow });
}

async function flow6_callWarmup(lead) {
  await sendFunnelEmail(lead, 'call_warmup');
  lead.flow = 6;
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status, flow: lead.flow });
  console.log(`FLOW 6: Call warm-up sent to ${lead.email}`);
}

async function flow8_reEngage(lead) {
  await sendFunnelEmail(lead, 're_engagement');
  lead.flow = 8;
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status, flow: lead.flow });
  console.log(`FLOW 8: Re-engagement sent to ${lead.email}`);
}

async function sendColdExit(lead) {
  await sendFunnelEmail(lead, 'cold_exit');
  lead.status = 'No Interest';
  await lead.save();
  emit('leadUpdated', { leadId: lead._id, status: lead.status });
  console.log(`Cold exit sent to ${lead.email}`);
}

/**
 * Process a reply — core IF/ELSE state machine.
 * replyType: 'yes' | 'no' | 'address' | 'question' | 'later'
 */
async function processReply(lead, replyType, replyText = '') {
  lead.replyReceived = true;
  lead.replyType = replyType;

  // Score: yes/question = +20, others = +10
  lead.score += (replyType === 'yes' || replyType === 'question') ? SCORE.replyYes : SCORE.reply;

  if (replyType === 'no') {
    await sendColdExit(lead);
    return;
  }

  if (replyType === 'later') {
    lead.status = 'Cold – Re-Engage';
    lead.reEngageAfter = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    await lead.save();
    emit('leadUpdated', { leadId: lead._id, status: lead.status, score: lead.score });
    return;
  }

  if (replyType === 'address') {
    lead.status = 'Micro-Commitment';
    lead.addressProvided = true;
    lead.score += SCORE.address;
    console.log(`Address reply: score += ${SCORE.address}, new score = ${lead.score}`);
    await notifyAna(lead, 'Lead sent details — analysis needed');
    await lead.save();
    emit('leadUpdated', { leadId: lead._id, status: lead.status, score: lead.score });
    return;
  }

  if (replyType === 'yes' || replyType === 'question') {
    lead.status = 'Engaged';

    if (replyType === 'question') {
      await flow5_spin(lead);
    } else {
      await flow5_requestAddress(lead);
    }

    if (lead.flow >= 3) {
      await notifyAna(lead, `Lead replied (${replyType}) — follow-up needed`);
    }

    emit('leadUpdated', { leadId: lead._id, status: lead.status, score: lead.score });
    return;
  }

  await lead.save();
}

/**
 * Schedule a call: set callDate, status, score +20, emit event.
 */
async function scheduleCall(lead, callDate) {
  lead.status = 'Call Scheduled';
  lead.callDate = new Date(callDate);
  lead.score += SCORE.callScheduled;
  await lead.save();

  emit('callScheduled', {
    leadId: lead._id,
    name: lead.name,
    company: lead.company,
    callDate: lead.callDate,
    score: lead.score,
  });

  console.log(`Call scheduled for ${lead.email} on ${lead.callDate}`);
}

/**
 * Scheduler: check all leads and trigger time-based flows.
 */
async function runScheduler() {
  const now = new Date();
  const leads = await Lead.find({
    status: { $nin: ['No Interest', 'Closed / Lost', 'Call Scheduled'] },
  });

  for (const lead of leads) {
    try {
      await processScheduledLead(lead, now);
    } catch (err) {
      console.error(`Scheduler error for ${lead.email}:`, err.message);
    }
  }
}

async function processScheduledLead(lead, now) {
  if (!lead.lastEmailDate) return;

  const daysSinceEmail = (now - lead.lastEmailDate) / (1000 * 60 * 60 * 24);

  if (lead.status === 'Cold – Re-Engage' && lead.reEngageAfter && now >= lead.reEngageAfter) {
    await flow8_reEngage(lead);
    return;
  }

  if (lead.status === 'Call Scheduled' && lead.callDate) {
    const daysToCall = (lead.callDate - now) / (1000 * 60 * 60 * 24);
    if (daysToCall <= 1 && daysToCall > 0 && lead.lastEmailSent !== 'call_warmup') {
      await flow6_callWarmup(lead);
      return;
    }
  }

  if (lead.replyReceived) return;

  if (lead.flow === 1 && lead.lastEmailSent === 'cold_contact' && daysSinceEmail >= 4) {
    await flow2_reminder1(lead);
    return;
  }

  if (lead.flow === 2 && lead.lastEmailSent === 'reminder_1' && daysSinceEmail >= 3) {
    await flow3_trustBuilding(lead);
    return;
  }

  if (lead.flow === 3 && lead.lastEmailSent === 'trust_building' && daysSinceEmail >= 5) {
    await flow4_reminder2(lead);
    return;
  }

  if (lead.flow === 4 && lead.lastEmailSent === 'reminder_2' && daysSinceEmail >= 10) {
    await sendColdExit(lead);
    lead.status = 'Cold – Re-Engage';
    lead.reEngageAfter = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    await lead.save();
    return;
  }
}

module.exports = {
  flow1_entry,
  flow2_reminder1,
  flow3_trustBuilding,
  flow4_reminder2,
  flow4_behaviorTrigger,
  flow5_requestAddress,
  flow5_spin,
  flow6_callWarmup,
  flow8_reEngage,
  sendColdExit,
  processReply,
  scheduleCall,
  runScheduler,
  notifyAna,
  ensureTrackingId,
};
