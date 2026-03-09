import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  try {
    const { walletAddress } = await req.json();
    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json({ error: 'Missing walletAddress' }, { status: 400 });
    }

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim();

    const parts = [
      `transaction_details[wallet_addresses][solana]=${encodeURIComponent(walletAddress)}`,
      `transaction_details[lock_wallet_address]=true`,
    ];
    if (ip) parts.push(`customer_ip_address=${encodeURIComponent(ip)}`);
    const body = parts.join('&');

    const res = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2023-10-16',
      },
      body,
    });

    const session = await res.json();
    if (!res.ok) {
      console.error('Stripe API error:', session);
      if (res.status === 404 || session.error?.message?.includes('Unrecognized request URL')) {
        return NextResponse.json({ error: 'pending_approval' }, { status: 503 });
      }
      throw new Error(session.error?.message || `Stripe returned ${res.status}`);
    }

    return NextResponse.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error('Stripe onramp session error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
