'use client';

import { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { MuseWalletName } from '@/lib/wallet/MuseWalletAdapter';
import { useWalletUIStore } from '@/lib/wallet/walletStore';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Header() {
  const { wallet, connected, connecting, disconnect, select } = useWallet();
  const openModal = useWalletUIStore((s) => s.openModal);

  const isMuseWallet = wallet?.adapter?.name === MuseWalletName;

  // Auto-cancel connecting after 30 seconds
  useEffect(() => {
    if (!connecting) return;
    const timeout = setTimeout(() => {
      console.log('[Header] Connection timed out after 30s, auto-cancelling');
      localStorage.removeItem('walletName');
      disconnect();
      window.location.reload();
    }, 30_000);
    return () => clearTimeout(timeout);
  }, [connecting, disconnect]);

  function handleCancelConnect() {
    localStorage.removeItem('walletName');
    disconnect();
    window.location.reload();
  }

  function handleMuseWalletClick() {
    select(MuseWalletName);
  }

  return (
    <header className="flex justify-between items-center p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Muse x402</h1>
      <div className="flex items-center gap-2">
        {connecting && (
          <button
            onClick={handleCancelConnect}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-semibold py-2 px-3 rounded-lg"
          >
            Cancel
          </button>
        )}
        {connected && isMuseWallet && (
          <button
            onClick={() => openModal('dashboard')}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-3 rounded-lg"
          >
            Manage
          </button>
        )}
        {!connected && !connecting && (
          <button
            onClick={handleMuseWalletClick}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-3 rounded-lg"
          >
            Muse Wallet
          </button>
        )}
        <WalletMultiButton />
      </div>
    </header>
  );
}
