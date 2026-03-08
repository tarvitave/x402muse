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

    const stripe = (await import('stripe')).default;
    const client = new stripe(stripeKey);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || undefined;

    // @ts-expect-error — crypto.onrampSessions is available on Stripe crypto beta
    const session = await client.crypto.onrampSessions.create({
      transaction_details: {
        destination_currency: 'sol',
        destination_network: 'solana',
        wallet_addresses: { solana: walletAddress },
      },
      ...(ip && { customer_ip_address: ip }),
    });

    return NextResponse.json({ client_secret: session.client_secret });
  } catch (err) {
    console.error('Stripe onramp session error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
