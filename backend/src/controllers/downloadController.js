const File = require('../models/File');
const AccessLog = require('../models/AccessLog');
const path = require('path');
const fs = require('fs').promises;

const deleteFile = async (file) => {
  try {
    const fp = path.join(path.resolve(process.env.UPLOAD_DIR||'./uploads'), file.filename);
    try { await fs.unlink(fp); } catch(e){ if(e.code!=='ENOENT') console.error('Suppression:', e.message); }
    file.isDeleted = true; file.deletedAt = new Date(); await file.save();
    try { await AccessLog.create({ fileId: file.id, action: 'delete', success: true }); } catch(_){}
    return true;
  } catch(e) { console.error('Erreur suppression:', e.message); return false; }
};

const downloadFile = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file||file.isDeleted) return res.status(404).json({ error: 'Fichier introuvable' });
    if (file.expiresAt && new Date()>new Date(file.expiresAt)) { await deleteFile(file); return res.status(410).json({ error: 'Fichier expiré' }); }
    if (file.downloadCount>=file.maxDownloads) { await deleteFile(file); return res.status(410).json({ error: 'Limite atteinte' }); }
    const filePath = path.join(path.resolve(process.env.UPLOAD_DIR||'./uploads'), file.filename);
    try { await fs.access(filePath); } catch { file.isDeleted=true; file.deletedAt=new Date(); await file.save(); return res.status(404).json({ error: 'Fichier physique introuvable' }); }
    file.downloadCount+=1; file.lastAccessedAt=new Date(); await file.save();
    console.log('Download: '+file.id+' '+file.downloadCount+'/'+file.maxDownloads);
    try { await AccessLog.create({ fileId: file.id, action: 'download', ipAddress: req.ip, userAgent: req.get('user-agent'), success: true }); } catch(_){}
    if (file.downloadCount>=file.maxDownloads) setImmediate(()=>deleteFile(file));
    res.setHeader('Content-Type', file.mimeType||'application/octet-stream');
    res.setHeader('Content-Disposition', "attachment; filename*=UTF-8''"+encodeURIComponent(file.originalFilename));
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('X-Remaining-Downloads', file.getRemainingDownloads());
    res.sendFile(filePath, async (err) => {
    if (err) {
      if (!res.headersSent) res.status(500).json({ error: 'Erreur envoi' });
      return;
    }
    // Supprimer SEULEMENT après que l'envoi est terminé
    if (file.downloadCount >= file.maxDownloads) {
      await deleteFile(file);
    }
  });
  } catch(e) { console.error('Erreur download:', e.message); if(!res.headersSent) res.status(500).json({ error: 'Erreur serveur' }); }
};

const manualDeleteFile = async (req, res) => {
  try {
    const file = await File.findByPk(req.params.id);
    if (!file) return res.status(404).json({ error: 'Introuvable' });
    if (file.isDeleted) return res.status(410).json({ error: 'Déjà supprimé' });
    await deleteFile(file); res.json({ success: true });
  } catch(e) { res.status(500).json({ error: 'Erreur' }); }
};

module.exports = { downloadFile, deleteFile, manualDeleteFile };
