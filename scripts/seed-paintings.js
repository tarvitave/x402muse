const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// CONFIGURATION
const RIJKS_API_KEY = process.env.RIJKS_API_KEY || ''; // Add your key to .env or paste here
const OUTPUT_FILE = path.join(__dirname, '../src/data/paintings.json');

// Helper to shuffle array
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// API 1: Art Institute of Chicago
async function fetchAIC() {
  console.log('Fetching from Art Institute of Chicago...');
  try {
    const response = await axios.get('https://api.artic.edu/api/v1/artworks/search', {
      params: {
        q: 'painting',
        'query[term][is_public_domain]': true,
        limit: 100,
        fields: 'id,title,artist_display,date_display,medium_display,image_id,place_of_origin,artist_title'
      }
    });

    const data = response.data.data;
    const results = data.filter(item => item.image_id).map(item => ({
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
      }
    }));

    console.log(`✅ Fetched ${results.length} from AIC.`);
    return results;
  } catch (error) {
    console.error('❌ Error fetching AIC:', error.message);
    return [];
  }
}

// API 2: The Met (With Concurrency Control)
async function fetchMet() {
  console.log('Fetching from The Met...');
  try {
    // Step 1: Search IDs
    const searchRes = await axios.get('https://collectionapi.metmuseum.org/public/collection/v1/search', {
      params: {
        q: 'painting',
        hasImages: true,
        medium: 'Paintings'
      }
    });

    if (!searchRes.data.objectIDs) {
        throw new Error('No IDs found');
    }

    const objectIDs = searchRes.data.objectIDs.slice(0, 100); // Take first 100
    const results = [];
    const concurrencyLimit = 5;

    // Step 2: Fetch details with concurrency limit
    for (let i = 0; i < objectIDs.length; i += concurrencyLimit) {
      const chunk = objectIDs.slice(i, i + concurrencyLimit);
      const promises = chunk.map(id => 
        axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${id}`)
          .then(res => res.data)
          .catch(() => null) // Ignore errors for individual items
      );

      const items = await Promise.all(promises);
      
      items.forEach(item => {
        if (item && item.primaryImageSmall) {
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
            }
          });
        }
      });
      
      // Optional: progress indicator
      process.stdout.write(`\r...Met Progress: ${Math.min(i + concurrencyLimit, objectIDs.length)}/${objectIDs.length}`);
    }
    console.log(`\n✅ Fetched ${results.length} from The Met.`);
    return results;

  } catch (error) {
    console.error('❌ Error fetching Met:', error.message);
    return [];
  }
}

// API 3: Rijksmuseum
async function fetchRijks() {
  if (!RIJKS_API_KEY) {
    console.warn('⚠️ Rijksmuseum API key missing. Skipping...');
    return [];
  }

  console.log('Fetching from Rijksmuseum...');
  try {
    const response = await axios.get('https://www.rijksmuseum.nl/api/en/collection', {
      params: {
        key: RIJKS_API_KEY,
        format: 'json',
        type: 'painting',
        imgonly: true,
        ps: 100
      }
    });

    const data = response.data.artObjects;
    const results = data.map(item => ({
      id: `rijks-${item.objectNumber}`,
      source: 'RIJKS',
      title: item.title,
      artist: item.principalOrFirstMaker,
      imageUrl: item.webImage ? item.webImage.url : '',
      date: item.longTitle.match(/\d{4}/)?.[0] || 'Unknown', // Extract year roughly
      medium: 'Oil on canvas (Assumed)', // API list endpoint doesn't usually allow detailed medium without detail call
      hints: {
        location: 'Rijksmuseum, Amsterdam',
        bio: item.productionPlaces?.join(', ') || 'The Netherlands'
      }
    })).filter(item => item.imageUrl);

    console.log(`✅ Fetched ${results.length} from Rijksmuseum.`);
    return results;
  } catch (error) {
    console.error('❌ Error fetching Rijksmuseum:', error.message);
    return [];
  }
}

async function main() {
  console.log('🎨 Starting painting data seed...');
  
  const [aic, met, rijks] = await Promise.all([
    fetchAIC(),
    fetchMet(),
    fetchRijks()
  ]);

  let allPaintings = [...aic, ...met, ...rijks];
  
  // Clean up: Ensure critical fields exist
  allPaintings = allPaintings.filter(p => p.imageUrl && p.title && p.artist);
  
  // Shuffle
  allPaintings = shuffle(allPaintings);

  // Ensure output dir exists
  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Write file
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allPaintings, null, 2));
  console.log(`\n🎉 Success! Saved ${allPaintings.length} paintings to ${OUTPUT_FILE}`);
}

main();
