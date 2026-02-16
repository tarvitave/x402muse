import axios from 'axios';
import prisma from './prisma';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// CONFIGURATION
const RIJKS_API_KEY = process.env.RIJKS_API_KEY || '';
const THUMBNAILS_DIR = path.join(process.cwd(), 'public', 'thumbnails');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(THUMBNAILS_DIR)) {
    fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
  }
  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

// Download image and create thumbnail
async function downloadAndCreateThumbnail(imageUrl: string, id: string): Promise<{ imagePath: string; thumbnailPath: string } | null> {
  try {
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': 'https://www.artic.edu/',
      },
      timeout: 30000,
    });

    const buffer = Buffer.from(response.data);
    const ext = 'jpg';
    const imageFilename = `${id}.${ext}`;
    const thumbnailFilename = `${id}_thumb.${ext}`;

    const imagePath = path.join(IMAGES_DIR, imageFilename);
    const thumbnailPath = path.join(THUMBNAILS_DIR, thumbnailFilename);

    // Save original image
    fs.writeFileSync(imagePath, buffer);

    // Create thumbnail (150x150)
    await sharp(buffer)
      .resize(150, 150, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return {
      imagePath: `/images/${imageFilename}`,
      thumbnailPath: `/thumbnails/${thumbnailFilename}`,
    };
  } catch (error) {
    console.error(`Failed to download/process image for ${id}:`, error);
    return null;
  }
} 

// Interface (matching required schema)
interface Painting {
  id: string;
  source: 'AIC' | 'MET' | 'RIJKS';
  title: string;
  artist: string;
  imageUrl: string;
  date: string;
  medium: string;
  hints: {
    location: string;
    bio: string;
  }; 
  blurLevel: string; // Adding for UI compatibility
  costSol?: number; // Adding for UI compatibility
  isLocked?: boolean; // Adding for UI compatibility
}

function shuffle(array: any[]) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

async function fetchAIC(): Promise<Painting[]> {
  try {
    const response = await axios.get('https://api.artic.edu/api/v1/artworks/search', {
      params: {
        q: 'painting',
        'query[term][is_public_domain]': true,
        limit: 60, // Increased to hit ~100 total
        fields: 'id,title,artist_display,date_display,medium_display,image_id,place_of_origin,artist_title'
      }
    });

    return response.data.data.filter((item: any) => item.image_id).map((item: any) => ({
      id: `aic-${item.id}`,
      source: 'AIC',
      title: item.title,
      artist: item.artist_title || item.artist_display,
      imageUrl: `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`,
      date: item.date_display,
      medium: item.medium_display,
      hints: {
        location: `Art Institute of Chicago, USA`,
        bio: item.place_of_origin || 'Unknown origin'
      },
      blurLevel: 'blur(10px)',
    }));
  } catch (error) {
    console.error('AIC Fetch Error', error);
    return [];
  }
}

async function fetchMet(): Promise<Painting[]> {
  try {
    const searchRes = await axios.get('https://collectionapi.metmuseum.org/public/collection/v1/search', {
      params: { q: 'painting', hasImages: true, medium: 'Paintings' }
    });

    if (!searchRes.data.objectIDs) return [];

    const objectIDs = searchRes.data.objectIDs.slice(0, 60); // Increased to hit ~100 total
    const results: Painting[] = [];
    
    // Simple serial fetch for stability
    for (const id of objectIDs) {
        try {
            const res = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`);
            const item = res.data;
            if (item.primaryImageSmall) {
                results.push({
                    id: `met-${item.objectID}`,
                    source: 'MET',
                    title: item.title,
                    artist: item.artistDisplayName || item.artistAlphaSort,
                    imageUrl: item.primaryImageSmall,
                    date: item.objectDate,
                    medium: item.medium,
                    hints: {
                        location: 'The Metropolitan Museum of Art, New York',
                        bio: item.artistDisplayBio || item.culture || 'Unknown details'
                    },
                    blurLevel: 'blur(10px)',
                });
            }
        } catch (e) {}
    }
    return results;
  } catch (error) {
    console.error('Met Fetch Error', error);
    return [];
  }
}

async function fetchRijks(): Promise<Painting[]> {
  if (!RIJKS_API_KEY) {
    console.log('Skipping Rijksmuseum: RIJKS_API_KEY not set');
    return [];
  }

  try {
    const response = await axios.get('https://www.rijksmuseum.nl/api/en/collection', {
      params: {
        key: RIJKS_API_KEY,
        format: 'json',
        type: 'painting',
        toppieces: true,
        ps: 60,
        imgonly: true,
      },
    });

    return response.data.artObjects
      .filter((item: any) => item.webImage?.url && item.principalOrFirstMaker)
      .map((item: any) => ({
        id: `rijks-${item.objectNumber}`,
        source: 'RIJKS' as const,
        title: item.title,
        artist: item.principalOrFirstMaker,
        imageUrl: item.webImage.url,
        date: item.longTitle || '',
        medium: 'Painting',
        hints: {
          location: 'Rijksmuseum, Amsterdam',
          bio: item.productionPlaces?.join(', ') || 'Netherlands',
        },
        blurLevel: 'blur(10px)',
      }));
  } catch (error) {
    console.error('Rijksmuseum Fetch Error', error);
    return [];
  }
}

export async function seedPaintings() {
  ensureDirectories();

  const [aic, met, rijks] = await Promise.all([fetchAIC(), fetchMet(), fetchRijks()]);
  let all = [...aic, ...met, ...rijks];

  // Basic cleaning
  all = all.filter(p => p.imageUrl && p.title && p.artist);
  all = shuffle(all);

  // DB WRITE
  console.log('Seeding database...');

  // Clear existing
  await prisma.hint.deleteMany({});
  await prisma.painting.deleteMany({});

  let successCount = 0;
  const breakdown: Record<string, number> = {};

  // Process each painting: download image, create thumbnail, save to DB
  for (const p of all) {
    console.log(`Processing: ${p.id}`);

    const imageResult = await downloadAndCreateThumbnail(p.imageUrl, p.id);

    if (!imageResult) {
      console.log(`Skipping ${p.id} - failed to download image`);
      continue;
    }

    await prisma.painting.create({
      data: {
        id: p.id,
        source: p.source,
        active: true,
        title: p.title,
        artist: p.artist,
        imageUrl: imageResult.imagePath,
        thumbnailPath: imageResult.thumbnailPath,
        hints: {
          create: [
            {
              id: `${p.id}-1`,
              label: 'Where is it displayed?',
              content: p.hints.location,
              costSol: 0.01,
              isLocked: true,
            },
            {
              id: `${p.id}-2`,
              label: 'Artist Context',
              content: p.hints.bio,
              costSol: 0.01,
              isLocked: true,
            },
          ]
        }
      }
    });

    successCount++;
    const s = p.source || 'Unknown';
    breakdown[s] = (breakdown[s] || 0) + 1;
  }

  return { count: successCount, breakdown };
}
