import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { importKey, decryptFile, isWebCryptoSupported, formatFileSize } from '../utils/crypto';

const Download = () => {
  const { id } = useParams();
  const [status, setStatus] = useState('loading'); // loading | ready | downloading | success | error | expired
  const [fileInfo, setFileInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const init = async () => {
      // Vérifier la présence de la clé dans le fragment URL
      const keyFragment = window.location.hash.slice(1);
      if (!keyFragment) {
        setErrorMessage('Lien invalide : la clé de déchiffrement est absente du lien (#).');
        setStatus('error');
        return;
      }

      try {
        const response = await axios.get(`/api/file/${id}/info`);
        setFileInfo(response.data);
        setStatus('ready');
      } catch (err) {
        const code = err.response?.status;
        if (code === 404) {
          setErrorMessage('Ce fichier n\'existe pas ou a déjà été supprimé.');
          setStatus('expired');
        } else if (code === 410) {
          setErrorMessage(err.response?.data?.error || 'Ce fichier a expiré ou a atteint sa limite de téléchargements.');
          setStatus('expired');
        } else {
          setErrorMessage('Impossible de contacter le serveur.');
          setStatus('error');
        }
      }
    };

    init();
  }, [id]);

  const handleDownload = async () => {
    if (!isWebCryptoSupported()) {
      setErrorMessage('Votre navigateur ne supporte pas le déchiffrement.');
      setStatus('error');
      return;
    }

    setStatus('downloading');
    setProgress(5);

    try {
      // 1. Importer la clé depuis le fragment URL
      const keyFragment = window.location.hash.slice(1);
      const key = await importKey(keyFragment);
      setProgress(15);

      // 2. Télécharger le fichier chiffré
      const response = await axios.get(`/api/download/${id}`, {
        responseType: 'blob',
        onDownloadProgress: (e) => {
          if (e.total) setProgress(15 + Math.round((e.loaded / e.total) * 65));
        }
      });
      setProgress(80);

      // 3. Déchiffrer localement
      const decryptedBlob = await decryptFile(response.data, key);
      setProgress(96);

      // 4. Récupérer le nom original (sans l'extension .enc ajoutée à l'upload)
      let filename = fileInfo?.originalFilename || 'fichier_telecharge';
      if (filename.endsWith('.enc')) filename = filename.slice(0, -4);

      // 5. Déclencher le téléchargement navigateur
      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);

      setProgress(100);
      setStatus('success');

    } catch (err) {
      console.error('Erreur download/déchiffrement:', err);
      if (err.response?.status === 410) {
        setErrorMessage('Ce fichier a expiré ou a déjà été téléchargé.');
        setStatus('expired');
        return;
      }
      if (err.name === 'OperationError' || err.message?.includes('clé')) {
        setErrorMessage('Clé de déchiffrement invalide. Le lien est incomplet ou corrompu.');
      } else {
        setErrorMessage(err.response?.data?.error || err.message || 'Erreur inconnue.');
      }
      setStatus('error');
    }
  };

  // ─── Rendu selon l'état ──────────────────────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="sv-card text-center">
        <p style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</p>
        <p style={{ color: '#666' }}>Vérification du fichier...</p>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="sv-card text-center">
        <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏰</p>
        <h3 style={{ color: '#dc2626', marginBottom: '0.75rem' }}>Fichier indisponible</h3>
        <p style={{ color: '#666', marginBottom: '1.5rem' }}>{errorMessage}</p>
        <a href="/" className="btn btn-primary" style={{ display: 'inline-block', textDecoration: 'none', padding: '0.8rem 2rem', borderRadius: '10px', width: 'auto' }}>
          ← Partager un fichier
        </a>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="sv-card">
        <div className="success-icon">✅</div>
        <p className="success-title">Fichier déchiffré et téléchargé !</p>
        <p className="success-desc">
          Le déchiffrement a été effectué <strong>localement</strong> dans votre navigateur.
          Aucune donnée déchiffrée n'a transité par le serveur.
        </p>
        <div className="security-badge green">
          🔐 Déchiffrement 100% local · AES-256-GCM · Zero-knowledge
        </div>
        <div className="mt-2">
          <a href="/" className="btn btn-secondary" style={{ display: 'block', textDecoration: 'none', textAlign: 'center', padding: '0.8rem', borderRadius: '10px' }}>
            ← Partager un fichier
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="sv-card">
      <h2>📥 Télécharger un fichier</h2>

      {/* Infos fichier */}
      {fileInfo && (
        <div className="info-box">
          <div className="info-row">
            <span className="info-label">📄 Fichier</span>
            <span className="info-value">
              {fileInfo.originalFilename?.endsWith('.enc')
                ? fileInfo.originalFilename.slice(0, -4)
                : fileInfo.originalFilename}
            </span>
          </div>
          <div className="info-row">
            <span className="info-label">📦 Taille</span>
            <span className="info-value">{formatFileSize(fileInfo.fileSize)}</span>
          </div>
          <div className="info-row">
            <span className="info-label">📥 Téléchargements restants</span>
            <span className="info-value">{fileInfo.remainingDownloads}</span>
          </div>
          <div className="info-row">
            <span className="info-label">⏱️ Expire le</span>
            <span className="info-value">{new Date(fileInfo.expiresAt).toLocaleString('fr-FR')}</span>
          </div>
        </div>
      )}

      {/* Progression */}
      {status === 'downloading' && (
        <div className="progress-wrap">
          <p className="progress-label">
            {progress < 80 ? '⬇️ Téléchargement...' : '🔓 Déchiffrement AES-256-GCM...'}
          </p>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill green" style={{ width: `${progress}%` }} />
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
      {(status === 'ready' || status === 'error') && (
        <button
          className="btn btn-success"
          onClick={handleDownload}
        >
          🔓 Télécharger & Déchiffrer
        </button>
      )}

      <div className="security-badge green" style={{ marginTop: '1.2rem' }}>
        🔐 <strong>Sécurité :</strong> Déchiffrement local dans votre navigateur · Clé jamais transmise
      </div>
    </div>
  );
};

export default Download;
