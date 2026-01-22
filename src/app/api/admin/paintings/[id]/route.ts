import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log('Updating painting:', id, body);
    const updated = await prisma.painting.update({
      where: { id },
      data: body,
      include: { hints: true }
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update painting failed:', error);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}