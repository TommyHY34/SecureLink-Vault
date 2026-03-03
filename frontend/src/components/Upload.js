import React, { useState, useRef } from 'react';
import axios from 'axios';
import { generateKey, exportKey, encryptFile, isWebCryptoSupported, formatFileSize } from '../utils/crypto';

export default function Upload() {
  const [status, setStatus] = useState('idle');
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [maxDownloads, setMaxDownloads] = useState(1);
  const [expiryHours, setExpiryHours] = useState(24);
  const [shareLink, setShareLink] = useState('');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const ref = useRef(null);

  const pick = f => { if(!f) return; setFile(f); setStatus('idle'); setError(''); setShareLink(''); setProgress(0); };
  const drop = e => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files[0]); };

  const upload = async () => {
    if (!file) return;
    if (!isWebCryptoSupported()) { setError('Navigateur non compatible. Utilisez Chrome, Firefox ou Edge.'); setStatus('error'); return; }
    try {
      setStatus('encrypting'); setProgress(5);
      const key = await generateKey();
      const ek = await exportKey(key);
      setProgress(20);
      const blob = await encryptFile(file, key);
      setProgress(55); setStatus('uploading');
      const fd = new FormData();
      fd.append('file', blob, file.name+'.enc');
      fd.append('maxDownloads', maxDownloads);
      fd.append('expiryHours', expiryHours);
      const r = await axios.post('/api/upload', fd, { headers:{'Content-Type':'multipart/form-data'}, onUploadProgress: e => { if(e.total) setProgress(55+Math.round(e.loaded/e.total*40)); } });
      setProgress(100);
      setShareLink(window.location.origin+'/download/'+r.data.id+'#'+ek);
      setStatus('success');
    } catch(e) {
      console.error(e);
      setError(e.response?.data?.message||e.response?.data?.error||e.message||'Erreur inconnue');
      setStatus('error');
    }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(shareLink); }
    catch { const t=document.createElement('textarea'); t.value=shareLink; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); }
    alert('Lien copié !');
  };

  const reset = () => { setStatus('idle'); setFile(null); setShareLink(''); setError(''); setProgress(0); if(ref.current) ref.current.value=''; };
  const loading = status==='encrypting'||status==='uploading';

  if (status==='success') return (
    <div className="sv-card">
      <div className="success-icon">✅</div>
      <p className="success-title">Fichier partagé avec succès !</p>
      <p className="success-desc">La clé de déchiffrement est dans le fragment <code>#</code> — jamais transmise au serveur.</p>
      <div className="link-box">{shareLink}</div>
      <div className="btn-row">
        <button className="btn btn-primary" onClick={copy}>📋 Copier le lien</button>
        <button className="btn btn-secondary" onClick={reset}>↩️ Nouveau fichier</button>
      </div>
      <div className="security-badge">🔐 Zero-knowledge · AES-256-GCM · Éphémère</div>
    </div>
  );

  return (
    <div className="sv-card">
      <h2>📤 Partager un fichier</h2>
      <div className={`dropzone ${file?'has-file':''} ${dragOver?'drag-over':''}`}
        onDrop={drop} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
        onClick={()=>!loading&&ref.current?.click()}>
        <div className="dropzone-icon">{file?'✅':'📂'}</div>
        {file ? <><p className="file-name">{file.name}</p><p className="file-size">{formatFileSize(file.size)}</p></>
          : <p>Glissez un fichier ou <span className="highlight">cliquez pour parcourir</span></p>}
        <input ref={ref} type="file" style={{display:'none'}} onChange={e=>pick(e.target.files[0])} />
      </div>
      <div className="options-row">
        <div className="option-group">
          <label>📥 Téléchargements max</label>
          <select value={maxDownloads} onChange={e=>setMaxDownloads(+e.target.value)} disabled={loading}>
            <option value={1}>1 fois</option><option value={3}>3 fois</option><option value={5}>5 fois</option><option value={10}>10 fois</option>
          </select>
        </div>
        <div className="option-group">
          <label>⏱️ Expiration</label>
          <select value={expiryHours} onChange={e=>setExpiryHours(+e.target.value)} disabled={loading}>
            <option value={1}>1 heure</option><option value={6}>6 heures</option><option value={24}>24 heures</option><option value={72}>3 jours</option><option value={168}>7 jours</option>
          </select>
        </div>
      </div>
      {loading && <div className="progress-wrap">
        <p className="progress-label">{status==='encrypting'?'🔐 Chiffrement AES-256-GCM...':'⬆️ Upload en cours...'}</p>
        <div className="progress-bar-bg"><div className="progress-bar-fill" style={{width:progress+'%'}} /></div>
      </div>}
      {status==='error' && <div className="alert alert-error">❌ {error}</div>}
      <button className="btn btn-primary" onClick={upload} disabled={!file||loading}>
        {loading?'⏳ Traitement...':'🔐 Chiffrer & Partager'}
      </button>
      <div className="security-badge" style={{marginTop:'1.2rem'}}>🔐 AES-256-GCM · Zero-knowledge · Clé jamais transmise</div>
    </div>
  );
}
