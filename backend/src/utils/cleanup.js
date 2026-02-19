const File = require('../models/File');
const { Op } = require('sequelize');

const cleanupExpiredFiles = async () => {
  try {
    const now = new Date();
    const { sequelize } = require('../config/database');

    const expiredFiles = await File.findAll({
      where: {
        isDeleted: false,
        [Op.or]: [
          { expiresAt: { [Op.lt]: now } },
          sequelize.literal('"download_count" >= "max_downloads"')
        ]
      }
    });

    if (expiredFiles.length === 0) return 0;

    console.log(`🧹 ${expiredFiles.length} fichiers expirés à nettoyer`);

    const { deleteFile } = require('../controllers/downloadController');
    let count = 0;
    for (const file of expiredFiles) {
      const ok = await deleteFile(file);
      if (ok) count++;
    }

    console.log(`✅ Nettoyage: ${count} fichiers supprimés`);
    return count;
  } catch (error) {
    console.error('❌ Erreur nettoyage:', error.message);
    return 0;
  }
};

const getFileStatistics = async () => {
  try {
    const { sequelize } = require('../config/database');
    const stats = await sequelize.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_deleted = FALSE) as active_files,
        COUNT(*) FILTER (WHERE is_deleted = TRUE) as deleted_files,
        COUNT(*) as total_files,
        COALESCE(SUM(file_size) FILTER (WHERE is_deleted = FALSE), 0) as total_size_bytes,
        MAX(created_at) as last_upload
      FROM files
    `, { type: sequelize.QueryTypes.SELECT });
    return stats[0];
  } catch (error) {
    console.error('❌ Erreur stats:', error.message);
    return null;
  }
};

const startCleanupJob = () => {
  const intervalHours = parseInt(process.env.CLEANUP_INTERVAL_HOURS) || 1;
  const intervalMs = intervalHours * 60 * 60 * 1000;

  console.log(`🕐 Nettoyage auto toutes les ${intervalHours}h`);

  // Nettoyage immédiat au démarrage
  setTimeout(cleanupExpiredFiles, 5000);

  // Nettoyage périodique
  setInterval(cleanupExpiredFiles, intervalMs);
};

module.exports = { cleanupExpiredFiles, getFileStatistics, startCleanupJob };
