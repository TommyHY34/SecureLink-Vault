import React, { useState, useRef } from 'react';
import axios from 'axios';
import { generateKey, exportKey, encryptFile, isWebCryptoSupported, formatFileSize } from '../utils/crypto';

const Upload = () => {
  const [status, setStatus] = useState('idle'); // idle | encrypting | uploading | success | error
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);
  const [shareLink, setShareLink] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const selectFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setStatus('idle');
    setErrorMessage('');
    setShareLink('');
    setProgress(0);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    selectFile(e.dataTransfer.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    if (!isWebCryptoSupported()) {
      setErrorMessage('Votre navigateur ne supporte pas le chiffrement. Utilisez Chrome, Firefox ou Edge.');
      setStatus('error');
      return;
    }

    try {
      // 1. Génération de la clé AES-256
      setStatus('encrypting');
      setProgress(5);
      const key = await generateKey();
      const exportedKey = await exportKey(key);

      // 2. Chiffrement AES-256-GCM côté client
      setProgress(20);
      const encryptedBlob = await encryptFile(selectedFile, key);
      setProgress(55);

      // 3. Upload vers le backend
      setStatus('uploading');
      const formData = new FormData();
      formData.append('file', encryptedBlob, selectedFile.name + '.enc');
      formData.append('maxDownloads', maxDownloads);
      formData.append('expiryHours', expiryHours);

      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            setProgress(55 + Math.round((e.loaded / e.total) * 40));
          }
        }
      });

      setProgress(100);

      // 4. Construire le lien — la clé est dans le fragment # (jamais envoyé au serveur)
      const fileId = response.data.id;
      const link = `${window.location.origin}/download/${fileId}#${exportedKey}`;
      setShareLink(link);
      setStatus('success');

    } catch (err) {
      console.error('Erreur upload:', err);
      let msg = 'Erreur inconnue';
      if (err.response?.data?.message) msg = err.response.data.message;
      else if (err.response?.data?.error) msg = err.response.data.error;
      else if (err.message) msg = err.message;
      setErrorMessage(msg);
      setStatus('error');
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    alert('✅ Lien copié dans le presse-papiers !');
  };

  const reset = () => {
    setStatus('idle');
    setSelectedFile(null);
    setShareLink('');
    setErrorMessage('');
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isLoading = status === 'encrypting' || status === 'uploading';

  if (status === 'success') {
    return (
      <div className="sv-card">
        <div className="success-icon">✅</div>
        <p className="success-title">Fichier partagé avec succès !</p>
        <p className="success-desc">
          Envoyez ce lien au destinataire. La clé de déchiffrement est intégrée dans le
          fragment <code>#</code> — elle n'est <strong>jamais transmise au serveur</strong>.
        </p>
        <div className="link-box">{shareLink}</div>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={copyLink}>
            📋 Copier le lien
          </button>
          <button className="btn btn-secondary" onClick={reset}>
            ↩️ Nouveau fichier
          </button>
        </div>
        <div className="security-badge">
          🔐 <strong>Zero-knowledge</strong> · Chiffrement AES-256-GCM · Éphémère
        </div>
      </div>
    );
  }

  return (
    <div className="sv-card">
      <h2>📤 Partager un fichier</h2>

      {/* Zone de dépôt */}
      <div
        className={`dropzone ${selectedFile ? 'has-file' : ''} ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <div className="dropzone-icon">
          {selectedFile ? '✅' : '📂'}
        </div>
        {selectedFile ? (
          <>
            <p className="file-name">{selectedFile.name}</p>
            <p className="file-size">{formatFileSize(selectedFile.size)}</p>
          </>
        ) : (
          <p>
            Glissez un fichier ici ou{' '}
            <span className="highlight">cliquez pour parcourir</span>
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={(e) => selectFile(e.target.files[0])}
        />
      </div>

      {/* Options */}
      <div className="options-row">
        <div className="option-group">
          <label>📥 Téléchargements max</label>
          <select value={maxDownloads} onChange={(e) => setMaxDownloads(+e.target.value)} disabled={isLoading}>
            <option value={1}>1 fois</option>
            <option value={3}>3 fois</option>
            <option value={5}>5 fois</option>
            <option value={10}>10 fois</option>
          </select>
        </div>
        <div className="option-group">
          <label>⏱️ Expiration</label>
          <select value={expiryHours} onChange={(e) => setExpiryHours(+e.target.value)} disabled={isLoading}>
            <option value={1}>1 heure</option>
            <option value={6}>6 heures</option>
            <option value={24}>24 heures</option>
            <option value={72}>3 jours</option>
            <option value={168}>7 jours</option>
          </select>
        </div>
      </div>

      {/* Progression */}
      {isLoading && (
        <div className="progress-wrap">
          <p className="progress-label">
            {status === 'encrypting' ? '🔐 Chiffrement AES-256-GCM en cours...' : '⬆️ Upload en cours...'}
          </p>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Erreur */}
      {status === 'error' && (
        <div className="alert alert-error">
          ❌ {errorMessage}
        </div>
      )}

      {/* Bouton */}
      <button
        className="btn btn-primary"
        onClick={handleUpload}
        disabled={!selectedFile || isLoading}
      >
        {isLoading ? '⏳ Traitement en cours...' : '🔐 Chiffrer & Partager'}
      </button>

      <div className="security-badge" style={{ marginTop: '1.2rem' }}>
        🔐 <strong>Sécurité :</strong> AES-256-GCM · Zero-knowledge · Clé jamais transmise
      </div>
    </div>
  );
};

export default Upload;
