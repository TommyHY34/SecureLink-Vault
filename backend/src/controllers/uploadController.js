const File = require('../models/File');
const AccessLog = require('../models/AccessLog');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const sanitize = f => { if (!f) return 'unnamed'; return f.replace(/[^a-zA-Z0-9._\-\s]/g,'_').replace(/\s+/g,'_').replace(/_{2,}/g,'_').substring(0,200); };

const uploadFile = async (req, res) => {
  let tmp = null;
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' });
    tmp = req.file.path;
    const maxDownloads = Math.min(Math.max(parseInt(req.body.maxDownloads)||1,1),100);
    const expiryHours = Math.min(Math.max(parseInt(req.body.expiryHours)||24,1),168);
    const expiresAt = new Date(Date.now()+expiryHours*3600000);
    const ext = path.extname(req.file.originalname);
    const uid = uuidv4()+ext;
    const dir = path.resolve(process.env.UPLOAD_DIR||'./uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.rename(tmp, path.join(dir, uid));
    tmp = null;
    const file = await File.create({ filename: uid, originalFilename: sanitize(req.file.originalname), fileSize: req.file.size, mimeType: req.file.mimetype||'application/octet-stream', maxDownloads, expiresAt, ipAddress: req.ip, userAgent: req.get('user-agent') });
    console.log('Upload: '+file.id+' | '+file.originalFilename);
    try { await AccessLog.create({ fileId: file.id, action: 'upload', ipAddress: req.ip, userAgent: req.get('user-agent'), success: true }); } catch(_){}
    res.status(201).json({ success: true, id: file.id, originalFilename: file.originalFilename, fileSize: file.fileSize, maxDownloads: file.maxDownloads, expiresAt: file.expiresAt });
  } catch (e) {
    console.error('Erreur upload:', e.message);
    if (tmp) { try { await fs.unlink(tmp); } catch(_){} }
    res.status(500).json({ error: 'Erreur serveur', message: e.message });
  }
};

const getFileInfo = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file||file.isDeleted) return res.status(404).json({ error: 'Fichier introuvable' });
    if (file.isExpired()) return res.status(410).json({ error: 'Fichier expiré' });
    res.json({ success: true, originalFilename: file.originalFilename, fileSize: file.fileSize, mimeType: file.mimeType, remainingDownloads: file.getRemainingDownloads(), expiresAt: file.expiresAt, createdAt: file.created_at });
  } catch (e) { res.status(500).json({ error: 'Erreur serveur' }); }
};

module.exports = { uploadFile, getFileInfo };
