import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const { email, password } = body;

  if (email === 'colin@tarvit.com' && password === 'dundee88') {
    const response = NextResponse.json({ success: true });
    
    // Set cookie on the response object
    response.cookies.set('admin_session', 'valid', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    
    return response;
  }

  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
