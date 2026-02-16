'use client';

import { useEffect, useState, useCallback } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

interface BalanceDisplayProps {
  publicKey: PublicKey;
}

export default function BalanceDisplay({ publicKey }: BalanceDisplayProps) {
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalance = useCallback(async () => {
    try {
      const bal = await connection.getBalance(publicKey);
      setBalance(bal / LAMPORTS_PER_SOL);
    } catch {
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 15_000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 text-center">
      <p className="text-gray-400 text-sm mb-1">Balance</p>
      {loading ? (
        <p className="text-lg text-gray-500">Loading...</p>
      ) : balance !== null ? (
        <p className="text-2xl font-bold">{balance.toFixed(4)} SOL</p>
      ) : (
        <p className="text-lg text-red-400">Failed to load</p>
      )}
    </div>
  );
}
