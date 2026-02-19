import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Upload from './components/Upload';
import Download from './components/Download';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <div className="logo">🔐</div>
          <h1>SecureVault</h1>
          <p className="tagline">Partage de fichiers éphémères chiffrés</p>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/download/:id" element={<Download />} />
          </Routes>
        </main>

        <footer className="App-footer">
          <p>Mastère 1 Expert Cybersécurité · Février 2026</p>
          <p>AES-256-GCM · Zero-knowledge · Éphémère</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
