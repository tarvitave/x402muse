'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { MuseWalletName } from '@/lib/wallet/MuseWalletAdapter';
import { useWalletUIStore } from '@/lib/wallet/walletStore';
import UserProfileModal from './UserProfileModal';

function MuseLogo() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Palette body */}
      <ellipse cx="18" cy="19" rx="14" ry="13" fill="#1e1b4b" stroke="#7c3aed" strokeWidth="1.5"/>
      {/* Thumb hole */}
      <ellipse cx="24" cy="28" rx="4" ry="3.5" fill="#111827" stroke="#7c3aed" strokeWidth="1.2"/>
      {/* Paint dots */}
      <circle cx="11" cy="14" r="2.8" fill="#f59e0b"/>
      <circle cx="17" cy="11" r="2.8" fill="#10b981"/>
      <circle cx="23" cy="13" r="2.8" fill="#3b82f6"/>
      <circle cx="26" cy="19" r="2.8" fill="#ef4444"/>
      <circle cx="12" cy="21" r="2.8" fill="#a855f7"/>
    </svg>
  );
}

function PainterIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M3 17c0-1.1.9-2 2-2h1.5l6-6-1.5-1.5-6 6V15H3v2z" fill="currentColor" opacity="0.9"/>
      <path d="M14.5 2.5a1.5 1.5 0 0 1 2.12 0l.88.88a1.5 1.5 0 0 1 0 2.12l-1.5 1.5-3-3 1.5-1.5z" fill="currentColor"/>
      <path d="M11.5 5.5l3 3-6.5 6.5-3-3 6.5-6.5z" fill="currentColor" opacity="0.7"/>
    </svg>
  );
}

function SchoolIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Cap top */}
      <polygon points="10,3 19,7.5 10,12 1,7.5" fill="currentColor"/>
      {/* Left tassel string */}
      <rect x="9.2" y="7.5" width="1.6" height="6" rx="0.8" fill="currentColor" opacity="0.8"/>
      {/* Left side of gown */}
      <path d="M4 9.5v5c0 1.5 2.5 3 6 3s6-1.5 6-3v-5L10 12l-6-2.5z" fill="currentColor" opacity="0.65"/>
    </svg>
  );
}

export default function Header() {
  const { wallets, wallet, connected, connecting, publicKey, disconnect, select, connect } = useWallet();
  const openModal = useWalletUIStore((s) => s.openModal);
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pendingConnect, setPendingConnect] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const isMuseWallet = wallet?.adapter?.name === MuseWalletName;

  // Check user profile when wallet connects
  useEffect(() => {
    if (!connected || !publicKey) {
      setUserName(null);
      return;
    }
    const address = publicKey.toBase58();
    fetch(`/api/users/${address}`)
      .then(res => {
        if (res.status === 404) {
          setShowProfileModal(true);
        } else if (res.ok) {
          return res.json().then((u: { name: string }) => setUserName(u.name));
        }
      })
      .catch(() => {});
  }, [connected, publicKey]);

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
    setUserName(null);
    localStorage.removeItem('walletName');
    disconnect();
  }

  const availableWallets = wallets.filter(
    (w) =>
      w.readyState === WalletReadyState.Installed ||
      w.readyState === WalletReadyState.Loadable ||
      w.adapter.name === MuseWalletName
  );

  const shortAddress = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : '';

  const logo = (
    <Link href="/" className="flex items-center gap-2.5 group shrink-0">
      <MuseLogo />
      <div>
        <span className="text-xl font-bold leading-tight group-hover:text-purple-400 transition-colors">Muse x402</span>
        <p className="text-xs text-gray-400 leading-tight">x402 protocol demo</p>
      </div>
    </Link>
  );

  const navLinks = (
    <nav className="flex items-center gap-1">
      <Link
        href="/painters"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
          pathname === '/painters' || pathname === '/'
            ? 'bg-purple-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <PainterIcon />
        Painters Test
      </Link>
      <Link
        href="/school"
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
          pathname === '/school'
            ? 'bg-purple-600 text-white'
            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
        }`}
      >
        <SchoolIcon />
        School Test
      </Link>
    </nav>
  );

  if (!mounted) return (
    <header className="flex justify-between items-center px-4 py-3 bg-gray-900 text-white border-b border-gray-800">
      {logo}
    </header>
  );

  return (
    <header className="flex items-center gap-4 px-4 py-3 bg-gray-900 text-white border-b border-gray-800">
      {logo}
      <div className="flex-1 flex justify-center">
        {navLinks}
      </div>
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
                {userName ?? shortAddress}
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
                    {userName && <p className="text-sm text-white mt-1">{userName}</p>}
                  </div>
                  <button
                    onClick={() => { setDropdownOpen(false); setShowProfileModal(true); }}
                    className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    Edit Profile
                  </button>
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

      {showProfileModal && publicKey && (
        <UserProfileModal
          walletAddress={publicKey.toBase58()}
          onSave={(name) => { setUserName(name); setShowProfileModal(false); }}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </header>
  );
}
