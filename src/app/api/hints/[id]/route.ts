import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const signature = req.headers.get('X-Payment-Signature');

  const treasuryWallet = process.env.TREASURY_WALLET_ADDRESS;

  const hint = await prisma.hint.findUnique({ where: { id } });

  if (!hint) {
    return NextResponse.json({ error: 'Hint not found' }, { status: 404 });
  }

  if (signature) {
    if (!treasuryWallet) {
      return NextResponse.json({ error: 'Treasury wallet not configured' }, { status: 500 });
    }

    try {
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com');
      const tx = await connection.getTransaction(signature, { maxSupportedTransactionVersion: 0 });

      if (!tx || !tx.meta || tx.meta.err !== null) {
        throw new Error('Invalid or failed transaction');
      }

      // Verify the recipient received the expected amount
      const treasuryKey = new PublicKey(treasuryWallet);
      const accountKeys = tx.transaction.message.getAccountKeys();
      const treasuryIndex = accountKeys.staticAccountKeys.findIndex(
        (key) => key.equals(treasuryKey)
      );

      if (treasuryIndex === -1) {
        throw new Error('Treasury wallet not found in transaction');
      }

      const preBalance = tx.meta.preBalances[treasuryIndex];
      const postBalance = tx.meta.postBalances[treasuryIndex];
      const receivedSol = (postBalance - preBalance) / LAMPORTS_PER_SOL;

      if (receivedSol < hint.costSol) {
        throw new Error(`Insufficient payment: received ${receivedSol} SOL, expected ${hint.costSol} SOL`);
      }

      // Record the payment for weekly payout tracking
      const userId = req.headers.get('X-User-Id');
      try {
        await prisma.hintPayment.create({
          data: {
            userId: userId || 'anonymous',
            hintId: hint.id,
            amountSol: receivedSol,
            txSignature: signature,
          },
        });
      } catch {
        // Non-critical — don't block hint delivery if tracking fails
      }

      return NextResponse.json({ content: hint.content });
    } catch (error) {
      console.error('Transaction verification failed:', error);
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 });
    }
  } else if (!treasuryWallet) {
    // No treasury configured — free access (demo mode)
    return NextResponse.json({ content: hint.content });
  } else {
    // No payment signature — return 402 with payment info
    const responseBody = {
      error: 'Payment Required',
      paymentRequest: {
        amount: hint.costSol,
        currency: 'SOL',
        recipient: treasuryWallet,
        resourceId: hint.id,
      },
    };

    return new NextResponse(JSON.stringify(responseBody), {
      status: 402,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': `x402 token="SOL", amount="${hint.costSol}", address="${treasuryWallet}"`,
      },
    });
  }
}
