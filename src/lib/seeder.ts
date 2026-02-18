import axios from 'axios';
import prisma from './prisma';

// CONFIGURATION
const RIJKS_API_KEY = process.env.RIJKS_API_KEY || '';

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
  const [aic, met, rijks] = await Promise.all([fetchAIC(), fetchMet(), fetchRijks()]);
  let all = [...aic, ...met, ...rijks];

  // Basic cleaning
  all = all.filter(p => p.imageUrl && p.title && p.artist);
  all = shuffle(all);

  // DB WRITE
  console.log('Seeding database...');

  // Clear existing paintings (not schools)
  await prisma.hint.deleteMany({ where: { painting: { category: 'painting' } } });
  await prisma.painting.deleteMany({ where: { category: 'painting' } });

  let successCount = 0;
  const breakdown: Record<string, number> = {};

  for (const p of all) {
    console.log(`Processing: ${p.id}`);

    try {
      await prisma.painting.create({
        data: {
          id: p.id,
          source: p.source,
          category: 'painting',
          active: true,
          title: p.title,
          artist: p.artist,
          imageUrl: p.imageUrl, // Use original museum URL directly
          thumbnailPath: null,
          hints: {
            create: [
              {
                id: `${p.id}-1`,
                label: 'Where is it displayed?',
                content: p.hints.location,
                costSol: 0.00001,
                isLocked: true,
              },
              {
                id: `${p.id}-2`,
                label: 'Artist Context',
                content: p.hints.bio,
                costSol: 0.00001,
                isLocked: true,
              },
            ]
          }
        }
      });

      successCount++;
      const s = p.source || 'Unknown';
      breakdown[s] = (breakdown[s] || 0) + 1;
    } catch (error) {
      console.error(`Failed to save ${p.id}:`, error);
    }
  }

  return { count: successCount, breakdown };
}

export async function seedSchools() {
  const { schools } = await import('@/data/schools');

  console.log('Seeding schools...');

  // Clear existing schools (not paintings)
  await prisma.hint.deleteMany({ where: { painting: { category: 'school' } } });
  await prisma.painting.deleteMany({ where: { category: 'school' } });

  let successCount = 0;

  for (const s of schools) {
    console.log(`Processing: ${s.id}`);

    try {
      await prisma.painting.create({
        data: {
          id: s.id,
          source: 'STATIC',
          category: 'school',
          active: true,
          title: s.title,
          artist: s.artist,
          imageUrl: s.imageUrl,
          thumbnailPath: null,
          hints: {
            create: s.hints.map((h) => ({
              id: h.id,
              label: h.label,
              content: h.content,
              costSol: h.costSol,
              isLocked: h.isLocked,
            })),
          },
        },
      });
      successCount++;
    } catch (error) {
      console.error(`Failed to save ${s.id}:`, error);
    }
  }

  return { count: successCount };
}
