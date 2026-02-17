'use client';

import { FC, useMemo, useState, useEffect } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import { MuseWalletAdapter } from '@/lib/wallet/MuseWalletAdapter';
import MuseWalletModal from '@/components/wallet/MuseWalletModal';

import '@solana/wallet-adapter-react-ui/styles.css';

const SolanaProvider: FC<{ children: React.ReactNode }> = ({ children }) => {
  const network = (process.env.NEXT_PUBLIC_SOLANA_NETWORK as WalletAdapterNetwork) || WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  // Phantom and Solflare auto-register via Wallet Standard — only custom wallets go here
  const wallets = useMemo(() => [new MuseWalletAdapter()], []);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug: verify adapter is being created
  useEffect(() => {
    if (mounted) {
      console.log('[SolanaProvider] adapters:', wallets.map(w => ({ name: w.name, readyState: w.readyState })));
    }
  }, [mounted, wallets]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets}>
        <WalletModalProvider>
          <MuseWalletModal />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export default SolanaProvider;
