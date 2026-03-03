const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const dbPath = process.env.SQLITE_PATH || path.resolve('./data/securevault.db');

// Créer le dossier si nécessaire
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
});

const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('SQLite connecté: '+dbPath);
    return true;
  } catch (e) {
    console.error('Connexion SQLite échouée:', e.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };
