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

    // Build body manually — URLSearchParams percent-encodes brackets which Stripe won't parse
    const parts = [
      `transaction_details[destination_currency]=sol`,
      `transaction_details[destination_network]=solana`,
      `transaction_details[wallet_addresses][solana]=${encodeURIComponent(walletAddress)}`,
      `transaction_details[supported_destination_currencies][0]=sol`,
      `transaction_details[supported_destination_networks][0]=solana`,
    ];
    if (ip) parts.push(`customer_ip_address=${encodeURIComponent(ip)}`);
    const body = parts.join('&');

    console.log('Stripe request body:', body);
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
      // 404 on this endpoint = account not approved for Crypto Onramp yet
      if (res.status === 404 || session.error?.message?.includes('Unrecognized request URL')) {
        return NextResponse.json({ error: 'pending_approval' }, { status: 503 });
      }
      throw new Error(session.error?.message || `Stripe returned ${res.status}`);
    }

    console.log('Stripe session transaction_details:', JSON.stringify(session.transaction_details, null, 2));
    return NextResponse.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error('Stripe onramp session error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
