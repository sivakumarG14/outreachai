const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

/**
 * Build tracking pixel HTML and tracked link for a lead.
 */
function buildTracking(trackingId) {
  const base = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const pixel = `<img src="${base}/track/open/${trackingId}" width="1" height="1" style="display:none" alt="" />`;
  const trackedLink = `${base}/track/${trackingId}`;
  return { pixel, trackedLink };
}

/**
 * Sends an email with tracking pixel + link, with retry logic (max 2 retries).
 */
async function sendEmail({ to, company, body, subject, trackingId }, retries = 2) {
  let htmlBody = body.replace(/\n/g, '<br>');
  let textBody = body;

  if (trackingId) {
    const { pixel, trackedLink } = buildTracking(trackingId);
    // Replace placeholder link with tracked link
    textBody = body.replace('[Open Dashboard]', trackedLink);
    htmlBody = textBody.replace(/\n/g, '<br>') + pixel;
  }

  const mailOptions = {
    from: `OutreachAI <${process.env.GMAIL_USER}>`,
    to,
    subject: subject || `Quick idea for ${company}`,
    text: textBody,
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#333">${htmlBody}</div>`,
  };

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent to ${to} (attempt ${attempt}): ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.error(`Email attempt ${attempt} failed for ${to}:`, err.message);
      if (attempt === retries + 1) {
        return { success: false, error: err.message };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

module.exports = { sendEmail, buildTracking };
