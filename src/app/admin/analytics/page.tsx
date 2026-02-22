'use client';

import { useState, useEffect } from 'react';
import AdminNav from '@/components/AdminNav';

interface AnalyticsData {
  summary: {
    today: number;
    week: number;
    month: number;
    total: number;
    users: number;
    scores: number;
  };
  dailyViews: { day: string; views: number }[];
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  gameStats: { mode: string; games: number; totalPoints: number }[];
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
      <p className="text-gray-400 text-xs uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value.toLocaleString()}</p>
      {sub && <p className="text-gray-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

function BarChart({ data, maxBars = 30 }: { data: { label: string; value: number }[]; maxBars?: number }) {
  const sliced = data.slice(-maxBars);
  const max = Math.max(...sliced.map(d => d.value), 1);

  return (
    <div className="flex items-end gap-[2px] h-32">
      {sliced.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center group relative">
          <div
            className="w-full bg-purple-500 rounded-t min-h-[2px] transition-all hover:bg-purple-400"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <div className="hidden group-hover:block absolute -top-8 bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
            {d.label}: {d.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(d => {
        if (d.error) return;
        setData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <AdminNav />

        {loading ? (
          <p className="text-gray-400 animate-pulse">Loading analytics...</p>
        ) : !data ? (
          <p className="text-red-400">Failed to load analytics data.</p>
        ) : (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Page Views</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Today" value={data.summary.today} />
                <StatCard label="Last 7 Days" value={data.summary.week} />
                <StatCard label="This Month" value={data.summary.month} />
                <StatCard label="All Time" value={data.summary.total} />
              </div>
            </div>

            {/* User & Game Stats */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Users & Games</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="Registered Users" value={data.summary.users} />
                <StatCard label="Total Games Played" value={data.summary.scores} />
                {data.gameStats.map(gs => (
                  <StatCard
                    key={gs.mode}
                    label={gs.mode === 'painting' ? 'Painting Games' : 'School Games'}
                    value={gs.games}
                    sub={`${gs.totalPoints} total pts`}
                  />
                ))}
              </div>
            </div>

            {/* Daily Views Chart */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
              <h3 className="text-lg font-semibold mb-4">Daily Views (Last 30 Days)</h3>
              {data.dailyViews.length > 0 ? (
                <>
                  <BarChart
                    data={data.dailyViews.map(d => ({
                      label: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                      value: d.views,
                    }))}
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>{data.dailyViews.length > 0 && new Date(data.dailyViews[0].day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    <span>Today</span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-sm">No data yet. Views will appear once visitors start browsing.</p>
              )}
            </div>

            {/* Top Pages & Referrers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h3 className="text-lg font-semibold mb-3">Top Pages</h3>
                {data.topPages.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left pb-2">Page</th>
                        <th className="text-right pb-2">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topPages.map((p, i) => (
                        <tr key={i} className="border-b border-gray-700/50 last:border-0">
                          <td className="py-2 text-white font-mono text-xs">{p.path}</td>
                          <td className="py-2 text-right text-gray-300">{p.views.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-sm">No page views yet.</p>
                )}
              </div>

              <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                <h3 className="text-lg font-semibold mb-3">Top Referrers</h3>
                {data.topReferrers.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-700">
                        <th className="text-left pb-2">Referrer</th>
                        <th className="text-right pb-2">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topReferrers.map((r, i) => (
                        <tr key={i} className="border-b border-gray-700/50 last:border-0">
                          <td className="py-2 text-white text-xs truncate max-w-[200px]">{r.referrer}</td>
                          <td className="py-2 text-right text-gray-300">{r.views.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 text-sm">No external referrers yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
