# 🔐 SecureVault — Déploiement Local

> Partage de fichiers éphémères chiffrés · AES-256-GCM · Zero-knowledge

---

## ⚡ Lancement rapide (3 étapes)

### Étape 1 — PostgreSQL

```bash
# Ouvrir psql en admin
sudo -u postgres psql

# Créer l'utilisateur et la base
CREATE USER securevault_user WITH PASSWORD 'Sv@Secure2026!';
CREATE DATABASE securevault OWNER securevault_user;
GRANT ALL PRIVILEGES ON DATABASE securevault TO securevault_user;
\q

# Initialiser le schéma
cd backend
psql -U securevault_user -d securevault -f sql/schema.sql
```

### Étape 2 — Backend (Terminal 1)

```bash
cd backend
npm install
npm run dev
```

✅ Backend : http://localhost:3001  
✅ Health : http://localhost:3001/api/health

### Étape 3 — Frontend (Terminal 2)

```bash
cd frontend
npm install
npm start
```

✅ Application : **http://localhost:3000**

---

## 🔑 Mots de passe

Voir le fichier **PASSWORDS.txt** (jamais committé sur Git).

| Élément | Valeur |
|---|---|
| DB utilisateur | `securevault_user` |
| DB mot de passe | `Sv@Secure2026!` |
| DB nom | `securevault` |
| Backend port | `3001` |
| Frontend port | `3000` |

---

## 🔒 Architecture de sécurité

```
Navigateur                    Backend (localhost:3001)
─────────────────────         ──────────────────────
1. Génère clé AES-256         
2. Chiffre le fichier         
3. Upload fichier.enc ──────► Stocke fichier.enc (chiffré)
4. Lien: /download/ID#CLÉ    
                              
Destinataire ouvre le lien
5. Récupère fichier.enc ◄──── Envoie fichier.enc
6. Déchiffre avec #CLÉ        
7. Sauvegarde fichier         

La clé (#fragment) ne voyage JAMAIS vers le serveur.
```

---

## 📁 Structure du projet

```
SecureVault-Local/
├── PASSWORDS.txt               ← 🔑 Credentials (dans .gitignore)
├── README.md
├── .gitignore
├── backend/
│   ├── .env                    ← Config locale (dans .gitignore)
│   ├── package.json
│   ├── sql/schema.sql
│   ├── uploads/                ← Fichiers chiffrés (auto-créé)
│   └── src/
│       ├── server.js
│       ├── config/database.js
│       ├── controllers/
│       │   ├── uploadController.js
│       │   └── downloadController.js
│       ├── models/File.js
│       ├── routes/index.js
│       └── utils/cleanup.js
└── frontend/
    ├── .env                    ← Vide en local
    ├── package.json            ← "proxy": "http://localhost:3001" ✅
    └── src/
        ├── App.js              ← Routing React Router
        ├── index.js
        ├── components/
        │   ├── Upload.js       ← Chiffrement + upload
        │   └── Download.js     ← Téléchargement + déchiffrement
        ├── utils/crypto.js     ← AES-256-GCM Web Crypto API
        └── styles/App.css
```

---

## 🐛 Dépannage

**Erreur connexion DB** → Vérifiez que PostgreSQL tourne :
```bash
sudo systemctl status postgresql
sudo systemctl start postgresql
```

**Port déjà utilisé** → Changez `PORT=3001` dans `backend/.env`

**Erreur "Cannot find module"** → Relancez `npm install` dans le dossier concerné

**Network Error à l'upload** → Vérifiez que le backend tourne (Terminal 1)

---

## ❌ Pourquoi ça ne marchait pas sur GitHub Codespaces

Le `frontend/.env` pointait vers une URL Codespaces expirée :
```
REACT_APP_API_URL=https://upgraded-succotash-69wpp-3001.app.github.dev
```

En local, on utilise le **proxy React** (`"proxy": "http://localhost:3001"` dans `package.json`).
Le frontend appelle simplement `/api/upload` et React Dev Server redirige vers le backend.
**Aucun problème CORS possible avec cette approche.**
