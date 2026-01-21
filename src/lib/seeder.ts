import axios from 'axios';
import fs from 'fs';
import path from 'path';

// CONFIGURATION
const RIJKS_API_KEY = process.env.RIJKS_API_KEY || ''; 
// Use the public directory so the file is accessible via HTTP and writable in Docker usually
const OUTPUT_FILE = path.join(process.cwd(), 'public/paintings.json');

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

export async function seedPaintings() {
  const [aic, met] = await Promise.all([fetchAIC(), fetchMet()]);
  let all = [...aic, ...met];
  
  // Basic cleaning
  all = all.filter(p => p.imageUrl && p.title && p.artist);
  all = shuffle(all);

  // Map to the internal app structure which expects 'hints' generally array, 
  // but let's conform to the app's existing types or adapt the app.
  // The app expects `hints: Hint[]`.
  // We need to transform the simple seeds into the complex game object.
  
  const gameReadyPaintings = all.map(p => ({
    id: p.id,
    source: p.source,
    imageUrl: p.imageUrl,
    blurLevel: 'blur(10px)',
    artist: p.artist,
    title: p.title,
    hints: [
      {
        id: `${p.id}-1`,
        type: 'location',
        label: 'Where is it displayed?',
        content: p.hints.location,
        costSol: 0.01,
        isLocked: true,
      },
      {
        id: `${p.id}-2`,
        type: 'bio',
        label: 'Artist Context',
        content: p.hints.bio,
        costSol: 0.01,
        isLocked: true,
      },
    ]
  }));

  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log(`Writing ${gameReadyPaintings.length} items to ${OUTPUT_FILE}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(gameReadyPaintings, null, 2));
  return gameReadyPaintings.length;
}
