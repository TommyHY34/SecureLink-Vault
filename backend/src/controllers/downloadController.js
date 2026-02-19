const File = require('../models/File');
const path = require('path');
const fs = require('fs').promises;

const deleteFile = async (file) => {
  try {
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const filePath = path.join(uploadDir, file.filename);

    try {
      await fs.unlink(filePath);
      console.log(`🗑️  Fichier supprimé: ${file.filename}`);
    } catch (e) {
      if (e.code !== 'ENOENT') console.error('⚠️ Suppression fichier:', e.message);
    }

    file.isDeleted = true;
    file.deletedAt = new Date();
    await file.save();

    try {
      const { sequelize } = require('../config/database');
      await sequelize.query(
        'INSERT INTO access_logs (file_id, action, success) VALUES ($1, $2, $3)',
        { bind: [file.id, 'delete', true] }
      );
    } catch (_) {}

    return true;
  } catch (error) {
    console.error('❌ Erreur suppression:', error.message);
    return false;
  }
};

const downloadFile = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);

    if (!file || file.isDeleted) {
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    if (file.expiresAt && new Date() > new Date(file.expiresAt)) {
      await deleteFile(file);
      return res.status(410).json({ error: 'Fichier expiré (date)' });
    }

    if (file.downloadCount >= file.maxDownloads) {
      await deleteFile(file);
      return res.status(410).json({ error: 'Limite de téléchargements atteinte' });
    }

    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    const filePath = path.join(uploadDir, file.filename);

    try {
      await fs.access(filePath);
    } catch {
      file.isDeleted = true;
      file.deletedAt = new Date();
      await file.save();
      return res.status(404).json({ error: 'Fichier physique introuvable' });
    }

    file.downloadCount += 1;
    file.lastAccessedAt = new Date();
    await file.save();

    console.log(`📥 Download: ${file.id} | ${file.originalFilename} | ${file.downloadCount}/${file.maxDownloads}`);

    try {
      const { sequelize } = require('../config/database');
      await sequelize.query(
        'INSERT INTO access_logs (file_id, action, ip_address, user_agent, success) VALUES ($1, $2, $3, $4, $5)',
        { bind: [file.id, 'download', req.ip, req.get('user-agent'), true] }
      );
    } catch (_) {}

    if (file.downloadCount >= file.maxDownloads) {
      setImmediate(() => deleteFile(file));
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.originalFilename)}`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('X-Remaining-Downloads', file.getRemainingDownloads());
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.sendFile(filePath, (err) => {
      if (err && !res.headersSent) {
        console.error('❌ Erreur envoi fichier:', err.message);
        res.status(500).json({ error: 'Erreur lors de l\'envoi' });
      }
    });

  } catch (error) {
    console.error('❌ Erreur download:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur serveur' });
    }
  }
};

const manualDeleteFile = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) return res.status(404).json({ error: 'Fichier introuvable' });
    if (file.isDeleted) return res.status(410).json({ error: 'Déjà supprimé' });

    await deleteFile(file);
    res.json({ success: true, message: 'Fichier supprimé' });
  } catch (error) {
    res.status(500).json({ error: 'Erreur suppression' });
  }
};

module.exports = { downloadFile, deleteFile, manualDeleteFile };
