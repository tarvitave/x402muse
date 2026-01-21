'use client';

import { useState } from 'react';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const runSeeder = async () => {
    setLoading(true);
    setMessage('Seeding... this might take 30-60 seconds.');
    try {
      const res = await fetch('/api/admin/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Success! Seeded ${data.count} paintings.`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (e) {
      setMessage('Failed to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 border-b border-gray-700 pb-4">Admin Dashboard</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">Content Management</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300">Reseed Paintings Database</p>
              <p className="text-sm text-gray-500 mt-1">Fetches fresh data from Met/AIC APIs and updates the game file.</p>
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
      </div>
    </div>
  );
}
