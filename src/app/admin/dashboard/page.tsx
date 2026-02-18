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
    thumbnailPath?: string;
    active: boolean;
    hints: Hint[];
}

interface EditForm {
    title: string;
    artist: string;
    hints: { id: string; label: string; content: string }[];
}

const ITEMS_PER_PAGE = 20;

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [paintings, setPaintings] = useState<Painting[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ title: '', artist: '', hints: [] });

  const loadData = async () => {
      try {
          setError('');
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
          } else {
              const errData = await res.json().catch(() => ({}));
              setError(`Failed to load: ${res.status} - ${errData.error || 'Unknown error'}`);
          }
      } catch (e) {
          console.error("Failed to load current data:", e);
          setError(`Network error: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
  };

  useEffect(() => {
      loadData();
  }, []);

  const toggleActive = async (id: string, currentStatus: boolean) => {
      try {
          setError('');
          const res = await fetch(`/api/admin/paintings/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ active: !currentStatus })
          });
          if (res.ok) {
              setPaintings(prev => prev.map(p => p.id === id ? { ...p, active: !currentStatus } : p));
              setMessage(`Painting ${!currentStatus ? 'enabled' : 'disabled'} successfully`);
          } else {
              const errData = await res.json().catch(() => ({}));
              setError(`Toggle failed: ${errData.error || res.status}`);
          }
      } catch (e) {
          setError(`Toggle failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
  };

  const startEdit = (p: Painting) => {
      setEditingId(p.id);
      setEditForm({
          title: p.title,
          artist: p.artist,
          hints: p.hints.map(h => ({ id: h.id, label: h.label, content: h.content }))
      });
  };

  const updateHint = (index: number, field: 'label' | 'content', value: string) => {
      setEditForm(prev => ({
          ...prev,
          hints: prev.hints.map((h, i) => i === index ? { ...h, [field]: value } : h)
      }));
  };

  const saveEdit = async (id: string) => {
      try {
          setError('');
          // Update painting
          const res = await fetch(`/api/admin/paintings/${id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title: editForm.title, artist: editForm.artist })
          });

          if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              setError(`Save failed: ${errData.error || res.status}`);
              return;
          }

          // Update hints
          for (const hint of editForm.hints) {
              const hintRes = await fetch(`/api/admin/hints/${hint.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ label: hint.label, content: hint.content })
              });
              if (!hintRes.ok) {
                  console.error('Failed to update hint:', hint.id);
              }
          }

          setPaintings(prev => prev.map(p => p.id === id ? {
              ...p,
              title: editForm.title,
              artist: editForm.artist,
              hints: editForm.hints
          } : p));
          setEditingId(null);
          setMessage('Changes saved successfully');
      } catch (e) {
          setError(`Save failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
      }
  };

  const runSeeder = async (type: 'paintings' | 'schools') => {
    setLoading(true);
    const endpoint = type === 'paintings' ? '/api/admin/seed' : '/api/admin/seed-schools';
    setMessage(`Seeding ${type}... this might take a moment.`);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        let msg = `Success! Seeded ${data.count} ${type}.`;
        if (data.breakdown) {
            const details = Object.entries(data.breakdown).map(([k, v]) => `${k}: ${v}`).join(', ');
            msg += ` [${details}]`;
        }
        setMessage(msg);
        loadData();
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-gray-300">Reseed Paintings Database</p>
              <p className="text-sm text-gray-500 mt-1">Fetches fresh data (~100 items) from Met/AIC APIs.</p>
            </div>
            <button
              onClick={() => runSeeder('paintings')}
              disabled={loading}
              className={`px-6 py-2 rounded font-bold ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {loading ? 'Running...' : 'Seed Paintings'}
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300">Seed Schools Database</p>
              <p className="text-sm text-gray-500 mt-1">Loads 50 top US universities for the school game mode.</p>
            </div>
            <button
              onClick={() => runSeeder('schools')}
              disabled={loading}
              className={`px-6 py-2 rounded font-bold ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? 'Running...' : 'Seed Schools'}
            </button>
          </div>
          {message && (
            <div className={`mt-4 p-3 rounded ${message.startsWith('Success') ? 'bg-green-900/50 text-green-200' : message.startsWith('Error') ? 'bg-red-900/50 text-red-200' : 'bg-blue-900/50 text-blue-200'}`}>
              {message}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/50 text-red-200 p-4 rounded-lg border border-red-700 mb-8">
            <strong>Error loading data:</strong> {error}
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6 flex justify-between items-center">
                <span>Current Database</span>
                <div className="flex items-center gap-4">
                    <button
                        onClick={loadData}
                        className="text-sm bg-gray-600 hover:bg-gray-500 px-3 py-1 rounded"
                    >
                        Refresh
                    </button>
                    <span className="text-sm font-normal text-gray-400">
                        {paintings.length} items loaded (Page {currentPage} of {totalPages})
                    </span>
                </div>
            </h2>
            
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                            <th className="p-3">Source</th>
                            <th className="p-3">Image</th>
                            <th className="p-3">Actions</th>
                            <th className="p-3">Details</th>
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
                                            src={p.thumbnailPath || p.imageUrl}
                                            alt={p.title}
                                            className="object-cover rounded w-full h-full"
                                        />
                                    </div>
                                </td>
                                <td className="p-3">
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => toggleActive(p.id, p.active)}
                                            className={`px-3 py-1 rounded text-xs font-bold ${
                                                p.active ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                            }`}
                                        >
                                            {p.active ? 'Active' : 'Disabled'}
                                        </button>
                                        {editingId !== p.id && (
                                            <button
                                                onClick={() => startEdit(p)}
                                                className="px-3 py-1 rounded text-xs font-bold bg-blue-600 hover:bg-blue-700"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td className="p-3">
                                    {editingId === p.id ? (
                                        <div className="space-y-3 bg-gray-700 p-3 rounded">
                                            <div>
                                                <label className="text-xs text-gray-400">Title</label>
                                                <input
                                                    className="w-full text-black px-2 py-1 rounded"
                                                    value={editForm.title}
                                                    onChange={e => setEditForm({...editForm, title: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-gray-400">Artist</label>
                                                <input
                                                    className="w-full text-black px-2 py-1 rounded"
                                                    value={editForm.artist}
                                                    onChange={e => setEditForm({...editForm, artist: e.target.value})}
                                                />
                                            </div>
                                            <div className="border-t border-gray-600 pt-2">
                                                <label className="text-xs text-gray-400 block mb-2">Hints</label>
                                                {editForm.hints.map((h, idx) => (
                                                    <div key={h.id} className="mb-2 pl-2 border-l-2 border-gray-500">
                                                        <input
                                                            className="w-full text-black px-2 py-1 rounded text-xs mb-1"
                                                            value={h.label}
                                                            placeholder="Label"
                                                            onChange={e => updateHint(idx, 'label', e.target.value)}
                                                        />
                                                        <input
                                                            className="w-full text-black px-2 py-1 rounded text-xs"
                                                            value={h.content}
                                                            placeholder="Content"
                                                            onChange={e => updateHint(idx, 'content', e.target.value)}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => saveEdit(p.id)} className="bg-green-600 hover:bg-green-700 px-4 py-1 rounded text-sm font-bold">Save</button>
                                                <button onClick={() => setEditingId(null)} className="bg-gray-600 hover:bg-gray-500 px-4 py-1 rounded text-sm">Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="font-bold text-white">{p.title}</div>
                                            <div className="text-yellow-500">{p.artist}</div>
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
                                        </>
                                    )}
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
