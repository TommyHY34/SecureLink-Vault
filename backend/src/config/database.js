const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'securevault',
  process.env.DB_USER || 'securevault_user',
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    dialect: 'postgres',
    logging: false,
    pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
  }
);

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connecté');
    return true;
  } catch (error) {
    console.error('❌ Connexion DB échouée:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };
