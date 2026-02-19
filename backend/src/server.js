const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
require('dotenv').config();

const { sequelize, testConnection } = require('./config/database');
const routes = require('./routes');
const { startCleanupJob } = require('./utils/cleanup');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────────────────────────────
// En local : le proxy React (port 3000) fait les appels, donc origin = undefined
// On autorise tout en développement pour simplifier.
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('*', cors());

// ─── SECURITY HEADERS ────────────────────────────────────────────────────────
const helmet = require('helmet');
app.use(helmet({
  contentSecurityPolicy: false, // Désactivé en dev
  crossOriginResourcePolicy: false
}));

// ─── RATE LIMITING ───────────────────────────────────────────────────────────
const rateLimit = require('express-rate-limit');
const globalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' }
});
app.use(globalLimiter);

// ─── BODY PARSER ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── LOGGER DEV ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── ROUTES ──────────────────────────────────────────────────────────────────
app.use('/api', routes);

app.get('/', (req, res) => {
  res.json({ name: 'SecureVault API', status: 'running', health: '/api/health' });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

// ─── ERREURS GLOBALES ────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Erreur:', err.message);
  res.status(err.status || 500).json({
    error: 'Erreur serveur',
    message: err.message
  });
});

// ─── DÉMARRAGE ───────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    console.log('🚀 Démarrage SecureVault...');

    const dbOk = await testConnection();
    if (!dbOk) throw new Error('Connexion base de données échouée');

    await sequelize.sync({ alter: false });
    console.log('✅ Modèles synchronisés');

    const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');
    await fs.mkdir(path.join(uploadDir, 'temp'), { recursive: true });
    console.log(`✅ Dossier uploads: ${uploadDir}`);

    const server = app.listen(PORT, 'localhost', () => {
      console.log(`\n✅ Backend démarré : http://localhost:${PORT}`);
      console.log(`❤️  Health check   : http://localhost:${PORT}/api/health\n`);
    });

    global.server = server;
    startCleanupJob();

    process.on('SIGINT', async () => {
      console.log('\n🛑 Arrêt...');
      server.close();
      await sequelize.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erreur fatale:', error.message);
    process.exit(1);
  }
};

startServer();
module.exports = app;
