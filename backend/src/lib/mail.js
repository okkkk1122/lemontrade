const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

function getTransporter() {
  if (!config.smtp.host) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log('[mail:dev]', { to, subject, text: text || html?.slice(0, 200) });
    return { ok: true, dev: true };
  }
  try {
    await t.sendMail({ from: config.smtp.from, to, subject, html, text });
    return { ok: true };
  } catch (e) {
    console.warn('[mail:error]', e.message);
    return { ok: false, error: e.message };
  }
}

module.exports = { sendMail, getTransporter };
