'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import ModeSelector from '@/components/ModeSelector';
import Leaderboard from '@/components/Leaderboard';
import { GameMode } from '@/lib/types';

const Game = dynamic(
  () => import('@/components/Game').then((m) => m.GameContent),
  {
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="text-gray-500 animate-pulse">Loading...</div>
      </div>
    ),
  }
);

interface GamePageProps {
  fixedMode?: GameMode;
}

export default function GamePage({ fixedMode }: GamePageProps) {
  const [mode, setMode] = useState<GameMode>(fixedMode ?? 'painting');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleScoreSubmitted = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <main className="min-h-screen">
      {!fixedMode && <ModeSelector mode={mode} onChange={setMode} />}
      <div className="flex flex-col xl:flex-row gap-6 px-4 pb-8 pt-4">
        <div className="flex-1 min-w-0">
          <Game mode={mode} onScoreSubmitted={handleScoreSubmitted} />
        </div>
        <div className="w-full xl:w-72 shrink-0">
          <Leaderboard mode={mode} refreshKey={refreshKey} />
        </div>
      </div>
    </main>
  );
}
