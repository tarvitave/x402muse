'use client';

import { useState, useEffect } from 'react';
import { paintings as initialPaintings } from '@/data/paintings';
import { Painting, Hint } from '@/lib/types';
import HintCard from './HintCard';
import Image from 'next/image';

export default function Game() {
  const [currentPainting, setCurrentPainting] = useState<Painting | null>(null);
  const [guess, setGuess] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [unlockedHints, setUnlockedHints] = useState<Record<string, string>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Initialize with static data immediately on mount
    setCurrentPainting(initialPaintings[0]);

    // Attempt to load fresh data from API
    fetch('/api/paintings?t=' + new Date().getTime())
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('No seed data');
      })
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          console.log('Loaded seeded data:', data.length);
          setCurrentPainting(data[0]);
        }
      })
      .catch((e) => console.log('Using default static data'));
  }, []);

  // Avoid hydration mismatch by waiting for mount
  if (!mounted || !currentPainting) {
      return (
        <div className="flex justify-center items-center min-h-[50vh]">
            <div className="text-gray-500 animate-pulse">Loading masterpiece...</div>
        </div>
      );
  }

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.toLowerCase() === currentPainting.artist.toLowerCase()) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
    }
  };

  const handleHintUnlock = (id: string, content: string) => {
    setUnlockedHints((prev) => ({ ...prev, [id]: content }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8">
      <div className="flex-1">
        <div className="relative w-full h-96">
          <Image
            src={currentPainting.imageUrl}
            alt={currentPainting.title}
            fill
            className="object-contain transition-all duration-500"
            sizes="(max-width: 768px) 100vw, 50vw"
            style={{ 
                filter: isCorrect ? 'none' : currentPainting.blurLevel 
            }}
          />
        </div>
        {isCorrect && (
          <div className="mt-4 text-center">
            <h2 className="text-3xl font-bold text-green-400">Correct!</h2>
            <p className="text-xl">{currentPainting.title} by {currentPainting.artist}</p>
          </div>
        )}
        <form onSubmit={handleGuess} className="mt-4">
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Guess the artist..."
            className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:border-yellow-500"
          />
          <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Submit Guess
          </button>
        </form>
        {isCorrect === false && <p className="mt-2 text-red-500">Incorrect guess. Try again!</p>}
      </div>
      <div className="w-full md:w-1/3">
        <h3 className="text-2xl font-bold mb-4">Hints</h3>
        <div className="space-y-4">
          {currentPainting.hints.map((hint) => (
            <HintCard
              key={hint.id}
              hint={{
                ...hint,
                isLocked: !unlockedHints[hint.id],
                content: unlockedHints[hint.id] || '********'
              }}
              onUnlock={handleHintUnlock}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
