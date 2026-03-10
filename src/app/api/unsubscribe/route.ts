import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/unsubscribe?token=xxx — public endpoint, no auth required
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/unsubscribe?error=missing_token', req.url));
  }

  try {
    const contact = await prisma.mailingListContact.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!contact) {
      return NextResponse.redirect(new URL('/unsubscribe?error=invalid_token', req.url));
    }

    if (!contact.unsubscribed) {
      await prisma.mailingListContact.update({
        where: { id: contact.id },
        data: { unsubscribed: true, unsubscribedAt: new Date() },
      });
    }

    return NextResponse.redirect(new URL('/unsubscribe?success=1', req.url));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return NextResponse.redirect(new URL('/unsubscribe?error=server_error', req.url));
  }
}
