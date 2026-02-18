'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import { Hint } from '@/lib/types';

interface HintCardProps {
  hint: Hint;
  onUnlock: (id: string, content: string) => void;
}

export default function HintCard({ hint, onUnlock }: HintCardProps) {
  const [unlockedContent, setUnlockedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();

  const handleUnlock = async () => {
    if (!publicKey) {
      alert('Please connect your wallet first.');
      return;
    }
    setIsLoading(true);

    try {
      const response = await fetch(`/api/hints/${hint.id}`);

      if (response.status === 402) {
        const { paymentRequest } = await response.json();
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: new PublicKey(paymentRequest.recipient),
            lamports: paymentRequest.amount * 1_000_000_000, // Convert SOL to lamports
          })
        );

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight }
        } = await connection.getLatestBlockhashAndContext();

        const signature = await sendTransaction(transaction, connection, { minContextSlot });
        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });


        const retryResponse = await fetch(`/api/hints/${hint.id}`, {
          headers: {
            'X-Payment-Signature': signature,
          },
        });

        if (retryResponse.ok) {
          const { content } = await retryResponse.json();
          setUnlockedContent(content);
          onUnlock(hint.id, content);
        } else {
          throw new Error('Payment verification failed.');
        }
      } else if (response.ok) {
        const { content } = await response.json();
        setUnlockedContent(content);
        onUnlock(hint.id, content);
      } else {
        throw new Error('Failed to fetch hint.');
      }
    } catch (error) {
      console.error('Unlock failed:', error);
      alert('Failed to unlock hint. See console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const isUnlocked = unlockedContent !== null || !hint.isLocked;

  return (
    <div className={`p-4 border rounded-lg ${isUnlocked ? 'border-yellow-400' : 'border-gray-600'}`}>
      <div className="flex justify-between items-center">
        <span className="text-lg">{hint.label}</span>
        {isUnlocked ? (
          <span className="text-yellow-400">🔓</span>
        ) : (
          <span className="text-gray-400">🔒</span>
        )}
      </div>
      <div className="mt-2">
        {isUnlocked ? (
          <p className="text-gray-800">{unlockedContent || hint.content}</p>
        ) : (
          <p className="text-gray-400">********</p>
        )}
      </div>
      {!isUnlocked && (
        <button
          onClick={handleUnlock}
          disabled={isLoading}
          className="mt-4 w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
        >
          {isLoading ? 'Processing...' : `Unlock (${hint.costSol} SOL)`}
        </button>
      )}
    </div>
  );
}
