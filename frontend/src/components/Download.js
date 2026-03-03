import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { importKey, decryptFile, isWebCryptoSupported, formatFileSize } from '../utils/crypto';

export default function Download() {
  const { id } = useParams();
  const [status, setStatus] = useState('loading');
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const init = async () => {
      if (!window.location.hash.slice(1)) { setError('Lien invalide : clé absente.'); setStatus('error'); return; }
      try { const r = await axios.get('/api/file/'+id+'/info'); setInfo(r.data); setStatus('ready'); }
      catch(e) {
        const c = e.response?.status;
        if (c===404) { setError('Fichier inexistant ou supprimé.'); setStatus('expired'); }
        else if (c===410) { setError(e.response?.data?.error||'Fichier expiré.'); setStatus('expired'); }
        else { setError('Impossible de contacter le serveur.'); setStatus('error'); }
      }
    };
    init();
  }, [id]);

  const download = async () => {
    if (!isWebCryptoSupported()) { setError('Navigateur non compatible.'); setStatus('error'); return; }
    setStatus('downloading'); setProgress(5);
    try {
      const key = await importKey(window.location.hash.slice(1));
      setProgress(15);
      const r = await axios.get('/api/download/'+id, { responseType:'blob', onDownloadProgress: e => { if(e.total) setProgress(15+Math.round(e.loaded/e.total*65)); } });
      setProgress(80);
      const dec = await decryptFile(r.data, key);
      setProgress(96);
      let name = info?.originalFilename||'fichier';
      if (name.endsWith('.enc')) name=name.slice(0,-4);
      const url = URL.createObjectURL(dec);
      const a = document.createElement('a'); a.href=url; a.download=name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setProgress(100); setStatus('success');
    } catch(e) {
      console.error(e);
      if (e.response?.status===410) { setError('Fichier expiré ou limite atteinte.'); setStatus('expired'); return; }
      setError(e.name==='OperationError'?'Clé invalide — lien incomplet.':e.response?.data?.error||e.message||'Erreur');
      setStatus('error');
    }
  };

  if (status==='loading') return <div className="sv-card text-center"><p style={{fontSize:'2rem',margin:'2rem 0'}}>⏳</p><p style={{color:'#666'}}>Vérification...</p></div>;
  if (status==='expired') return (
    <div className="sv-card text-center">
      <p style={{fontSize:'3rem',margin:'1rem 0'}}>⏰</p>
      <h3 style={{color:'#dc2626',marginBottom:'.75rem'}}>Fichier indisponible</h3>
      <p style={{color:'#666',marginBottom:'1.5rem'}}>{error}</p>
      <a href="/" style={{display:'inline-block',padding:'.8rem 2rem',background:'linear-gradient(135deg,#667eea,#764ba2)',color:'white',borderRadius:'10px',textDecoration:'none',fontWeight:'bold'}}>← Partager un fichier</a>
    </div>
  );
  if (status==='success') return (
    <div className="sv-card">
      <div className="success-icon">✅</div>
      <p className="success-title">Déchiffré et téléchargé !</p>
      <p className="success-desc">Déchiffrement 100% local. Aucune donnée déchiffrée n'a transité par le serveur.</p>
      <div className="security-badge green">🔐 AES-256-GCM · Zero-knowledge · Local</div>
      <div className="mt-2"><a href="/" style={{display:'block',textAlign:'center',padding:'.8rem',background:'#f3f4f6',borderRadius:'10px',textDecoration:'none',color:'#374151',fontWeight:'bold'}}>← Partager un fichier</a></div>
    </div>
  );

  return (
    <div className="sv-card">
      <h2>📥 Télécharger un fichier</h2>
      {info && <div className="info-box">
        <div className="info-row"><span className="info-label">📄 Fichier</span><span className="info-value">{info.originalFilename?.replace(/\.enc$/,'')}</span></div>
        <div className="info-row"><span className="info-label">📦 Taille</span><span className="info-value">{formatFileSize(info.fileSize)}</span></div>
        <div className="info-row"><span className="info-label">📥 Restants</span><span className="info-value">{info.remainingDownloads}</span></div>
        <div className="info-row"><span className="info-label">⏱️ Expire</span><span className="info-value">{new Date(info.expiresAt).toLocaleString('fr-FR')}</span></div>
      </div>}
      {status==='downloading' && <div className="progress-wrap">
        <p className="progress-label">{progress<80?'⬇️ Téléchargement...':'🔓 Déchiffrement AES-256-GCM...'}</p>
        <div className="progress-bar-bg"><div className="progress-bar-fill green" style={{width:progress+'%'}} /></div>
      </div>}
      {status==='error' && <div className="alert alert-error">❌ {error}</div>}
      {(status==='ready'||status==='error') && <button className="btn btn-success" onClick={download}>🔓 Télécharger & Déchiffrer</button>}
      <div className="security-badge green" style={{marginTop:'1.2rem'}}>🔐 Déchiffrement local · Clé jamais transmise au serveur</div>
    </div>
  );
}
