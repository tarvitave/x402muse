import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

export async function POST(req: NextRequest) {
  const secret = process.env.MOONPAY_SECRET_KEY;

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Missing url' }, { status: 400 });
    }

    if (!secret) {
      // Return unsigned URL — widget will load but MoonPay may reject in production
      return NextResponse.json({ signedUrl: url, signed: false });
    }

    const parsed = new URL(url);
    const queryString = parsed.search; // includes the leading '?'

    const signature = createHmac('sha256', secret)
      .update(queryString)
      .digest('base64');

    parsed.searchParams.set('signature', signature);
    return NextResponse.json({ signedUrl: parsed.toString(), signed: true });
  } catch (err) {
    console.error('MoonPay sign error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
