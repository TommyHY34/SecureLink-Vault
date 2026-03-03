const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { uploadFile, getFileInfo } = require('../controllers/uploadController');
const { downloadFile, manualDeleteFile } = require('../controllers/downloadController');
const { getFileStatistics } = require('../utils/cleanup');

const router = express.Router();

const uploadLimiter = rateLimit({ windowMs: 3600000, max: 20 });
const downloadLimiter = rateLimit({ windowMs: 3600000, max: 100 });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.resolve(process.env.UPLOAD_DIR || './uploads', 'temp');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now()+'-'+Math.round(Math.random()*1e9)+path.extname(file.originalname))
});

const upload = multer({ storage, limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE)||52428800, files: 1 } });

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code==='LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Fichier trop volumineux (max 50 MB)' });
    return res.status(400).json({ error: err.message });
  }
  next(err);
};

router.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime(), db: 'SQLite' }));
router.post('/upload', uploadLimiter, upload.single('file'), handleMulterError, uploadFile);
router.get('/file/:id/info', getFileInfo);
router.get('/download/:id', downloadLimiter, downloadFile);
router.delete('/file/:id', manualDeleteFile);
router.get('/stats', async (req, res) => {
  try { res.json({ success: true, statistics: await getFileStatistics() }); }
  catch (e) { res.status(500).json({ error: 'Erreur stats' }); }
});
router.use((req, res) => res.status(404).json({ error: 'Route introuvable: '+req.method+' '+req.path }));

module.exports = router;
