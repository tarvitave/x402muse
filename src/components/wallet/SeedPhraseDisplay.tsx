'use client';

interface SeedPhraseDisplayProps {
  words: string[];
}

export default function SeedPhraseDisplay({ words }: SeedPhraseDisplayProps) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {words.map((word, i) => (
        <div
          key={i}
          className="bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm font-mono"
        >
          <span className="text-gray-500 mr-2">{i + 1}.</span>
          {word}
        </div>
      ))}
    </div>
  );
}
