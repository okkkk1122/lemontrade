const crypto = require('crypto');

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateReferralCode() {
  return 'LT' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

function formatToman(amount) {
  return new Intl.NumberFormat('fa-IR').format(amount) + ' تومان';
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'همین الان';
  if (mins < 60) return `${mins} دقیقه پیش`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ساعت پیش`;
  const days = Math.floor(hours / 24);
  return `${days} روز پیش`;
}

function persianDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toLocaleDateString('fa-IR');
  }
}

function validateIranMobile(mobile) {
  return /^09\d{9}$/.test(mobile.replace(/\s/g, ''));
}

function riskReward(entry, sl, tp) {
  if (!tp || entry === sl) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (risk === 0) return null;
  return (reward / risk).toFixed(2);
}

module.exports = {
  generateToken,
  generateReferralCode,
  formatToman,
  timeAgo,
  persianDate,
  validateIranMobile,
  riskReward,
};
