'use client';

import { GameMode } from '@/lib/types';

interface ModeSelectorProps {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}

export default function ModeSelector({ mode, onChange }: ModeSelectorProps) {
  return (
    <div className="flex items-center gap-2 px-8 pt-4">
      <div className="flex rounded-lg overflow-hidden border border-gray-600">
        <button
          onClick={() => onChange('painting')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            mode === 'painting'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Guess the Artist
        </button>
        <button
          onClick={() => onChange('school')}
          className={`px-4 py-2 text-sm font-semibold transition-colors border-l border-gray-600 ${
            mode === 'school'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Guess the School
        </button>
      </div>
    </div>
  );
}
