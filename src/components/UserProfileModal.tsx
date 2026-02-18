'use client';

import { useState } from 'react';

interface Props {
  walletAddress: string;
  onSave: (name: string) => void;
  onClose: () => void;
}

export default function UserProfileModal({ walletAddress, onSave, onClose }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${walletAddress}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim() || undefined }),
      });
      if (!res.ok) throw new Error('Save failed');
      onSave(name.trim());
    } catch {
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold mb-1">Welcome to Muse x402</h2>
        <p className="text-gray-400 text-sm mb-4">Set up your player profile to appear on the leaderboard.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Name <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="Your display name"
              maxLength={50}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-1">Email <span className="text-gray-500">(optional)</span></label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              placeholder="your@email.com"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white border border-gray-600 rounded"
            >
              Skip
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
