import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  Connection, Keypair, SystemProgram,
  Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, PublicKey,
} from '@solana/web3.js';
import bs58 from 'bs58';

function getPreviousWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getUTCDay();
  const diffToThisMonday = day === 0 ? -6 : 1 - day;
  const thisMonday = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToThisMonday
  ));
  const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { start: lastMonday, end: thisMonday };
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization');
  if (!auth || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { start: weekStart, end: weekEnd } = getPreviousWeekRange();

  const existingPayout = await prisma.payout.findFirst({
    where: { weekStart },
  });
  if (existingPayout) {
    return NextResponse.json({ message: 'Already paid for this week', payout: existingPayout });
  }

  const rows = await prisma.score.groupBy({
    by: ['userId'],
    where: { createdAt: { gte: weekStart, lt: weekEnd } },
    _sum: { points: true },
    orderBy: { _sum: { points: 'desc' } },
    take: 1,
  });

  if (!rows.length || (rows[0]._sum.points ?? 0) === 0) {
    return NextResponse.json({ message: 'No scores this week, no payout' });
  }

  const winnerId = rows[0].userId;

  // Calculate payout from SOL collected via hint payments during the week
  const payments = await prisma.hintPayment.aggregate({
    where: { createdAt: { gte: weekStart, lt: weekEnd } },
    _sum: { amountSol: true },
  });
  const payoutAmountSol = payments._sum.amountSol ?? 0;
  if (payoutAmountSol <= 0) {
    return NextResponse.json({ message: 'No SOL collected this week, no payout' });
  }

  const treasurySecret = process.env.TREASURY_PRIVATE_KEY;
  if (!treasurySecret) {
    return NextResponse.json({ error: 'Treasury key not configured' }, { status: 500 });
  }

  let txSignature: string | null = null;
  try {
    const secretBytes = bs58.decode(treasurySecret);
    const treasuryKeypair = Keypair.fromSecretKey(secretBytes);
    const connection = new Connection(
      process.env.SOLANA_RPC_URL ?? 'https://api.devnet.solana.com'
    );

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: treasuryKeypair.publicKey,
        toPubkey: new PublicKey(winnerId),
        lamports: Math.floor(payoutAmountSol * LAMPORTS_PER_SOL),
      })
    );

    txSignature = await sendAndConfirmTransaction(connection, tx, [treasuryKeypair]);
  } catch (err) {
    console.error('Payout transaction failed:', err);
    return NextResponse.json({ error: 'Transaction failed', detail: String(err) }, { status: 500 });
  }

  const payout = await prisma.payout.create({
    data: {
      userId: winnerId,
      amountSol: payoutAmountSol,
      txSignature,
      weekStart,
    },
  });

  return NextResponse.json({ success: true, payout });
}
