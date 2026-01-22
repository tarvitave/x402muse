import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const paintingCount = await prisma.painting.count();
    const hintCount = await prisma.hint.count();

    const thumbnailsDir = path.join(process.cwd(), 'public', 'thumbnails');
    const imagesDir = path.join(process.cwd(), 'public', 'images');

    const thumbnailsExist = fs.existsSync(thumbnailsDir);
    const imagesExist = fs.existsSync(imagesDir);

    const thumbnailCount = thumbnailsExist ? fs.readdirSync(thumbnailsDir).length : 0;
    const imageCount = imagesExist ? fs.readdirSync(imagesDir).length : 0;

    const sample = await prisma.painting.findFirst({
      include: { hints: true }
    });

    return NextResponse.json({
      status: 'ok',
      database: {
        paintings: paintingCount,
        hints: hintCount,
        samplePainting: sample ? {
          id: sample.id,
          title: sample.title,
          thumbnailPath: sample.thumbnailPath,
          imageUrl: sample.imageUrl,
          hintsCount: sample.hints.length
        } : null
      },
      files: {
        thumbnailsDir: thumbnailsDir,
        thumbnailsExist,
        thumbnailCount,
        imagesDir: imagesDir,
        imagesExist,
        imageCount
      },
      cwd: process.cwd()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
