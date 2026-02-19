/**
 * Module de chiffrement AES-256-GCM
 * Utilise l'API Web Crypto native du navigateur
 */

export const isWebCryptoSupported = () =>
  !!(window.crypto && window.crypto.subtle);

export const generateKey = async () => {
  const key = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  return key;
};

export const exportKey = async (key) => {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64url(raw);
};

export const importKey = async (base64urlKey) => {
  const keyData = base64urlToArrayBuffer(base64urlKey);
  return window.crypto.subtle.importKey('raw', keyData, 'AES-GCM', true, ['encrypt', 'decrypt']);
};

export const encryptFile = async (file, key) => {
  const fileData = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    fileData
  );

  // Format: [12 bytes IV][encrypted data]
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), 12);

  return new Blob([combined], { type: 'application/octet-stream' });
};

export const decryptFile = async (encryptedBlob, key) => {
  const data = await encryptedBlob.arrayBuffer();
  const view = new Uint8Array(data);

  const iv = view.slice(0, 12);
  const ciphertext = view.slice(12);

  const decrypted = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv, tagLength: 128 },
    key,
    ciphertext
  );

  return new Blob([decrypted]);
};

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
};

// ─── Helpers base64url (URL-safe, sans padding) ───────────────────────────
const arrayBufferToBase64url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

const base64urlToArrayBuffer = (base64url) => {
  // Rétablir le base64 standard
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
  const binary = window.atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};
