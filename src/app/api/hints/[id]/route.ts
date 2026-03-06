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

      // Retry fetching the transaction — RPC nodes may lag indexing even after confirmation
      let tx = null;
      for (let i = 0; i < 5; i++) {
        tx = await connection.getTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        });
        if (tx) break;
        await new Promise((r) => setTimeout(r, 1500));
      }

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
        console.log(`HintPayment recorded: ${receivedSol} SOL for hint ${hint.id}`);
      } catch (recordErr) {
        // Log clearly — this is why the prize pool may show 0
        console.error('HintPayment.create failed (prize pool will not update):', recordErr);
      }

      return NextResponse.json({ content: hint.content, recordedSol: receivedSol });
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
