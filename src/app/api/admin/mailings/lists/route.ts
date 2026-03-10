import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';

// GET /api/admin/mailings/lists — list all mailing lists with contact counts
export async function GET() {
  try {
    const lists = await prisma.mailingList.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { contacts: true, campaigns: true } },
      },
    });
    return NextResponse.json({ lists });
  } catch (err) {
    console.error('GET mailingList error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// POST /api/admin/mailings/lists — create a new mailing list
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') ?? '';

    if (contentType.includes('multipart/form-data')) {
      // CSV upload
      const formData = await req.formData();
      const name = formData.get('name') as string;
      const description = formData.get('description') as string | null;
      const file = formData.get('file') as File | null;

      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

      const list = await prisma.mailingList.create({
        data: { id: randomUUID(), name, description: description ?? undefined },
      });

      if (file) {
        const text = await file.text();
        const contacts = parseCsv(text);
        if (contacts.length > 0) {
          await prisma.mailingListContact.createMany({
            data: contacts.map(c => ({
              id: randomUUID(),
              mailingListId: list.id,
              email: c.email,
              name: c.name ?? undefined,
              unsubscribeToken: randomUUID(),
            })),
          });
        }
      }

      const count = await prisma.mailingListContact.count({ where: { mailingListId: list.id } });
      return NextResponse.json({ list, contactCount: count });
    } else {
      const body = await req.json();

      if (body.action === 'addContact') {
        const { listId, email, name: contactName } = body;
        if (!listId || !email) return NextResponse.json({ error: 'listId and email required' }, { status: 400 });
        const contact = await prisma.mailingListContact.create({
          data: {
            id: randomUUID(),
            mailingListId: listId,
            email,
            name: contactName || undefined,
            unsubscribeToken: randomUUID(),
          },
        });
        return NextResponse.json({ contact });
      }

      if (body.action === 'deleteContact') {
        const { contactId } = body;
        if (!contactId) return NextResponse.json({ error: 'contactId required' }, { status: 400 });
        await prisma.mailingListContact.delete({ where: { id: contactId } });
        return NextResponse.json({ ok: true });
      }

      // JSON: create empty list
      const { name, description } = body;
      if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
      const list = await prisma.mailingList.create({
        data: { id: randomUUID(), name, description: description ?? undefined },
      });
      return NextResponse.json({ list });
    }
  } catch (err) {
    console.error('POST mailingList error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// PATCH /api/admin/mailings/lists?id=xxx — update list name/description
export async function PATCH(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { name, description } = await req.json();
    const list = await prisma.mailingList.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
      },
    });
    return NextResponse.json({ list });
  } catch (err) {
    console.error('PATCH mailingList error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// DELETE /api/admin/mailings/lists?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    await prisma.mailingList.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('DELETE mailingList error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

function parseCsv(text: string): { email: string; name?: string }[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  // Detect header row
  const first = lines[0].toLowerCase();
  const hasHeader = first.includes('email') || first.includes('name');
  const dataLines = hasHeader ? lines.slice(1) : lines;

  // Determine column positions from header (default: 0=email, 1=name)
  let emailCol = 0;
  let nameCol = 1;
  if (hasHeader) {
    const cols = splitCsvLine(lines[0]).map(c => c.toLowerCase().trim());
    const ei = cols.findIndex(c => c.includes('email'));
    const ni = cols.findIndex(c => c.includes('name'));
    if (ei >= 0) emailCol = ei;
    if (ni >= 0) nameCol = ni;
  }

  const results: { email: string; name?: string }[] = [];
  for (const line of dataLines) {
    const cols = splitCsvLine(line);
    const email = cols[emailCol]?.trim().replace(/^"|"$/g, '');
    if (!email || !email.includes('@')) continue;
    const name = cols[nameCol]?.trim().replace(/^"|"$/g, '') || undefined;
    results.push({ email, name });
  }
  return results;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}
