'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletUIStore } from '@/lib/wallet/walletStore';
import { MuseWalletAdapter, MuseWalletName } from '@/lib/wallet/MuseWalletAdapter';
import {
  generateMnemonic,
  validateMnemonic,
  createAndSaveWallet,
  unlockWallet,
  hasExistingWallet,
  getStoredPublicKey,
  deleteWallet,
} from '@/lib/wallet/keyManager';
import SeedPhraseDisplay from './SeedPhraseDisplay';
import PasswordInput from './PasswordInput';
import BalanceDisplay from './BalanceDisplay';
import TransactionHistory from './TransactionHistory';
import FiatOnRamp from './FiatOnRamp';

export default function MuseWalletModal() {
  const { wallet, wallets, publicKey, disconnect } = useWallet();

  // Debug: log all wallets visible to the modal
  useEffect(() => {
    console.log('[MuseWalletModal] all wallets from useWallet():', wallets.map(w => ({
      name: w.adapter.name,
      readyState: w.readyState,
    })));
  }, [wallets]);
  const { isModalOpen, modalView, mnemonic, openModal, closeModal, setView, setMnemonic } =
    useWalletUIStore();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [importPhrase, setImportPhrase] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [backupConfirmed, setBackupConfirmed] = useState(false);

  const adapter = wallet?.adapter?.name === MuseWalletName
    ? (wallet.adapter as MuseWalletAdapter)
    : null;

  // Listen for connect requests from the adapter
  useEffect(() => {
    const handler = () => {
      if (hasExistingWallet()) {
        openModal('unlock');
      } else {
        openModal('choose');
      }
    };
    window.addEventListener('muse-wallet-connect-request', handler);
    return () => window.removeEventListener('muse-wallet-connect-request', handler);
  }, [openModal]);

  function resetState() {
    setPassword('');
    setConfirmPassword('');
    setImportPhrase('');
    setError('');
    setLoading(false);
    setBackupConfirmed(false);
  }

  function handleClose() {
    adapter?.cancelConnect();
    resetState();
    closeModal();
  }

  async function handleCreate() {
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const phrase = generateMnemonic();
      setMnemonic(phrase);
      await createAndSaveWallet(phrase, password);
      setView('backup');
    } catch (err) {
      console.error('[MuseWallet] Failed to create wallet:', err);
      setError('Failed to create wallet: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setLoading(false);
    }
  }

  async function handleBackupConfirm() {
    if (!adapter) return;
    setLoading(true);
    try {
      const keypair = await unlockWallet(password);
      adapter.unlock(keypair);
      resetState();
      closeModal();
    } catch {
      setError('Failed to unlock wallet');
    } finally {
      setLoading(false);
    }
  }

  async function handleImport() {
    setError('');
    const trimmed = importPhrase.trim().toLowerCase();
    if (!validateMnemonic(trimmed)) {
      setError('Invalid seed phrase');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const keypair = await createAndSaveWallet(trimmed, password);
      if (adapter) {
        adapter.unlock(keypair);
      }
      resetState();
      closeModal();
    } catch {
      setError('Failed to import wallet');
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlock() {
    setError('');
    setLoading(true);
    try {
      const keypair = await unlockWallet(password);
      if (adapter) {
        adapter.unlock(keypair);
      }
      resetState();
      closeModal();
    } catch {
      setError('Wrong password');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteWallet() {
    if (!confirm('Are you sure? This will permanently delete your wallet from this browser. Make sure you have your seed phrase backed up.')) {
      return;
    }
    deleteWallet();
    await disconnect();
    resetState();
    closeModal();
  }

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={handleClose}>
      <div
        className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">
            {modalView === 'choose' && 'Muse Wallet'}
            {modalView === 'create' && 'Create Wallet'}
            {modalView === 'backup' && 'Back Up Seed Phrase'}
            {modalView === 'import' && 'Import Wallet'}
            {modalView === 'unlock' && 'Unlock Wallet'}
            {modalView === 'dashboard' && 'Wallet'}
            {modalView === 'onramp' && 'Add Funds'}
          </h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-xl">&times;</button>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        {/* Choose View */}
        {modalView === 'choose' && (
          <div className="space-y-3">
            <button
              onClick={() => { resetState(); setView('create'); }}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg"
            >
              Create New Wallet
            </button>
            <button
              onClick={() => { resetState(); setView('import'); }}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              Import Existing Wallet
            </button>
          </div>
        )}

        {/* Create View */}
        {modalView === 'create' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Set a password to encrypt your wallet.</p>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Password (min 8 characters)"
              showStrength
            />
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm password"
            />
            <button
              onClick={handleCreate}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              {loading ? 'Creating...' : 'Create Wallet'}
            </button>
            <button
              onClick={() => setView('choose')}
              className="w-full text-gray-400 hover:text-white text-sm"
            >
              Back
            </button>
          </div>
        )}

        {/* Backup View */}
        {modalView === 'backup' && mnemonic && (
          <div className="space-y-4">
            <p className="text-yellow-400 text-sm font-semibold">
              Write down these 12 words and store them safely. This is the only way to recover your wallet.
            </p>
            <SeedPhraseDisplay words={mnemonic.split(' ')} />
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={backupConfirmed}
                onChange={(e) => setBackupConfirmed(e.target.checked)}
                className="accent-purple-600"
              />
              I have saved my seed phrase in a safe place
            </label>
            <button
              onClick={handleBackupConfirm}
              disabled={!backupConfirmed || loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              {loading ? 'Finishing...' : 'Continue'}
            </button>
          </div>
        )}

        {/* Import View */}
        {modalView === 'import' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Enter your 12-word seed phrase.</p>
            <textarea
              value={importPhrase}
              onChange={(e) => setImportPhrase(e.target.value)}
              placeholder="word1 word2 word3 ..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white font-mono text-sm resize-none"
            />
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Set a password"
              showStrength
            />
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm password"
            />
            <button
              onClick={handleImport}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              {loading ? 'Importing...' : 'Import Wallet'}
            </button>
            <button
              onClick={() => setView('choose')}
              className="w-full text-gray-400 hover:text-white text-sm"
            >
              Back
            </button>
          </div>
        )}

        {/* Unlock View */}
        {modalView === 'unlock' && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Wallet: <span className="font-mono text-xs">{getStoredPublicKey()?.slice(0, 8)}...{getStoredPublicKey()?.slice(-4)}</span>
            </p>
            <PasswordInput
              value={password}
              onChange={setPassword}
              placeholder="Enter your password"
            />
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg"
            >
              {loading ? 'Unlocking...' : 'Unlock'}
            </button>
          </div>
        )}

        {/* Dashboard View */}
        {modalView === 'dashboard' && publicKey && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-3">
              <p className="text-gray-400 text-xs mb-1">Address</p>
              <button
                onClick={() => navigator.clipboard.writeText(publicKey.toBase58())}
                className="font-mono text-sm text-purple-400 hover:text-purple-300 break-all text-left"
                title="Click to copy"
              >
                {publicKey.toBase58()}
              </button>
            </div>

            <BalanceDisplay publicKey={publicKey} />

            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Recent Transactions</h3>
              <TransactionHistory publicKey={publicKey} />
            </div>

            <button
              onClick={() => setView('onramp')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Add Funds
            </button>
            <button
              onClick={handleDeleteWallet}
              className="w-full bg-red-600/20 hover:bg-red-600/30 text-red-400 text-sm py-2 px-4 rounded-lg"
            >
              Delete Wallet
            </button>
          </div>
        )}

        {/* On-Ramp View */}
        {modalView === 'onramp' && publicKey && (
          <FiatOnRamp publicKey={publicKey} />
        )}
      </div>
    </div>
  );
}
