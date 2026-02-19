const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { uploadFile, getFileInfo } = require('../controllers/uploadController');
const { downloadFile, manualDeleteFile } = require('../controllers/downloadController');
const { getFileStatistics } = require('../utils/cleanup');

const router = express.Router();

// ─── RATE LIMITERS ───────────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Limite d\'uploads atteinte. Réessayez dans 1 heure.' }
});

const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 100,
  message: { error: 'Limite de téléchargements atteinte.' }
});

// ─── MULTER ──────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'temp');
    fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800,
    files: 1
  }
});

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      const maxMB = ((parseInt(process.env.MAX_FILE_SIZE) || 52428800) / 1024 / 1024).toFixed(0);
      return res.status(413).json({ error: `Fichier trop volumineux (max ${maxMB} MB)` });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const sanitizeFilename = (filename) => {
  if (!filename) return 'unnamed_file';
  return filename
    .replace(/[^a-zA-Z0-9._\-àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ .]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
};

// ─── ROUTES ──────────────────────────────────────────────────────────────────

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

// Upload
router.post('/upload', uploadLimiter, upload.single('file'), handleMulterError, (req, res, next) => {
  req.sanitizeFilename = sanitizeFilename;
  next();
}, uploadFile);

// Info fichier
router.get('/file/:id/info', getFileInfo);

// Téléchargement
router.get('/download/:id', downloadLimiter, downloadFile);

// Suppression manuelle
router.delete('/file/:id', manualDeleteFile);

// Statistiques
router.get('/stats', async (req, res) => {
  try {
    const stats = await getFileStatistics();
    res.json({ success: true, statistics: stats });
  } catch (err) {
    res.status(500).json({ error: 'Erreur stats' });
  }
});

// 404 routes
router.use((req, res) => {
  res.status(404).json({ error: `Route introuvable: ${req.method} ${req.path}` });
});

module.exports = router;
