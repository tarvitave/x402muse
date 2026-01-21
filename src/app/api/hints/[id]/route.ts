import { NextRequest, NextResponse } from 'next/server';
import { paintings } from '@/data/paintings';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';

const TREASURY_WALLET_ADDRESS = 'YourTreasuryWalletAddr'; // Replace with your actual treasury wallet address

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const signature = req.headers.get('X-Payment-Signature');

  const allHints = paintings.flatMap((p) => p.hints);
  const hint = allHints.find((h) => h.id === id);

  if (!hint) {
    return NextResponse.json({ error: 'Hint not found' }, { status: 404 });
  }

  if (signature) {
    try {
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
      const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });

      if (tx && tx.meta && tx.meta.err === null) {
        // Basic validation: check if the transaction was successful
        // For a real app, you'd want to verify the transaction details (amount, recipient, etc.)
        return NextResponse.json({ content: hint.content });
      } else {
        throw new Error('Invalid or failed transaction');
      }
    } catch (error) {
      console.error('Transaction verification failed:', error);
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }
  } else {
    const responseBody = {
      error: 'Payment Required',
      paymentRequest: {
        amount: hint.costSol,
        currency: 'SOL',
        recipient: TREASURY_WALLET_ADDRESS,
        resourceId: hint.id,
      },
    };

    return new NextResponse(JSON.stringify(responseBody), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `x402 token="SOL", amount="${hint.costSol}", address="${TREASURY_WALLET_ADDRESS}"`,
      },
    });
  }
}
