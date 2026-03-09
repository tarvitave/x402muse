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

    const payload: Record<string, unknown> = {
      transaction_details: {
        destination_currency: 'sol',
        destination_network: 'solana',
        wallet_addresses: { solana: walletAddress },
        supported_destination_currencies: ['sol'],
        supported_destination_networks: ['solana'],
      },
    };
    if (ip) payload.customer_ip_address = ip;

    console.log('Stripe request payload:', JSON.stringify(payload));
    const res = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/json',
        'Stripe-Version': '2023-10-16',
      },
      body: JSON.stringify(payload),
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

    console.log('Stripe full session:', JSON.stringify(session, null, 2));
    return NextResponse.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error('Stripe onramp session error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
