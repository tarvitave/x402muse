import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface SeoResult {
  url: string;
  title: string | null;
  description: string | null;
  h1Count: number;
  h2Count: number;
  imgWithoutAlt: number;
  hasCanonical: boolean;
  hasViewport: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  issues: string[];
  score: number;
}

export async function GET(req: NextRequest) {
  const adminSession = req.cookies.get('admin_session');
  if (!adminSession) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const baseUrl = req.nextUrl.origin;
  const pages = ['/', '/painters', '/school', '/privacy', '/terms'];

  const results: SeoResult[] = [];

  for (const path of pages) {
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: { 'User-Agent': 'MuseSEOBot/1.0' },
      });
      const html = await res.text();

      const issues: string[] = [];
      let score = 100;

      // Title
      const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : null;
      if (!title) { issues.push('Missing <title> tag'); score -= 15; }
      else if (title.length < 30) { issues.push(`Title too short (${title.length} chars, aim for 50-60)`); score -= 5; }
      else if (title.length > 70) { issues.push(`Title too long (${title.length} chars, aim for 50-60)`); score -= 5; }

      // Meta description
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i)
        || html.match(/<meta[^>]*content=["']([^"']*)["'][^>]*name=["']description["']/i);
      const description = descMatch ? descMatch[1].trim() : null;
      if (!description) { issues.push('Missing meta description'); score -= 15; }
      else if (description.length < 120) { issues.push(`Meta description short (${description.length} chars, aim for 150-160)`); score -= 5; }
      else if (description.length > 170) { issues.push(`Meta description too long (${description.length} chars, aim for 150-160)`); score -= 5; }

      // H1 tags
      const h1Matches = html.match(/<h1[\s>]/gi);
      const h1Count = h1Matches ? h1Matches.length : 0;
      if (h1Count === 0) { issues.push('Missing H1 heading'); score -= 10; }
      else if (h1Count > 1) { issues.push(`Multiple H1 tags (${h1Count}) — use only one`); score -= 5; }

      // H2 tags
      const h2Matches = html.match(/<h2[\s>]/gi);
      const h2Count = h2Matches ? h2Matches.length : 0;

      // Images without alt
      const imgTags = html.match(/<img[^>]*>/gi) || [];
      const imgWithoutAlt = imgTags.filter(tag => !tag.match(/alt=["'][^"']+["']/i)).length;
      if (imgWithoutAlt > 0) { issues.push(`${imgWithoutAlt} image(s) missing alt text`); score -= imgWithoutAlt * 3; }

      // Canonical
      const hasCanonical = /<link[^>]*rel=["']canonical["']/i.test(html);
      if (!hasCanonical) { issues.push('Missing canonical link tag'); score -= 5; }

      // Viewport
      const hasViewport = /<meta[^>]*name=["']viewport["']/i.test(html);
      if (!hasViewport) { issues.push('Missing viewport meta tag'); score -= 10; }

      // Open Graph
      const hasOgTitle = /<meta[^>]*property=["']og:title["']/i.test(html);
      const hasOgDescription = /<meta[^>]*property=["']og:description["']/i.test(html);
      const hasOgImage = /<meta[^>]*property=["']og:image["']/i.test(html);
      if (!hasOgTitle) { issues.push('Missing og:title meta tag'); score -= 5; }
      if (!hasOgDescription) { issues.push('Missing og:description meta tag'); score -= 5; }
      if (!hasOgImage) { issues.push('Missing og:image meta tag'); score -= 5; }

      if (issues.length === 0) issues.push('No issues found');

      results.push({
        url: path,
        title,
        description,
        h1Count,
        h2Count,
        imgWithoutAlt,
        hasCanonical,
        hasViewport,
        hasOgTitle,
        hasOgDescription,
        hasOgImage,
        issues,
        score: Math.max(0, score),
      });
    } catch {
      results.push({
        url: path,
        title: null,
        description: null,
        h1Count: 0,
        h2Count: 0,
        imgWithoutAlt: 0,
        hasCanonical: false,
        hasViewport: false,
        hasOgTitle: false,
        hasOgDescription: false,
        hasOgImage: false,
        issues: ['Failed to fetch page'],
        score: 0,
      });
    }
  }

  return NextResponse.json({ pages: results });
}
