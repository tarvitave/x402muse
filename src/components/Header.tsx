'use client';

import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';
import { MuseWalletName } from '@/lib/wallet/MuseWalletAdapter';
import { useWalletUIStore } from '@/lib/wallet/walletStore';

const WalletMultiButton = dynamic(
  () => import('@solana/wallet-adapter-react-ui').then((mod) => mod.WalletMultiButton),
  { ssr: false }
);

export default function Header() {
  const { wallet, connected } = useWallet();
  const openModal = useWalletUIStore((s) => s.openModal);

  const isMuseWallet = wallet?.adapter?.name === MuseWalletName;

  return (
    <header className="flex justify-between items-center p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Muse x402</h1>
      <div className="flex items-center gap-2">
        {connected && isMuseWallet && (
          <button
            onClick={() => openModal('dashboard')}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-3 rounded-lg"
          >
            Manage
          </button>
        )}
        <WalletMultiButton />
      </div>
    </header>
  );
}
