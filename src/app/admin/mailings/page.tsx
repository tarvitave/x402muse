'use client';

import { useEffect, useState, useRef } from 'react';
import AdminNav from '@/components/AdminNav';

// ── Types ────────────────────────────────────────────────────────────────────

interface MailingList {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { contacts: number; campaigns: number };
}

interface Campaign {
  id: string;
  mailingListId: string;
  subject: string;
  bodyMarkdown: string;
  fromName: string;
  fromEmail: string;
  status: string;
  sendRatePerMinute: number;
  totalSent: number;
  createdAt: string;
  mailingList: { name: string };
  _count: { sends: number };
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MailingsPage() {
  const [tab, setTab] = useState<'lists' | 'compose' | 'campaigns'>('lists');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <AdminNav />
        <h1 className="text-2xl font-bold mb-6">Mailings</h1>

        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-0">
          {(['lists', 'compose', 'campaigns'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                tab === t
                  ? 'bg-gray-800 text-white border border-gray-700 border-b-gray-800 -mb-px'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === 'lists' && <ListsTab />}
        {tab === 'compose' && <ComposeTab />}
        {tab === 'campaigns' && <CampaignsTab />}
      </div>
    </div>
  );
}

// ── Lists Tab ────────────────────────────────────────────────────────────────

function ListsTab() {
  const [lists, setLists] = useState<MailingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/mailings/lists')
      .then(r => r.json())
      .then(d => setLists(d.lists ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setUploading(true);

    const file = fileRef.current?.files?.[0];
    if (file) {
      const form = new FormData();
      form.append('name', name);
      if (description) form.append('description', description);
      form.append('file', file);
      await fetch('/api/admin/mailings/lists', { method: 'POST', body: form });
    } else {
      await fetch('/api/admin/mailings/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
    }

    setName('');
    setDescription('');
    if (fileRef.current) fileRef.current.value = '';
    setUploading(false);
    load();
  }

  async function handleDelete(id: string, listName: string) {
    if (!confirm(`Delete list "${listName}" and all its contacts?`)) return;
    await fetch(`/api/admin/mailings/lists?id=${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Create Mailing List</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">List Name *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Newsletter Subscribers"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Import CSV <span className="text-gray-500">(optional — columns: email, name)</span>
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="w-full text-sm text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-600 file:text-white file:text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded"
          >
            {uploading ? 'Creating…' : 'Create List'}
          </button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Your Lists</h2>
        {loading ? (
          <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
        ) : lists.length === 0 ? (
          <p className="text-gray-500 text-sm">No mailing lists yet.</p>
        ) : (
          <div className="space-y-2">
            {lists.map(list => (
              <div key={list.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{list.name}</p>
                  {list.description && <p className="text-xs text-gray-400 mt-0.5">{list.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {list._count.contacts} contacts · {list._count.campaigns} campaigns
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(list.id, list.name)}
                  className="text-red-400 hover:text-red-300 text-xs px-3 py-1 border border-red-800 rounded"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Compose Tab ──────────────────────────────────────────────────────────────

function ComposeTab() {
  const [lists, setLists] = useState<MailingList[]>([]);
  const [selectedList, setSelectedList] = useState('');
  const [subject, setSubject] = useState('');
  const [fromName, setFromName] = useState('');
  const [fromEmail, setFromEmail] = useState('');
  const [body, setBody] = useState('');
  const [rate, setRate] = useState(60);
  const [preview, setPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    fetch('/api/admin/mailings/lists')
      .then(r => r.json())
      .then(d => {
        setLists(d.lists ?? []);
        if (d.lists?.length) setSelectedList(d.lists[0].id);
      });
  }, []);

  useEffect(() => {
    if (!preview) return;
    import('marked').then(({ marked }) => {
      Promise.resolve(marked.parse(body)).then(html => setPreviewHtml(html));
    });
  }, [preview, body]);

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const res = await fetch('/api/admin/mailings/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt, subject }),
      });
      const data = await res.json();
      if (data.error) {
        setAiError(data.error);
      } else {
        setBody(data.markdown);
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!selectedList || !subject || !body || !fromEmail) return;
    setSaving(true);
    const res = await fetch('/api/admin/mailings/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mailingListId: selectedList, subject, bodyMarkdown: body, fromName, fromEmail, sendRatePerMinute: rate }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold">Compose Email</h2>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Mailing List</label>
            <select
              value={selectedList}
              onChange={e => setSelectedList(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            >
              {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l._count.contacts})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Subject *</label>
            <input
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Email subject"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">From Name</label>
            <input
              value={fromName}
              onChange={e => setFromName(e.target.value)}
              placeholder="e.g. Muse Gallery"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">From Email *</label>
            <input
              value={fromEmail}
              onChange={e => setFromEmail(e.target.value)}
              placeholder="noreply@example.com"
              type="email"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1">Send Rate (emails/minute)</label>
          <input
            type="number"
            min={1}
            max={500}
            value={rate}
            onChange={e => setRate(parseInt(e.target.value) || 60)}
            className="w-32 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold">AI Email Generator</h2>
        <div className="flex gap-2">
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            placeholder="Describe the email you want... e.g. 'Announce the weekly art contest winner and invite people to play'"
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            onKeyDown={e => { if (e.key === 'Enter') handleAiGenerate(); }}
          />
          <button
            onClick={handleAiGenerate}
            disabled={aiLoading || !aiPrompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded whitespace-nowrap"
          >
            {aiLoading ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {aiError && <p className="text-red-400 text-xs">{aiError}</p>}
        <p className="text-xs text-gray-500">Requires ANTHROPIC_API_KEY env var. Generated content replaces the email body below.</p>
      </div>

      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Email Body (Markdown)</h2>
          <button
            onClick={() => setPreview(!preview)}
            className="text-xs text-purple-400 hover:text-purple-300 border border-purple-700 rounded px-3 py-1"
          >
            {preview ? 'Edit' : 'Preview'}
          </button>
        </div>

        {preview ? (
          <div
            className="prose prose-invert prose-sm max-w-none bg-white text-gray-900 rounded p-4 min-h-[300px]"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
        ) : (
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Write your email in Markdown...

# Hello {name}

We have exciting news to share with you...

## What's New

- Feature 1
- Feature 2

[Click here to play](https://yoursite.com)"
            rows={16}
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm font-mono resize-y"
          />
        )}
        <p className="text-xs text-gray-500">Supports standard Markdown. Images: ![alt](url). Links: [text](url).</p>
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !selectedList || !subject || !body || !fromEmail}
        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved as Draft' : 'Save as Draft'}
      </button>
    </div>
  );
}

// ── Campaigns Tab ────────────────────────────────────────────────────────────

function CampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendStats, setSendStats] = useState<Record<string, { pending: number; sent: number; failed: number }>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch('/api/admin/mailings/campaigns')
      .then(r => r.json())
      .then(d => setCampaigns(d.campaigns ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  useEffect(() => {
    // Load stats for sending/paused campaigns
    campaigns.filter(c => c.status === 'sending' || c.status === 'paused' || c.status === 'completed').forEach(c => {
      fetch(`/api/admin/mailings/send?campaignId=${c.id}`)
        .then(r => r.json())
        .then(d => setSendStats(prev => ({ ...prev, [c.id]: d.stats })));
    });
  }, [campaigns]);

  // Auto-refresh sending campaigns
  useEffect(() => {
    const sending = campaigns.some(c => c.status === 'sending');
    if (!sending) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [campaigns]);

  async function handleAction(campaignId: string, action: 'start' | 'pause' | 'resume') {
    setActing(campaignId);
    await fetch('/api/admin/mailings/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, action }),
    });
    setActing(null);
    load();
  }

  async function handleDelete(id: string, subject: string) {
    if (!confirm(`Delete campaign "${subject}"?`)) return;
    await fetch(`/api/admin/mailings/campaigns?id=${id}`, { method: 'DELETE' });
    load();
  }

  const statusColor: Record<string, string> = {
    draft: 'text-gray-400',
    sending: 'text-blue-400',
    paused: 'text-yellow-400',
    completed: 'text-green-400',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Campaigns</h2>
        <button onClick={load} className="text-xs text-gray-400 hover:text-white border border-gray-600 rounded px-3 py-1">
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
      ) : campaigns.length === 0 ? (
        <p className="text-gray-500 text-sm">No campaigns yet. Go to Compose to create one.</p>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const stats = sendStats[c.id];
            const total = c._count.sends;
            return (
              <div key={c.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold uppercase ${statusColor[c.status] ?? 'text-gray-400'}`}>
                        {c.status}
                      </span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-400">{c.mailingList.name}</span>
                    </div>
                    <p className="font-semibold truncate">{c.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      From: {c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail}
                      {' · '}{c.sendRatePerMinute}/min
                    </p>
                    {(stats || c.status === 'completed') && (
                      <div className="mt-2 flex gap-4 text-xs">
                        <span className="text-green-400">✓ {stats?.sent ?? c.totalSent} sent</span>
                        {stats?.pending ? <span className="text-gray-400">{stats.pending} pending</span> : null}
                        {stats?.failed ? <span className="text-red-400">{stats.failed} failed</span> : null}
                        {total > 0 && <span className="text-gray-500">/ {total} total</span>}
                      </div>
                    )}
                    {c.status === 'sending' && stats && total > 0 && (
                      <div className="mt-2 w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-blue-500 h-1.5 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (stats.sent / total) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {c.status === 'draft' && (
                      <button
                        onClick={() => handleAction(c.id, 'start')}
                        disabled={acting === c.id}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded"
                      >
                        Send
                      </button>
                    )}
                    {c.status === 'sending' && (
                      <button
                        onClick={() => handleAction(c.id, 'pause')}
                        disabled={acting === c.id}
                        className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded"
                      >
                        Pause
                      </button>
                    )}
                    {c.status === 'paused' && (
                      <button
                        onClick={() => handleAction(c.id, 'resume')}
                        disabled={acting === c.id}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c.id, c.subject)}
                      className="text-red-400 hover:text-red-300 text-xs px-2 py-1.5 border border-red-800 rounded"
                    >
                      Del
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
