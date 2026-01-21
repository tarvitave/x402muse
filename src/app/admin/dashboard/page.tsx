'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Hint {
    id: string;
    label: string;
    content: string;
}

interface Painting {
    id: string;
    source?: string;
    title: string;
    artist: string;
    imageUrl: string;
    hints: Hint[];
}

const ITEMS_PER_PAGE = 20;

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const loadData = async () => {
      try {
          // Fetch from API instead of static file to avoid caching/serving issues in Docker
          const res = await fetch('/api/paintings?t=' + new Date().getTime());
          if (res.ok) {
              const data = await res.json();
              // Sort by Source, then by ID to keep consistent
              const sorted = data.sort((a: Painting, b: Painting) => {
                  const sourceA = a.source || 'UNK';
                  const sourceB = b.source || 'UNK';
                  return sourceA.localeCompare(sourceB);
              });
              setPaintings(sorted);
              setCurrentPage(1);
          }
      } catch (e) {
          console.error("Failed to load current data");
      }
  };

  useEffect(() => {
      loadData();
  }, []);

  const runSeeder = async () => {
    setLoading(true);
    setMessage('Seeding... this might take 60-90 seconds.');
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Success! Seeded ${data.count} paintings.`);
        loadData(); // Refresh list
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e) {
      setMessage('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  // Pagination Logic
  const totalPages = Math.ceil(paintings.length / ITEMS_PER_PAGE);
  const displayedPaintings = paintings.slice(
      (currentPage - 1) * ITEMS_PER_PAGE,
      currentPage * ITEMS_PER_PAGE
  );

  const goToPage = (page: number) => {
      if (page >= 1 && page <= totalPages) {
          setCurrentPage(page);
      }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 border-b border-gray-700 pb-4">Admin Dashboard</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-8">
          <h2 className="text-xl font-semibold mb-4">Content Management</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300">Reseed Paintings Database</p>
              <p className="text-sm text-gray-500 mt-1">Fetches fresh data (~100 items) from Met/AIC APIs.</p>
            </div>
            <button
              onClick={runSeeder}
              disabled={loading}
              className={`px-6 py-2 rounded font-bold ${
                loading 
                  ? 'bg-gray-600 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Running...' : 'Run Seed Script'}
            </button>
          </div>
          {message && (
            <div className={`mt-4 p-3 rounded ${message.startsWith('Success') ? 'bg-green-900/50 text-green-200' : 'bg-blue-900/50 text-blue-200'}`}>
              {message}
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6 flex justify-between items-center">
                <span>Current Database</span>
                <span className="text-sm font-normal text-gray-400">
                    {paintings.length} items loaded (Page {currentPage} of {totalPages})
                </span>
            </h2>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                            <th className="p-3">Source</th>
                            <th className="p-3">Image</th>
                            <th className="p-3">Title / Artist (Answer)</th>
                            <th className="p-3">Hints</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {displayedPaintings.map((p) => (
                            <tr key={p.id} className="hover:bg-gray-750">
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                                        p.source === 'AIC' ? 'bg-red-900 text-red-200' : 
                                        p.source === 'MET' ? 'bg-blue-900 text-blue-200' :
                                        p.source === 'RIJKS' ? 'bg-orange-900 text-orange-200' :
                                        'bg-gray-700 text-gray-300'
                                    }`}>
                                        {p.source || 'UNK'}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="relative h-16 w-16">
                                        <Image 
                                            src={p.imageUrl} 
                                            alt={p.title} 
                                            layout="fill" 
                                            objectFit="cover" 
                                            className="rounded"
                                        />
                                    </div>
                                </td>
                                <td className="p-3">
                                    <div className="font-bold text-white">{p.title}</div>
                                    <div className="text-yellow-500">{p.artist}</div>
                                </td>
                                <td className="p-3 text-sm text-gray-400">
                                    <ul className="list-disc pl-4 space-y-1">
                                        {p.hints.map(h => (
                                            <li key={h.id}>
                                                <span className="text-gray-500 uppercase text-xs tracking-wider">{h.label}:</span>{' '}
                                                <span className="text-gray-300">{h.content}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </td>
                            </tr>
                        ))}
                        {paintings.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-gray-500">
                                    No data found. Is the database seeded?
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-6 space-x-2">
                    <button 
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 rounded ${
                            currentPage === 1 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                        }`}
                    >
                        Previous
                    </button>
                    
                    <div className="flex space-x-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => goToPage(page)}
                                className={`w-8 h-8 rounded flex items-center justify-center ${
                                    currentPage === page
                                        ? 'bg-blue-600 text-white font-bold'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 rounded ${
                            currentPage === totalPages 
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                                : 'bg-gray-600 hover:bg-gray-500 text-white'
                        }`}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
