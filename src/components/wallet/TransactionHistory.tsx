'use client';

import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import type { TransactionRecord } from '@/lib/wallet/types';

interface TransactionHistoryProps {
  publicKey: PublicKey;
}

export default function TransactionHistory({ publicKey }: TransactionHistoryProps) {
  const { connection } = useConnection();
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTxs() {
      setLoading(true);
      try {
        const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 20 });
        const records: TransactionRecord[] = [];

        const results = await Promise.allSettled(
          sigs.map((sig) =>
            connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 })
          )
        );

        for (let i = 0; i < results.length; i++) {
          const result = results[i];
          const sig = sigs[i];
          if (result.status !== 'fulfilled' || !result.value?.meta) continue;

          const tx = result.value;
          const accountKeys = tx.transaction.message.accountKeys;
          const userIndex = accountKeys.findIndex((k) =>
            (typeof k === 'object' && 'pubkey' in k ? k.pubkey : k).equals(publicKey)
          );

          if (userIndex === -1) continue;

          const pre = tx.meta!.preBalances[userIndex];
          const post = tx.meta!.postBalances[userIndex];
          const diff = post - pre;
          const fee = userIndex === 0 ? (tx.meta!.fee || 0) : 0;
          const amount = Math.abs(diff + fee);

          const otherIndex = userIndex === 0 ? 1 : 0;
          const otherKey = accountKeys[otherIndex];
          const otherParty = (typeof otherKey === 'object' && 'pubkey' in otherKey
            ? otherKey.pubkey
            : otherKey
          )?.toBase58() || 'Unknown';

          records.push({
            signature: sig.signature,
            slot: sig.slot,
            blockTime: sig.blockTime ?? null,
            type: diff > 0 ? 'received' : diff < 0 ? 'sent' : 'unknown',
            amount,
            otherParty,
            success: !sig.err,
          });
        }

        if (!cancelled) setTransactions(records);
      } catch {
        if (!cancelled) setTransactions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTxs();
    return () => { cancelled = true; };
  }, [connection, publicKey]);

  const network = process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet';
  const explorerCluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;

  if (loading) return <p className="text-gray-500 text-sm">Loading transactions...</p>;
  if (transactions.length === 0) return <p className="text-gray-500 text-sm">No transactions yet</p>;

  return (
    <div className="space-y-2 max-h-60 overflow-y-auto">
      {transactions.map((tx) => (
        <div key={tx.signature} className="bg-gray-900 rounded p-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <span className={tx.type === 'received' ? 'text-green-400' : 'text-red-400'}>
              {tx.type === 'received' ? '+' : '-'}
            </span>
            <span>{(tx.amount / LAMPORTS_PER_SOL).toFixed(4)} SOL</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            {tx.blockTime && (
              <span className="text-xs">{formatRelativeTime(tx.blockTime)}</span>
            )}
            <a
              href={`https://explorer.solana.com/tx/${tx.signature}${explorerCluster}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 text-xs font-mono"
            >
              {tx.signature.slice(0, 8)}...
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function formatRelativeTime(unixTimestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000 - unixTimestamp);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
