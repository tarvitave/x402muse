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

    // Call Stripe REST API directly — avoids SDK crypto namespace version issues
    const body = new URLSearchParams({
      'transaction_details[destination_currency]': 'sol',
      'transaction_details[destination_network]': 'solana',
      'transaction_details[wallet_addresses][solana]': walletAddress,
    });
    if (ip) body.set('customer_ip_address', ip);

    const res = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2022-11-15',
      },
      body: body.toString(),
    });

    const session = await res.json();
    if (!res.ok) {
      console.error('Stripe API error:', session);
      throw new Error(session.error?.message || `Stripe returned ${res.status}`);
    }

    return NextResponse.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error('Stripe onramp session error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
