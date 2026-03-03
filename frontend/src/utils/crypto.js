export const isWebCryptoSupported = () => !!(window.crypto && window.crypto.subtle);

export const generateKey = () => window.crypto.subtle.generateKey({ name:'AES-GCM', length:256 }, true, ['encrypt','decrypt']);

const toB64url = buf => { const b=new Uint8Array(buf); let s=''; for(let i=0;i<b.length;i++) s+=String.fromCharCode(b[i]); return window.btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,''); };
const fromB64url = str => { const b64=str.replace(/-/g,'+').replace(/_/g,'/').padEnd(str.length+(4-str.length%4)%4,'='); const bin=window.atob(b64); const buf=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) buf[i]=bin.charCodeAt(i); return buf.buffer; };

export const exportKey = async key => toB64url(await window.crypto.subtle.exportKey('raw',key));
export const importKey = str => window.crypto.subtle.importKey('raw', fromB64url(str), 'AES-GCM', true, ['encrypt','decrypt']);

export const encryptFile = async (file, key) => {
  const data = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const enc = await window.crypto.subtle.encrypt({ name:'AES-GCM', iv, tagLength:128 }, key, data);
  const out = new Uint8Array(12+enc.byteLength);
  out.set(iv,0); out.set(new Uint8Array(enc),12);
  return new Blob([out], { type:'application/octet-stream' });
};

export const decryptFile = async (blob, key) => {
  const v = new Uint8Array(await blob.arrayBuffer());
  const dec = await window.crypto.subtle.decrypt({ name:'AES-GCM', iv:v.slice(0,12), tagLength:128 }, key, v.slice(12));
  return new Blob([dec]);
};

export const formatFileSize = b => { if(!b) return '0 B'; const k=1024, s=['B','KB','MB','GB'], i=Math.floor(Math.log(b)/Math.log(k)); return (b/Math.pow(k,i)).toFixed(2)+' '+s[i]; };
