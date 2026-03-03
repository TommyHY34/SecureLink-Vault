const File = require('../models/File');
const { Op } = require('sequelize');

const cleanupExpiredFiles = async () => {
  try {
    const expired = await File.findAll({ where: { isDeleted: false, [Op.or]: [{ expiresAt: { [Op.lt]: new Date() } }, { downloadCount: { [Op.gte]: File.sequelize.literal('max_downloads') } }] } });
    if (!expired.length) return 0;
    console.log(expired.length+' fichiers expirés');
    const { deleteFile } = require('../controllers/downloadController');
    let n = 0;
    for (const f of expired) { if (await deleteFile(f)) n++; }
    if (n) console.log('Nettoyage: '+n+' supprimés');
    return n;
  } catch(e) { console.error('Erreur nettoyage:', e.message); return 0; }
};

const getFileStatistics = async () => {
  try {
    const total = await File.count();
    const active = await File.count({ where: { isDeleted: false } });
    const deleted = await File.count({ where: { isDeleted: true } });
    return { total_files: total, active_files: active, deleted_files: deleted };
  } catch(e) { return null; }
};

const startCleanupJob = () => {
  const h = parseInt(process.env.CLEANUP_INTERVAL_HOURS)||1;
  console.log('Nettoyage auto toutes les '+h+'h');
  setTimeout(cleanupExpiredFiles, 5000);
  setInterval(cleanupExpiredFiles, h*3600000);
};

module.exports = { cleanupExpiredFiles, getFileStatistics, startCleanupJob };
