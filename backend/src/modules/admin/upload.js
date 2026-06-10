const multer = require('multer');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

const uploadDir = config.paths.uploads;
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok =
      file.mimetype.startsWith('image/') ||
      file.mimetype === 'application/pdf' ||
      file.mimetype.includes('spreadsheet') ||
      file.mimetype === 'video/mp4';
    cb(ok ? null : new Error('فرمت فایل مجاز نیست'), ok);
  },
});

function publicUrl(filename) {
  return `/uploads/${path.basename(filename)}`;
}

module.exports = { upload, publicUrl, uploadDir };
