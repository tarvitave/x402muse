import nacl from 'tweetnacl';

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(base64: string): Uint8Array {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/**
 * Derive a 32-byte encryption key from password + salt using
 * iterative SHA-512 hashing (tweetnacl's nacl.hash).
 * Works over HTTP — no Web Crypto API needed.
 */
function deriveKey(password: string, salt: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const passwordBytes = encoder.encode(password);

  // Combine password + salt
  const combined = new Uint8Array(passwordBytes.length + salt.length);
  combined.set(passwordBytes);
  combined.set(salt, passwordBytes.length);

  // Iterative hashing for key stretching (1000 rounds of SHA-512)
  let hash = nacl.hash(combined);
  for (let i = 0; i < 999; i++) {
    hash = nacl.hash(hash);
  }

  // Take first 32 bytes as the secretbox key
  return hash.slice(0, nacl.secretbox.keyLength);
}

export async function encryptSecretKey(
  secretKey: Uint8Array,
  password: string
): Promise<{ ciphertext: string; salt: string; iv: string }> {
  const salt = nacl.randomBytes(16);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const key = deriveKey(password, salt);

  const ciphertext = nacl.secretbox(secretKey, nonce, key);
  if (!ciphertext) throw new Error('Encryption failed');

  return {
    ciphertext: toBase64(ciphertext),
    salt: toBase64(salt),
    iv: toBase64(nonce),
  };
}

export async function decryptSecretKey(
  encrypted: { ciphertext: string; salt: string; iv: string },
  password: string
): Promise<Uint8Array> {
  const salt = fromBase64(encrypted.salt);
  const nonce = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);
  const key = deriveKey(password, salt);

  const decrypted = nacl.secretbox.open(ciphertext, nonce, key);
  if (!decrypted) throw new Error('Decryption failed — wrong password');

  return decrypted;
}
