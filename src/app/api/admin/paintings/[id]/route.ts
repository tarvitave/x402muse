import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // 1. Auth Check
  const cookieStore = await cookies();
  const session = cookieStore.get('admin_session');
  if (!session || session.value !== 'valid') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params; 
  const body = await request.json();

  try {
    // 2. Perform Update
    // We handle updates for: active status, title, artist
    const updateData: any = {};
    if (typeof body.active === 'boolean') updateData.active = body.active;
    if (body.title) updateData.title = body.title;
    if (body.artist) updateData.artist = body.artist;

    const updated = await prisma.painting.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, item: updated });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
