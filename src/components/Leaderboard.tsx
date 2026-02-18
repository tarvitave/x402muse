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

function LeaderboardTable({ entries, loading, emptyText }: {
  entries: LeaderboardEntry[];
  loading: boolean;
  emptyText: string;
}) {
  if (loading) return <p className="text-gray-400 animate-pulse text-sm">Loading...</p>;
  if (entries.length === 0) return <p className="text-gray-400 text-sm">{emptyText}</p>;

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-gray-300 border-b border-gray-600">
          <th className="text-left pb-2 w-8">#</th>
          <th className="text-left pb-2">Player</th>
          <th className="text-right pb-2">Pts</th>
          <th className="text-right pb-2">Games</th>
        </tr>
      </thead>
      <tbody>
        {entries.map(entry => (
          <tr key={entry.userId} className="border-b border-gray-700/50 last:border-0">
            <td className="py-2 text-gray-300">{entry.rank}</td>
            <td className="py-2 font-medium text-white truncate max-w-[120px]">{entry.name}</td>
            <td className="py-2 text-right text-yellow-400 font-bold">{entry.totalPoints}</td>
            <td className="py-2 text-right text-gray-300">{entry.gamesPlayed}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function Leaderboard({ mode, refreshKey }: { mode?: string; refreshKey?: number }) {
  const [weeklyData, setWeeklyData] = useState<LeaderboardData | null>(null);
  const [alltimeData, setAlltimeData] = useState<LeaderboardData | null>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(true);
  const [loadingAlltime, setLoadingAlltime] = useState(true);

  useEffect(() => {
    setLoadingWeekly(true);
    setLoadingAlltime(true);
    const base = mode ? `mode=${mode}` : '';

    fetch(`/api/leaderboard?${base}`)
      .then(r => r.json())
      .then(setWeeklyData)
      .catch(() => {})
      .finally(() => setLoadingWeekly(false));

    fetch(`/api/leaderboard?period=alltime&${base}`)
      .then(r => r.json())
      .then(setAlltimeData)
      .catch(() => {})
      .finally(() => setLoadingAlltime(false));
  }, [mode, refreshKey]);

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-lg font-bold text-white mb-1">Weekly Leaderboard</h3>
        {weeklyData && (
          <p className="text-xs text-gray-400 mb-3">
            Week of {new Date(weeklyData.weekStart).toLocaleDateString()}
          </p>
        )}
        <LeaderboardTable
          entries={weeklyData?.leaderboard ?? []}
          loading={loadingWeekly}
          emptyText="No scores yet this week. Be the first!"
        />
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
        <h3 className="text-lg font-bold text-white mb-3">All-Time Leaderboard</h3>
        <LeaderboardTable
          entries={alltimeData?.leaderboard ?? []}
          loading={loadingAlltime}
          emptyText="No scores yet. Start playing!"
        />
      </div>
    </div>
  );
}
