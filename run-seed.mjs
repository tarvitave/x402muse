// Direct seeder - run this on the server: node run-seed.mjs
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { createClient } from '@libsql/client';

const THUMBNAILS_DIR = path.join(process.cwd(), 'public', 'thumbnails');
const IMAGES_DIR = path.join(process.cwd(), 'public', 'images');

// Create directories
if (!fs.existsSync(THUMBNAILS_DIR)) fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });

console.log('Thumbnails dir:', THUMBNAILS_DIR);
console.log('Images dir:', IMAGES_DIR);

// Database
const dbPath = process.env.DATABASE_URL || 'file:./dev.db';
console.log('Database:', dbPath);
const db = createClient({ url: dbPath });

// Clear existing data
console.log('Clearing existing data...');
await db.execute('DELETE FROM Hint');
await db.execute('DELETE FROM Painting');

// Fetch AIC
console.log('Fetching AIC paintings...');
const aicRes = await axios.get('https://api.artic.edu/api/v1/artworks/search', {
  params: {
    q: 'painting',
    'query[term][is_public_domain]': true,
    limit: 50,
    fields: 'id,title,artist_title,image_id,place_of_origin'
  }
});

let count = 0;
let failed = 0;

for (const item of aicRes.data.data) {
  if (!item.image_id || !item.title || !item.artist_title) continue;

  const id = `aic-${item.id}`;
  const imageUrl = `https://www.artic.edu/iiif/2/${item.image_id}/full/843,/0/default.jpg`;

  console.log(`Processing ${id}...`);

  try {
    const imgRes = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 30000,
    });

    const buffer = Buffer.from(imgRes.data);
    const imagePath = path.join(IMAGES_DIR, `${id}.jpg`);
    fs.writeFileSync(imagePath, buffer);

    const thumbPath = path.join(THUMBNAILS_DIR, `${id}_thumb.jpg`);
    await sharp(buffer).resize(150, 150, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);

    await db.execute({
      sql: 'INSERT INTO Painting (id, source, title, artist, imageUrl, thumbnailPath, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [id, 'AIC', item.title, item.artist_title, `/images/${id}.jpg`, `/thumbnails/${id}_thumb.jpg`, 1]
    });

    await db.execute({
      sql: 'INSERT INTO Hint (id, paintingId, label, content, costSol, isLocked) VALUES (?, ?, ?, ?, ?, ?)',
      args: [`${id}-1`, id, 'Where is it displayed?', 'Art Institute of Chicago, USA', 0.01, 1]
    });
    await db.execute({
      sql: 'INSERT INTO Hint (id, paintingId, label, content, costSol, isLocked) VALUES (?, ?, ?, ?, ?, ?)',
      args: [`${id}-2`, id, 'Artist Context', item.place_of_origin || 'Unknown origin', 0.01, 1]
    });

    count++;
    console.log(`  OK: ${item.title}`);
  } catch (err) {
    failed++;
    console.log(`  FAILED: ${err.message}`);
  }
}

// Fetch MET
console.log('\nFetching MET paintings...');
try {
  const metSearch = await axios.get('https://collectionapi.metmuseum.org/public/collection/v1/search', {
    params: { q: 'painting', hasImages: true }
  });

  const metIds = metSearch.data.objectIDs?.slice(0, 50) || [];

  for (const objId of metIds) {
    try {
      const objRes = await axios.get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${objId}`);
      const item = objRes.data;

      if (!item.primaryImageSmall || !item.title || !item.artistDisplayName) continue;

      const id = `met-${item.objectID}`;
      console.log(`Processing ${id}...`);

      const imgRes = await axios.get(item.primaryImageSmall, {
        responseType: 'arraybuffer',
        timeout: 30000,
      });

      const buffer = Buffer.from(imgRes.data);
      const imagePath = path.join(IMAGES_DIR, `${id}.jpg`);
      fs.writeFileSync(imagePath, buffer);

      const thumbPath = path.join(THUMBNAILS_DIR, `${id}_thumb.jpg`);
      await sharp(buffer).resize(150, 150, { fit: 'cover' }).jpeg({ quality: 80 }).toFile(thumbPath);

      await db.execute({
        sql: 'INSERT INTO Painting (id, source, title, artist, imageUrl, thumbnailPath, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, 'MET', item.title, item.artistDisplayName, `/images/${id}.jpg`, `/thumbnails/${id}_thumb.jpg`, 1]
      });

      await db.execute({
        sql: 'INSERT INTO Hint (id, paintingId, label, content, costSol, isLocked) VALUES (?, ?, ?, ?, ?, ?)',
        args: [`${id}-1`, id, 'Where is it displayed?', 'The Metropolitan Museum of Art, New York', 0.01, 1]
      });
      await db.execute({
        sql: 'INSERT INTO Hint (id, paintingId, label, content, costSol, isLocked) VALUES (?, ?, ?, ?, ?, ?)',
        args: [`${id}-2`, id, 'Artist Context', item.artistDisplayBio || item.culture || 'Unknown', 0.01, 1]
      });

      count++;
      console.log(`  OK: ${item.title}`);
    } catch (err) {
      failed++;
    }
  }
} catch (err) {
  console.log('MET API error:', err.message);
}

const result = await db.execute('SELECT COUNT(*) as count FROM Painting');
console.log(`\n========================================`);
console.log(`Done! Inserted ${count} paintings (${failed} failed)`);
console.log(`Database count: ${result.rows[0].count}`);
console.log(`Thumbnails: ${fs.readdirSync(THUMBNAILS_DIR).length} files`);
console.log(`Images: ${fs.readdirSync(IMAGES_DIR).length} files`);

db.close();
