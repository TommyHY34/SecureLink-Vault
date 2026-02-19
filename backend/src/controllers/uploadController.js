const File = require('../models/File');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const sanitizeFilename = (filename) => {
  if (!filename) return 'unnamed_file';
  return filename
    .replace(/[^a-zA-Z0-9._\-àâäéèêëïîôùûüÿçÀÂÄÉÈÊËÏÎÔÙÛÜŸÇ .]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 200);
};

const uploadFile = async (req, res) => {
  let tempFilePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    tempFilePath = req.file.path;

    const maxDownloads = Math.min(Math.max(parseInt(req.body.maxDownloads) || 1, 1), 100);
    const expiryHours = Math.min(Math.max(parseInt(req.body.expiryHours) || 24, 1), 168);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);

    const fileExtension = path.extname(req.file.originalname);
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const finalPath = path.join(uploadDir, uniqueFilename);

    await fs.mkdir(uploadDir, { recursive: true });
    await fs.rename(tempFilePath, finalPath);
    tempFilePath = null;

    const sanitizedName = sanitizeFilename(req.file.originalname);

    const file = await File.create({
      filename: uniqueFilename,
      originalFilename: sanitizedName,
      fileSize: req.file.size,
      mimeType: req.file.mimetype || 'application/octet-stream',
      maxDownloads,
      expiresAt,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    console.log(`✅ Upload: ${file.id} | ${sanitizedName} | ${(file.fileSize / 1024).toFixed(1)} KB`);

    // Log d'accès (optionnel, ne bloque pas)
    try {
      const { sequelize } = require('../config/database');
      await sequelize.query(
        'INSERT INTO access_logs (file_id, action, ip_address, user_agent, success) VALUES ($1, $2, $3, $4, $5)',
        { bind: [file.id, 'upload', req.ip, req.get('user-agent'), true] }
      );
    } catch (_) {}

    res.status(201).json({
      success: true,
      id: file.id,
      originalFilename: file.originalFilename,
      fileSize: file.fileSize,
      maxDownloads: file.maxDownloads,
      expiresAt: file.expiresAt,
      message: 'Fichier uploadé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur upload:', error.message);

    if (tempFilePath) {
      try { await fs.unlink(tempFilePath); } catch (_) {}
    }

    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ error: 'Données invalides', message: error.errors[0]?.message });
    }

    res.status(500).json({ error: 'Erreur serveur', message: 'Erreur lors de l\'upload' });
  }
};

const getFileInfo = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);

    if (!file || file.isDeleted) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    if (file.isExpired()) {
      return res.status(410).json({ error: 'Fichier expiré' });
    }

    res.json({
      success: true,
      originalFilename: file.originalFilename,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      remainingDownloads: file.getRemainingDownloads(),
      expiresAt: file.expiresAt,
      createdAt: file.created_at
    });

  } catch (error) {
    console.error('❌ Erreur info:', error.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

module.exports = { uploadFile, getFileInfo };
