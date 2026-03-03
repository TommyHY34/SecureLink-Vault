const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const routes = require('./routes');
const { startCleanupJob } = require('./utils/cleanup');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true, credentials: true, methods: ['GET','POST','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
app.options('*', cors());
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: false }));
app.use(rateLimit({ windowMs: 900000, max: parseInt(process.env.RATE_LIMIT_MAX)||200, standardHeaders: true, legacyHeaders: false }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use((req, res, next) => { console.log(new Date().toISOString()+' '+req.method+' '+req.path); next(); });

app.use('/api', routes);
app.get('/', (req, res) => res.json({ name: 'SecureVault API', status: 'running', health: '/api/health' }));
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));
app.use((err, req, res, next) => { console.error('Erreur:', err.message); res.status(err.status||500).json({ error: 'Erreur serveur', message: err.message }); });

const startServer = async () => {
  try {
    console.log('Démarrage SecureVault (SQLite)...');
    const dbOk = await testConnection();
    if (!dbOk) throw new Error('Connexion SQLite échouée');
    await sequelize.sync({ force: false });
    console.log('Tables SQLite synchronisées');
    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    await fs.mkdir(path.join(uploadDir, 'temp'), { recursive: true });
    console.log('Dossier uploads: '+uploadDir);
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('Backend: http://localhost:'+PORT);
      console.log('Health : http://localhost:'+PORT+'/api/health');
    });
    global.server = server;
    startCleanupJob();
    process.on('SIGINT', async () => { server.close(); await sequelize.close(); process.exit(0); });
    process.on('SIGTERM', async () => { server.close(); await sequelize.close(); process.exit(0); });
  } catch (e) {
    console.error('Erreur fatale:', e.message);
    process.exit(1);
  }
};

startServer();
module.exports = app;
