const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AccessLog = sequelize.define('AccessLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fileId: { type: DataTypes.UUID, field: 'file_id' },
  action: { type: DataTypes.STRING(50), allowNull: false },
  ipAddress: { type: DataTypes.STRING(50), field: 'ip_address' },
  userAgent: { type: DataTypes.TEXT, field: 'user_agent' },
  success: { type: DataTypes.BOOLEAN, defaultValue: true },
  errorMessage: { type: DataTypes.TEXT, field: 'error_message' }
}, { tableName: 'access_logs', timestamps: true, createdAt: 'timestamp', updatedAt: false });

module.exports = AccessLog;
