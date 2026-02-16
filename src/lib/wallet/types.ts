export interface EncryptedWalletData {
  ciphertext: string;
  salt: string;
  iv: string;
  publicKey: string;
}

export type WalletModalView = 'choose' | 'create' | 'import' | 'backup' | 'unlock' | 'dashboard';

export interface TransactionRecord {
  signature: string;
  slot: number;
  blockTime: number | null;
  type: 'sent' | 'received' | 'unknown';
  amount: number;
  otherParty: string;
  success: boolean;
}
