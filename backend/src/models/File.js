const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  originalFilename: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'original_filename'
  },
  fileSize: {
    type: DataTypes.BIGINT,
    allowNull: false,
    field: 'file_size'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    field: 'mime_type'
  },
  maxDownloads: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    field: 'max_downloads'
  },
  downloadCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'download_count'
  },
  expiresAt: {
    type: DataTypes.DATE,
    field: 'expires_at'
  },
  ipAddress: {
    type: DataTypes.STRING(50),
    field: 'ip_address'
  },
  userAgent: {
    type: DataTypes.TEXT,
    field: 'user_agent'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_deleted'
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'deleted_at'
  },
  lastAccessedAt: {
    type: DataTypes.DATE,
    field: 'last_accessed_at'
  }
}, {
  tableName: 'files',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

File.prototype.isExpired = function () {
  if (this.expiresAt && new Date() > new Date(this.expiresAt)) return true;
  if (this.downloadCount >= this.maxDownloads) return true;
  return false;
};

File.prototype.getRemainingDownloads = function () {
  return Math.max(0, this.maxDownloads - this.downloadCount);
};

module.exports = File;
