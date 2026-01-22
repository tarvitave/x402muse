'use client';

import { useState, useEffect } from 'react';

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
    active: boolean;
    hints: Hint[];
}

const ITEMS_PER_PAGE = 20;

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; artist: string }>({ title: '', artist: '' });

  const loadData = async () => {
      try {
          const res = await fetch('/api/admin/paintings/list?t=' + new Date().getTime());
           if (res.ok) {
              const data = await res.json();
              // Sort by Source, then by ID to keep consistent
              const sorted = data.sort((a: Painting, b: Painting) => {
                  const sourceA = a.source || 'UNK';
                  const sourceB = b.source || 'UNK';
                  return sourceA.localeCompare(sourceB);
              });
              setPaintings(sorted);
          }
      } catch (e) {
          console.error("Failed to load current data");
      }
  };

  useEffect(() => {
      loadData();
  }, []);

  const toggleActive = async (id: string, currentStatus: boolean) => {
      try {
          const res = await fetch(`/api/admin/paintings/${id}`, {
              method: 'PATCH',
              body: JSON.stringify({ active: !currentStatus })
          });
          if (res.ok) {
              setPaintings(prev => prev.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
          }
      } catch (e) {
          alert('Failed to update status');
      }
  };

  const startEdit = (p: Painting) => {
      setEditingId(p.id);
      setEditForm({ title: p.title, artist: p.artist });
  };

  const saveEdit = async (id: string) => {
      try {
          const res = await fetch(`/api/admin/paintings/${id}`, {
              method: 'PATCH',
              body: JSON.stringify(editForm)
          });
          if (res.ok) {
              setPaintings(prev => prev.map(p => p.id === id ? { ...p, ...editForm } : p));
              setEditingId(null);
          }
      } catch (e) {
          alert('Failed to save changes');
      }
  };

  const runSeeder = async () => {
    setLoading(true);
    setMessage('Seeding... this might take 60-90 seconds.');
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        let msg = `Success! Seeded ${data.count} paintings.`;
        if (data.breakdown) {
            const details = Object.entries(data.breakdown).map(([k, v]) => `${k}: ${v}`).join(', ');
            msg += ` [${details}]`;
        }
        setMessage(msg);
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
                            <th className="p-3">Status</th>
                            <th className="p-3">Details (Editable)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {displayedPaintings.map((p) => (
                            <tr key={p.id} className={`hover:bg-gray-750 ${!p.active ? 'opacity-50' : ''}`}>
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
                                    <div className="relative h-16 w-16 bg-gray-700 rounded">
                                        <img
                                            src={`/api/image-proxy?url=${encodeURIComponent(p.imageUrl)}`}
                                            alt={p.title}
                                            className="object-cover rounded w-full h-full"
                                        />
                                    </div>
                                </td>
                                <td className="p-3">
                                    <button 
                                        onClick={() => toggleActive(p.id, p.active)}
                                        className={`px-3 py-1 rounded text-xs font-bold ${
                                            p.active ? 'bg-green-600' : 'bg-red-600'
                                        }`}
                                    >
                                        {p.active ? 'Active' : 'Disabled'}
                                    </button>
                                </td>
                                <td className="p-3">
                                    {editingId === p.id ? (
                                        <div className="space-y-2">
                                            <input 
                                                className="w-full text-black px-2 py-1 rounded" 
                                                value={editForm.title} 
                                                onChange={e => setEditForm({...editForm, title: e.target.value})}
                                            />
                                            <input 
                                                className="w-full text-black px-2 py-1 rounded" 
                                                value={editForm.artist} 
                                                onChange={e => setEditForm({...editForm, artist: e.target.value})}
                                            />
                                            <div className="flex gap-2">
                                                <button onClick={() => saveEdit(p.id)} className="bg-blue-600 px-3 py-1 rounded text-xs">Save</button>
                                                <button onClick={() => setEditingId(null)} className="bg-gray-600 px-3 py-1 rounded text-xs">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div onClick={() => startEdit(p)} className="cursor-pointer hover:text-blue-300 group">
                                            <div className="font-bold text-white flex items-center gap-2">
                                                {p.title}
                                                <span className="opacity-0 group-hover:opacity-100 text-xs text-gray-400">✎</span>
                                            </div>
                                            <div className="text-yellow-500">{p.artist}</div>
                                        </div>
                                    )}
                                    <div className="mt-2 text-sm text-gray-400">
                                    <ul className="list-disc pl-4 space-y-1">
                                        {p.hints.map(h => (
                                            <li key={h.id}>
                                                <span className="text-gray-500 uppercase text-xs tracking-wider">{h.label}:</span>{' '}
                                                <span className="text-gray-300">{h.content}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    </div>
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
