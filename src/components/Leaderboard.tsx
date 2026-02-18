'use client';

import { useEffect, useState } from 'react';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  totalPoints: number;
  gamesPlayed: number;
}

interface LeaderboardData {
  weekStart: string;
  leaderboard: LeaderboardEntry[];
}

export default function Leaderboard({ mode, refreshKey }: { mode?: string; refreshKey?: number }) {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = mode ? `/api/leaderboard?mode=${mode}` : '/api/leaderboard';
    fetch(url)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [mode, refreshKey]);

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
      <h3 className="text-lg font-bold mb-1">Weekly Leaderboard</h3>
      {data && (
        <p className="text-xs text-gray-500 mb-3">
          Week of {new Date(data.weekStart).toLocaleDateString()}
        </p>
      )}
      {loading && <p className="text-gray-500 animate-pulse text-sm">Loading...</p>}
      {!loading && data?.leaderboard.length === 0 && (
        <p className="text-gray-500 text-sm">No scores yet this week. Be the first!</p>
      )}
      {!loading && data && data.leaderboard.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left pb-2 w-8">#</th>
              <th className="text-left pb-2">Player</th>
              <th className="text-right pb-2">Pts</th>
              <th className="text-right pb-2">Games</th>
            </tr>
          </thead>
          <tbody>
            {data.leaderboard.map(entry => (
              <tr key={entry.userId} className="border-b border-gray-700/50 last:border-0">
                <td className="py-2 text-gray-400">{entry.rank}</td>
                <td className="py-2 font-medium truncate max-w-[120px]">{entry.name}</td>
                <td className="py-2 text-right text-yellow-400 font-bold">{entry.totalPoints}</td>
                <td className="py-2 text-right text-gray-400">{entry.gamesPlayed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
