import { Buffer } from 'buffer';
if (typeof globalThis.Buffer === 'undefined') {
  (globalThis as Record<string, unknown>).Buffer = Buffer;
}

import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair } from '@solana/web3.js';
import nacl from 'tweetnacl';
import { encryptSecretKey, decryptSecretKey } from './crypto';
import type { EncryptedWalletData } from './types';

const STORAGE_KEY = 'muse_wallet_encrypted';
const SOLANA_DERIVATION_PATH = "m/44'/501'/0'/0'";

export function generateMnemonic(): string {
  return bip39.generateMnemonic(128);
}

export function validateMnemonic(mnemonic: string): boolean {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function deriveKeypair(mnemonic: string): Keypair {
  const seed = bip39.mnemonicToSeedSync(mnemonic.trim().toLowerCase());
  const seedBytes = new Uint8Array(seed);
  const derived = derivePath(SOLANA_DERIVATION_PATH, toHex(seedBytes));
  const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(derived.key));
  return Keypair.fromSecretKey(keyPair.secretKey);
}

export async function createAndSaveWallet(
  mnemonic: string,
  password: string
): Promise<Keypair> {
  const keypair = deriveKeypair(mnemonic);
  const encrypted = await encryptSecretKey(keypair.secretKey, password);
  const data: EncryptedWalletData = {
    ...encrypted,
    publicKey: keypair.publicKey.toBase58(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return keypair;
}

export async function unlockWallet(password: string): Promise<Keypair> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) throw new Error('No wallet found');
  const data: EncryptedWalletData = JSON.parse(stored);
  const secretKey = await decryptSecretKey(data, password);
  return Keypair.fromSecretKey(secretKey);
}

export function hasExistingWallet(): boolean {
  return typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY) !== null;
}

export function getStoredPublicKey(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return null;
  return (JSON.parse(stored) as EncryptedWalletData).publicKey;
}

export function deleteWallet(): void {
  localStorage.removeItem(STORAGE_KEY);
}
