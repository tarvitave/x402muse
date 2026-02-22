'use client';

import { useState, useEffect } from 'react';
import AdminNav from '@/components/AdminNav';

interface SeoResult {
  url: string;
  title: string | null;
  description: string | null;
  h1Count: number;
  h2Count: number;
  imgWithoutAlt: number;
  hasCanonical: boolean;
  hasViewport: boolean;
  hasOgTitle: boolean;
  hasOgDescription: boolean;
  hasOgImage: boolean;
  issues: string[];
  score: number;
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'bg-green-600' : score >= 50 ? 'bg-yellow-600' : 'bg-red-600';
  return (
    <span className={`${color} text-white text-xs font-bold px-2 py-1 rounded`}>
      {score}/100
    </span>
  );
}

function CheckMark({ ok }: { ok: boolean }) {
  return ok
    ? <span className="text-green-400 text-sm">Yes</span>
    : <span className="text-red-400 text-sm">No</span>;
}

export default function SeoPage() {
  const [pages, setPages] = useState<SeoResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  const runAnalysis = () => {
    setLoading(true);
    fetch('/api/admin/seo')
      .then(r => r.json())
      .then(data => setPages(data.pages || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { runAnalysis(); }, []);

  const avgScore = pages.length > 0
    ? Math.round(pages.reduce((sum, p) => sum + p.score, 0) / pages.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>
        <AdminNav />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">SEO Analysis</h2>
            <p className="text-gray-400 text-sm mt-1">Checks each page for common SEO best practices.</p>
          </div>
          <button
            onClick={runAnalysis}
            disabled={loading}
            className={`px-4 py-2 rounded font-semibold text-sm ${
              loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            {loading ? 'Analyzing...' : 'Re-run Analysis'}
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 animate-pulse">Scanning pages...</p>
        ) : (
          <div className="space-y-6">
            {/* Overall Score */}
            <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex items-center gap-4">
              <div className={`text-4xl font-bold ${avgScore >= 80 ? 'text-green-400' : avgScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {avgScore}
              </div>
              <div>
                <p className="text-white font-semibold">Average SEO Score</p>
                <p className="text-gray-400 text-sm">{pages.length} pages analyzed</p>
              </div>
            </div>

            {/* Per-Page Results */}
            {pages.map((page) => (
              <div key={page.url} className="bg-gray-800 rounded-lg border border-gray-700">
                <button
                  onClick={() => setExpandedPage(expandedPage === page.url ? null : page.url)}
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-750 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <ScoreBadge score={page.score} />
                    <span className="font-mono text-sm text-white">{page.url}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-xs">
                      {page.issues.filter(i => i !== 'No issues found').length} issue(s)
                    </span>
                    <span className="text-gray-500">{expandedPage === page.url ? '\u25B2' : '\u25BC'}</span>
                  </div>
                </button>

                {expandedPage === page.url && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
                    {/* Meta Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Title Tag</p>
                        <p className="text-sm text-white">{page.title || <span className="text-red-400">Missing</span>}</p>
                        {page.title && <p className="text-xs text-gray-500">{page.title.length} characters</p>}
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Meta Description</p>
                        <p className="text-sm text-white">{page.description || <span className="text-red-400">Missing</span>}</p>
                        {page.description && <p className="text-xs text-gray-500">{page.description.length} characters</p>}
                      </div>
                    </div>

                    {/* Checklist */}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">SEO Checklist</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckMark ok={page.h1Count === 1} />
                          <span className="text-gray-300">H1 Tag ({page.h1Count})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckMark ok={page.hasViewport} />
                          <span className="text-gray-300">Viewport</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckMark ok={page.hasCanonical} />
                          <span className="text-gray-300">Canonical</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckMark ok={page.imgWithoutAlt === 0} />
                          <span className="text-gray-300">Alt Text</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckMark ok={page.hasOgTitle} />
                          <span className="text-gray-300">OG Title</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckMark ok={page.hasOgDescription} />
                          <span className="text-gray-300">OG Description</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckMark ok={page.hasOgImage} />
                          <span className="text-gray-300">OG Image</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400 text-sm">{page.h2Count}</span>
                          <span className="text-gray-300">H2 Tags</span>
                        </div>
                      </div>
                    </div>

                    {/* Issues */}
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Issues & Recommendations</p>
                      <ul className="space-y-1">
                        {page.issues.map((issue, i) => (
                          <li key={i} className={`text-sm flex items-start gap-2 ${
                            issue === 'No issues found' ? 'text-green-400' : 'text-yellow-300'
                          }`}>
                            <span>{issue === 'No issues found' ? '\u2713' : '\u26A0'}</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
