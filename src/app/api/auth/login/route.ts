import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return NextResponse.json({ error: 'Admin credentials not configured' }, { status: 500 });
  }

  const body = await request.json();
  const { email, password } = body;

  if (email === adminEmail && password === adminPassword) {
    const response = NextResponse.json({ success: true });
    
    // Set cookie on the response object
    response.cookies.set('admin_session', 'valid', {
      httpOnly: true,
      secure: false, // Allow non-https for initial deployment/testing
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
      sameSite: 'lax',
    });
    
    return response;
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
