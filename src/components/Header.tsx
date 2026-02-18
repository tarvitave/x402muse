'use client';

import { useEffect, useState, useRef } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { MuseWalletName } from '@/lib/wallet/MuseWalletAdapter';
import { useWalletUIStore } from '@/lib/wallet/walletStore';

export default function Header() {
  const { wallets, wallet, connected, connecting, publicKey, disconnect, select, connect } = useWallet();
  const openModal = useWalletUIStore((s) => s.openModal);
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const isMuseWallet = wallet?.adapter?.name === MuseWalletName;

  // Auto-connect once wallet is selected and ready
  useEffect(() => {
    if (pendingConnect && wallet && !connected && !connecting) {
      setPendingConnect(false);
      connect().catch(() => {});
    }
  }, [pendingConnect, wallet, connected, connecting, connect]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Auto-cancel connecting after 30 seconds
  useEffect(() => {
    if (!connecting) return;
    const timeout = setTimeout(() => {
      localStorage.removeItem('walletName');
      disconnect();
      window.location.reload();
    }, 30_000);
    return () => clearTimeout(timeout);
  }, [connecting, disconnect]);

  function handleSelect(walletName: string) {
    setDropdownOpen(false);
    select(walletName as Parameters<typeof select>[0]);
    setPendingConnect(true);
  }

  function handleDisconnect() {
    setDropdownOpen(false);
    localStorage.removeItem('walletName');
    disconnect();
  }

  // Get available wallets (installed or our custom Muse Wallet)
  const availableWallets = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable ||
      w.adapter.name === MuseWalletName
  );

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  if (!mounted) return (
    <header className="flex justify-between items-center p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Muse x402</h1>
    </header>
  );

  return (
    <header className="flex justify-between items-center p-4 bg-gray-900 text-white">
      <h1 className="text-2xl font-bold">Muse x402</h1>
      <div className="flex items-center gap-2">
        {connecting && (
          <button
            onClick={() => { localStorage.removeItem('walletName'); disconnect(); window.location.reload(); }}
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

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            {connected ? (
              <>
                {wallet?.adapter?.icon && (
                  <img src={wallet.adapter.icon} alt="" className="w-5 h-5 rounded" />
                )}
                {shortAddress}
              </>
            ) : connecting ? (
              'Connecting...'
            ) : (
              'Select Wallet'
            )}
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
              {connected ? (
                <>
                  <div className="px-4 py-3 border-b border-gray-700">
                    <p className="text-xs text-gray-400">Connected with {wallet?.adapter?.name}</p>
                    <p className="text-sm font-mono text-purple-400">{shortAddress}</p>
                  </div>
                  <button
                    onClick={handleDisconnect}
                    className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-gray-700"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <>
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-xs text-gray-400">Choose a wallet</p>
                  </div>
                  {availableWallets.map((w) => (
                    <button
                      key={w.adapter.name}
                      onClick={() => handleSelect(w.adapter.name)}
                      className="w-full text-left px-4 py-3 text-sm hover:bg-gray-700 flex items-center gap-3"
                    >
                      <img src={w.adapter.icon} alt="" className="w-6 h-6 rounded" />
                      <span>{w.adapter.name}</span>
                    </button>
                  ))}
                  {availableWallets.length === 0 && (
                    <p className="px-4 py-3 text-sm text-gray-500">No wallets found</p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
