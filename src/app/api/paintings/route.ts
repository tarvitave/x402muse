import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define the path to match where the seeder writes
const DATA_FILE = path.join(process.cwd(), 'public', 'paintings.json');

export async function GET() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return NextResponse.json([], { status: 200 }); // Return empty if not seeded yet
    }
    
    const fileContents = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error reading paintings file:', error);
    return NextResponse.json({ error: 'Failed to load data' }, { status: 500 });
  }
}
