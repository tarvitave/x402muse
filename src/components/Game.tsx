'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { paintings as initialPaintings } from '@/data/paintings';
import { Painting, Hint } from '@/lib/types';
import HintCard from './HintCard';

function GameContent() {
  const [currentPainting, setCurrentPainting] = useState<Painting | null>(null);
  const [guess, setGuess] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [unlockedHints, setUnlockedHints] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [guessesLeft, setGuessesLeft] = useState(5);
  const [blurLevel, setBlurLevel] = useState(20);

  useEffect(() => {
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
        } else {
          setCurrentPainting(initialPaintings[0]);
        }
      })
      .catch((e) => {
        console.log('Using default static data');
        setCurrentPainting(initialPaintings[0]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !currentPainting) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-gray-500 animate-pulse">Loading masterpiece...</div>
      </div>
    );
  }

  const handleGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.toLowerCase().trim() === currentPainting.artist.toLowerCase().trim()) {
      setIsCorrect(true);
    } else {
      setIsCorrect(false);
      setGuessesLeft((prev) => Math.max(0, prev - 1));
    }
  };

  const handleReduceBlur = () => {
    setBlurLevel((prev) => Math.max(0, prev - 5));
    setGuessesLeft((prev) => Math.max(0, prev - 1));
  };

  const handleHintUnlock = (id: string, content: string) => {
    setUnlockedHints((prev) => ({ ...prev, [id]: content }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 p-8">
      <div className="flex-1">
        <div className="relative w-full h-96">
          <img
            src={currentPainting.imageUrl}
            alt={currentPainting.title}
            className="absolute inset-0 w-full h-full object-contain transition-all duration-500"
            style={{
                filter: isCorrect ? 'none' : `blur(${blurLevel}px)`
            }}
          />
        </div>
        {!isCorrect && (
          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={handleReduceBlur}
              disabled={blurLevel <= 0 || guessesLeft <= 0}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
              Less Blur
            </button>
            <span className="text-gray-400 text-sm">
              {guessesLeft} free {guessesLeft === 1 ? 'guess' : 'guesses'} left
            </span>
          </div>
        )}
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
            disabled={guessesLeft <= 0 && !isCorrect}
            className="w-full p-2 bg-gray-800 text-white border border-gray-600 rounded placeholder-gray-400 focus:outline-none focus:border-yellow-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={guessesLeft <= 0 && !isCorrect}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Submit Guess
          </button>
        </form>
        {isCorrect === false && guessesLeft > 0 && <p className="mt-2 text-red-500">Incorrect guess. Try again!</p>}
        {guessesLeft <= 0 && !isCorrect && (
          <p className="mt-2 text-red-500">No guesses left! Unlock hints to help, or the answer is: <span className="font-bold text-yellow-400">{currentPainting.artist}</span></p>
        )}
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

// Export with SSR disabled to avoid hydration mismatch
export default dynamic(() => Promise.resolve(GameContent), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center min-h-[50vh]">
      <div className="text-gray-500 animate-pulse">Loading masterpiece...</div>
    </div>
  ),
});
