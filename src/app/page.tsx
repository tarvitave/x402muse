'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import ModeSelector from '@/components/ModeSelector';
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

export default function Home() {
  const [mode, setMode] = useState<GameMode>('painting');

  return (
    <main className="min-h-screen">
      <ModeSelector mode={mode} onChange={setMode} />
      <Game mode={mode} />
    </main>
  );
}
