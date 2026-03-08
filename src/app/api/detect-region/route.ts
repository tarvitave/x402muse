import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : null;

    const url = ip ? `https://ipapi.co/${ip}/json/` : 'https://ipapi.co/json/';
    const res = await fetch(url, {
      headers: { 'User-Agent': 'x402muse.com/1.0' },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) throw new Error(`ipapi.co returned ${res.status}`);

    const data = await res.json();
    const country_code: string = data.country_code || '';
    return NextResponse.json({ country_code, is_us: country_code === 'US' });
  } catch {
    // Fallback to non-US to show MoonPay (works globally)
    return NextResponse.json({ country_code: '', is_us: false });
  }
}
