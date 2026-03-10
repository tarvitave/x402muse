import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 503 });
  }

  const { prompt, subject } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const client = new Anthropic({ apiKey });

  const systemPrompt = `You are an expert email copywriter. Generate email content in Markdown format.
- Use clear, engaging prose
- Structure with headers (##) for sections if appropriate
- Keep paragraphs short and scannable
- End with a clear call-to-action
- Do not include "Subject:" in the output — only the body
- Return only the markdown email body, no preamble or explanation`;

  const userPrompt = subject
    ? `Write an email with subject "${subject}" based on this brief:\n\n${prompt}`
    : `Write an email based on this brief:\n\n${prompt}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    });

    const text = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ markdown: text });
  } catch (err) {
    console.error('AI generate error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
