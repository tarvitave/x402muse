'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import AdminNav from '@/components/AdminNav';

// ── Types ────────────────────────────────────────────────────────────────────

interface MailingList {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { contacts: number; campaigns: number };
}

interface BounceSummary {
  total: number;
  clean: number;
  soft: number;
  hard: number;
  unsubscribed: number;
}

interface Contact {
  id: string;
  email: string;
  name: string | null;
  bounceType: string | null;
  bouncedAt: string | null;
  unsubscribed: boolean;
}

interface Campaign {
  id: string;
  name: string | null;
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

// ── Shared status colours (used in Campaigns + Analytics tabs) ───────────────

const statusColor: Record<string, string> = {
  draft: 'text-gray-400',
  sending: 'text-blue-400',
  paused: 'text-yellow-400',
  completed: 'text-green-400',
};

// ── Main Page ────────────────────────────────────────────────────────────────

export default function MailingsPage() {
  const [tab, setTab] = useState<'lists' | 'compose' | 'campaigns' | 'analytics'>('lists');

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <AdminNav />
        <h1 className="text-2xl font-bold mb-6">Mailings</h1>

        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-0">
          {(['lists', 'compose', 'campaigns', 'analytics'] as const).map(t => (
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
        {tab === 'analytics' && <AnalyticsTab />}
      </div>
    </div>
  );
}

// ── CSV helper (client-side) ─────────────────────────────────────────────────

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += ch; }
  }
  result.push(current);
  return result;
}

// ── Lists Tab ────────────────────────────────────────────────────────────────

function ListsTab() {
  const [lists, setLists] = useState<MailingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [csvPreview, setCsvPreview] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [bounceSummaries, setBounceSummaries] = useState<Record<string, BounceSummary>>({});
  const [expandedBounces, setExpandedBounces] = useState<string | null>(null);
  const [bounceContacts, setBounceContacts] = useState<Contact[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit list state
  const [editingList, setEditingList] = useState<MailingList | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Contacts panel state
  const [contactsListId, setContactsListId] = useState<string | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addContactName, setAddContactName] = useState('');
  const [addingContact, setAddingContact] = useState(false);
  const [addContactError, setAddContactError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
    fetch('/api/admin/mailings/lists')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(d => {
        const ls: MailingList[] = d.lists ?? [];
        setLists(ls);
        ls.forEach(list => {
          fetch(`/api/admin/mailings/contacts?listId=${list.id}`)
            .then(r => r.json())
            .then(data => setBounceSummaries(prev => ({ ...prev, [list.id]: data.summary })))
            .catch(() => {});
        });
      })
      .catch(err => setLoadError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleViewBounces(listId: string) {
    if (expandedBounces === listId) { setExpandedBounces(null); return; }
    const res = await fetch(`/api/admin/mailings/contacts?listId=${listId}&bounceType=bounced`);
    const data = await res.json();
    setBounceContacts(data.contacts ?? []);
    setExpandedBounces(listId);
  }

  async function handleClearBounce(contactId: string) {
    await fetch(`/api/admin/mailings/contacts?id=${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bounceType: null }),
    });
    setBounceContacts(prev => prev.filter(c => c.id !== contactId));
    load();
  }

  async function handleSetBounce(contactId: string, bounceType: 'soft' | 'hard') {
    await fetch(`/api/admin/mailings/contacts?id=${contactId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bounceType }),
    });
    setBounceContacts(prev => prev.map(c => c.id === contactId ? { ...c, bounceType } : c));
    load();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setCsvPreview(null); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split(/\r?\n/).filter(l => l.trim()).slice(0, 6);
      if (lines.length === 0) { setCsvPreview(null); return; }
      const parsed = lines.map(l => splitCsvLine(l).map(c => c.trim().replace(/^"|"$/g, '')));
      setCsvPreview({ headers: parsed[0], rows: parsed.slice(1) });
    };
    reader.readAsText(file);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setUploading(true);
    setCreateError('');
    try {
      const file = fileRef.current?.files?.[0];
      let res: Response;
      if (file) {
        const form = new FormData();
        form.append('name', name);
        if (description) form.append('description', description);
        form.append('file', file);
        res = await fetch('/api/admin/mailings/lists', { method: 'POST', body: form });
      } else {
        res = await fetch('/api/admin/mailings/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      setName('');
      setDescription('');
      setCsvPreview(null);
      if (fileRef.current) fileRef.current.value = '';
      load();
    } catch (err) {
      setCreateError(String(err));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string, listName: string) {
    if (!confirm(`Delete list "${listName}" and all its contacts?`)) return;
    await fetch(`/api/admin/mailings/lists?id=${id}`, { method: 'DELETE' });
    load();
  }

  function openEdit(list: MailingList) {
    setEditingList(list);
    setEditName(list.name);
    setEditDesc(list.description ?? '');
  }

  async function handleEditSave() {
    if (!editingList) return;
    setEditSaving(true);
    await fetch(`/api/admin/mailings/lists?id=${editingList.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, description: editDesc }),
    });
    setEditSaving(false);
    setEditingList(null);
    load();
  }

  async function openContacts(listId: string) {
    if (contactsListId === listId) { setContactsListId(null); return; }
    setContactsListId(listId);
    setExpandedBounces(null);
    setContactsLoading(true);
    const res = await fetch(`/api/admin/mailings/contacts?listId=${listId}`);
    const data = await res.json();
    setAllContacts(data.contacts ?? []);
    setContactsLoading(false);
  }

  async function handleAddContact() {
    if (!contactsListId || !addEmail) return;
    setAddingContact(true);
    setAddContactError('');
    const res = await fetch('/api/admin/mailings/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'addContact', listId: contactsListId, email: addEmail, name: addContactName }),
    });
    if (res.ok) {
      setAddEmail('');
      setAddContactName('');
      const r2 = await fetch(`/api/admin/mailings/contacts?listId=${contactsListId}`);
      const d2 = await r2.json();
      setAllContacts(d2.contacts ?? []);
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      setAddContactError(d.error ?? 'Failed to add contact');
    }
    setAddingContact(false);
  }

  async function handleDeleteContact(contactId: string) {
    await fetch('/api/admin/mailings/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'deleteContact', contactId }),
    });
    setAllContacts(prev => prev.filter(c => c.id !== contactId));
    load();
  }

  return (
    <div className="space-y-6">
      {/* Edit List Modal */}
      {editingList && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-semibold">Edit List</h3>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Description</label>
              <input
                value={editDesc}
                onChange={e => setEditDesc(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditingList(null)}
                className="text-gray-400 hover:text-white text-sm px-4 py-2 border border-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving || !editName.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded"
              >
                {editSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create List Form */}
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
              onChange={handleFileChange}
              className="w-full text-sm text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-600 file:text-white file:text-sm"
            />
            {csvPreview && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">Preview (first {csvPreview.rows.length} row{csvPreview.rows.length !== 1 ? 's' : ''}):</p>
                <div className="overflow-x-auto rounded border border-gray-600">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-700 text-gray-300">
                        {csvPreview.headers.map((h, i) => (
                          <th key={i} className="text-left px-3 py-1.5 font-medium">{h || <span className="text-gray-500 italic">col {i + 1}</span>}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {csvPreview.rows.map((row, ri) => (
                        <tr key={ri} className="border-t border-gray-700 odd:bg-gray-800 even:bg-gray-750">
                          {csvPreview.headers.map((_, ci) => (
                            <td key={ci} className="px-3 py-1.5 text-gray-200 truncate max-w-[200px]">{row[ci] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded"
          >
            {uploading ? 'Creating…' : 'Create List'}
          </button>
          {createError && <p className="text-red-400 text-sm mt-2">Error: {createError}</p>}
        </form>
      </div>

      {/* Lists */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Your Lists</h2>
        {loadError && <p className="text-red-400 text-sm mb-2">Failed to load: {loadError}</p>}
        {loading ? (
          <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
        ) : lists.length === 0 ? (
          <p className="text-gray-500 text-sm">No mailing lists yet.</p>
        ) : (
          <div className="space-y-3">
            {lists.map(list => {
              const bs = bounceSummaries[list.id];
              const isBouncesExpanded = expandedBounces === list.id;
              const isContactsExpanded = contactsListId === list.id;
              return (
                <div key={list.id} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{list.name}</p>
                      {list.description && <p className="text-xs text-gray-400 mt-0.5">{list.description}</p>}
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-gray-500">{list._count.contacts} contacts · {list._count.campaigns} campaigns</span>
                        {bs && (bs.soft > 0 || bs.hard > 0 || bs.unsubscribed > 0) && (
                          <span className="flex gap-2 text-xs">
                            {bs.hard > 0 && <span className="text-red-400">{bs.hard} hard bounce{bs.hard !== 1 ? 's' : ''}</span>}
                            {bs.soft > 0 && <span className="text-yellow-400">{bs.soft} soft bounce{bs.soft !== 1 ? 's' : ''}</span>}
                            {bs.unsubscribed > 0 && <span className="text-gray-400">{bs.unsubscribed} unsubscribed</span>}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3 flex-wrap justify-end">
                      <button
                        onClick={() => openEdit(list)}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 rounded px-2 py-1"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openContacts(list.id)}
                        className={`text-xs border rounded px-2 py-1 ${isContactsExpanded ? 'text-purple-300 border-purple-600' : 'text-purple-400 hover:text-purple-300 border-purple-800'}`}
                      >
                        {isContactsExpanded ? 'Hide Contacts' : 'Contacts'}
                      </button>
                      {bs && (bs.soft > 0 || bs.hard > 0) && (
                        <button
                          onClick={() => handleViewBounces(list.id)}
                          className="text-xs text-yellow-400 hover:text-yellow-300 border border-yellow-700 rounded px-2 py-1"
                        >
                          {isBouncesExpanded ? 'Hide Bounces' : 'Bounces'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(list.id, list.name)}
                        className="text-red-400 hover:text-red-300 text-xs px-3 py-1 border border-red-800 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Contacts Panel */}
                  {isContactsExpanded && (
                    <div className="border-t border-gray-700 px-4 pb-4">
                      <p className="text-xs text-gray-400 mt-3 mb-2">Manage contacts:</p>
                      <div className="flex gap-2 mb-3">
                        <input
                          value={addEmail}
                          onChange={e => setAddEmail(e.target.value)}
                          placeholder="email@example.com"
                          type="email"
                          className="flex-1 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs"
                          onKeyDown={e => { if (e.key === 'Enter') handleAddContact(); }}
                        />
                        <input
                          value={addContactName}
                          onChange={e => setAddContactName(e.target.value)}
                          placeholder="Name (optional)"
                          className="w-40 bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-xs"
                        />
                        <button
                          onClick={handleAddContact}
                          disabled={addingContact || !addEmail.includes('@')}
                          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded"
                        >
                          {addingContact ? '…' : 'Add'}
                        </button>
                      </div>
                      {addContactError && <p className="text-red-400 text-xs mb-2">{addContactError}</p>}
                      {contactsLoading ? (
                        <p className="text-gray-500 text-xs animate-pulse">Loading…</p>
                      ) : (
                        <div className="space-y-1 max-h-72 overflow-y-auto">
                          {allContacts.map(c => (
                            <div key={c.id} className="flex items-center justify-between text-xs bg-gray-700/50 rounded px-3 py-1.5">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-gray-200 truncate">{c.email}</span>
                                {c.name && <span className="text-gray-400 truncate">{c.name}</span>}
                                {c.bounceType && (
                                  <span className={`font-bold shrink-0 ${c.bounceType === 'hard' ? 'text-red-400' : 'text-yellow-400'}`}>
                                    {c.bounceType}
                                  </span>
                                )}
                                {c.unsubscribed && <span className="text-gray-500 shrink-0">unsub</span>}
                              </div>
                              <button
                                onClick={() => handleDeleteContact(c.id)}
                                className="text-red-400 hover:text-red-300 ml-2 shrink-0 px-1"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          {allContacts.length === 0 && <p className="text-gray-500 text-xs">No contacts yet.</p>}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bounces Panel */}
                  {isBouncesExpanded && (
                    <div className="border-t border-gray-700 px-4 pb-4">
                      <p className="text-xs text-gray-400 mt-3 mb-2">Bounced contacts — clear or reclassify:</p>
                      <div className="space-y-1 max-h-64 overflow-y-auto">
                        {bounceContacts.map(c => (
                          <div key={c.id} className="flex items-center justify-between text-xs bg-gray-700/50 rounded px-3 py-1.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className={`font-bold shrink-0 ${c.bounceType === 'hard' ? 'text-red-400' : 'text-yellow-400'}`}>
                                {c.bounceType === 'hard' ? 'HARD' : 'SOFT'}
                              </span>
                              <span className="text-gray-200 truncate">{c.email}</span>
                              {c.name && <span className="text-gray-400 truncate">{c.name}</span>}
                            </div>
                            <div className="flex gap-1 shrink-0 ml-2">
                              {c.bounceType !== 'soft' && (
                                <button onClick={() => handleSetBounce(c.id, 'soft')} className="text-yellow-400 hover:text-yellow-300 px-1.5 py-0.5 border border-yellow-800 rounded">→ Soft</button>
                              )}
                              {c.bounceType !== 'hard' && (
                                <button onClick={() => handleSetBounce(c.id, 'hard')} className="text-red-400 hover:text-red-300 px-1.5 py-0.5 border border-red-800 rounded">→ Hard</button>
                              )}
                              <button onClick={() => handleClearBounce(c.id)} className="text-gray-400 hover:text-white px-1.5 py-0.5 border border-gray-600 rounded">Clear</button>
                            </div>
                          </div>
                        ))}
                        {bounceContacts.length === 0 && <p className="text-gray-500 text-xs">No bounces recorded.</p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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
  const [draftName, setDraftName] = useState('');
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
      if (data.error) setAiError(data.error);
      else setBody(data.markdown);
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
      body: JSON.stringify({
        mailingListId: selectedList,
        name: draftName || undefined,
        subject,
        bodyMarkdown: body,
        fromName,
        fromEmail,
        sendRatePerMinute: rate,
      }),
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

        <div>
          <label className="block text-xs text-gray-400 mb-1">Draft Name <span className="text-gray-500">(optional label to identify this draft)</span></label>
          <input
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            placeholder="e.g. March Newsletter v2"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
          />
        </div>

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
              placeholder="Email subject line"
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
            placeholder="Describe the email you want…"
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
        <p className="text-xs text-gray-500">Requires ANTHROPIC_API_KEY. Generated content replaces the email body below.</p>
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
            placeholder="Write your email in Markdown…"
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
  const [lists, setLists] = useState<MailingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendStats, setSendStats] = useState<Record<string, { pending: number; sent: number; failed: number; softBounce: number; hardBounce: number }>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [includeSoftBounces, setIncludeSoftBounces] = useState<Record<string, boolean>>({});

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Campaign> & { bodyMarkdown?: string }>({});
  const [editSaving, setEditSaving] = useState(false);
  const [editPreview, setEditPreview] = useState(false);
  const [editPreviewHtml, setEditPreviewHtml] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/admin/mailings/campaigns').then(r => r.json()),
      fetch('/api/admin/mailings/lists').then(r => r.json()),
    ]).then(([cd, ld]) => {
      setCampaigns(cd.campaigns ?? []);
      setLists(ld.lists ?? []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  useEffect(() => {
    campaigns.filter(c => ['sending', 'paused', 'completed'].includes(c.status)).forEach(c => {
      fetch(`/api/admin/mailings/send?campaignId=${c.id}`)
        .then(r => r.json())
        .then(d => setSendStats(prev => ({ ...prev, [c.id]: d.stats })));
    });
  }, [campaigns]);

  useEffect(() => {
    const sending = campaigns.some(c => c.status === 'sending');
    if (!sending) return;
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [campaigns, load]);

  useEffect(() => {
    if (!editPreview || !editFields.bodyMarkdown) return;
    import('marked').then(({ marked }) => {
      Promise.resolve(marked.parse(editFields.bodyMarkdown ?? '')).then(html => setEditPreviewHtml(html));
    });
  }, [editPreview, editFields.bodyMarkdown]);

  async function handleAction(campaignId: string, action: 'start' | 'pause' | 'resume') {
    setActing(campaignId);
    await fetch('/api/admin/mailings/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, action, includeSoftBounces: includeSoftBounces[campaignId] ?? false }),
    });
    setActing(null);
    load();
  }

  async function handleDelete(id: string, subject: string) {
    if (!confirm(`Delete campaign "${subject}"?`)) return;
    await fetch(`/api/admin/mailings/campaigns?id=${id}`, { method: 'DELETE' });
    load();
  }

  function startEdit(c: Campaign) {
    setEditingId(c.id);
    setEditPreview(false);
    setEditFields({
      name: c.name,
      subject: c.subject,
      bodyMarkdown: c.bodyMarkdown,
      fromName: c.fromName,
      fromEmail: c.fromEmail,
      sendRatePerMinute: c.sendRatePerMinute,
      mailingListId: c.mailingListId,
    });
  }

  async function handleEditSave(id: string) {
    setEditSaving(true);
    await fetch(`/api/admin/mailings/campaigns?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editFields),
    });
    setEditSaving(false);
    setEditingId(null);
    load();
  }

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
            const isEditing = editingId === c.id;
            const canEdit = c.status === 'draft' || c.status === 'paused';

            if (isEditing) {
              return (
                <div key={c.id} className="bg-gray-800 border border-blue-700 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-blue-400">Editing Campaign</h3>
                    <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white text-xs">Cancel</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Draft Name <span className="text-gray-500">(optional label)</span></label>
                      <input
                        value={editFields.name ?? ''}
                        onChange={e => setEditFields(p => ({ ...p, name: e.target.value || null }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Mailing List</label>
                      <select
                        value={editFields.mailingListId ?? ''}
                        onChange={e => setEditFields(p => ({ ...p, mailingListId: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
                      >
                        {lists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Subject</label>
                      <input
                        value={editFields.subject ?? ''}
                        onChange={e => setEditFields(p => ({ ...p, subject: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">From Name</label>
                      <input
                        value={editFields.fromName ?? ''}
                        onChange={e => setEditFields(p => ({ ...p, fromName: e.target.value }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">From Email</label>
                      <input
                        value={editFields.fromEmail ?? ''}
                        onChange={e => setEditFields(p => ({ ...p, fromEmail: e.target.value }))}
                        type="email"
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Send Rate (emails/min)</label>
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={editFields.sendRatePerMinute ?? 60}
                        onChange={e => setEditFields(p => ({ ...p, sendRatePerMinute: parseInt(e.target.value) || 60 }))}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-400">Body (Markdown)</label>
                      <button
                        onClick={() => setEditPreview(!editPreview)}
                        className="text-xs text-purple-400 hover:text-purple-300 border border-purple-700 rounded px-2 py-0.5"
                      >
                        {editPreview ? 'Edit' : 'Preview'}
                      </button>
                    </div>
                    {editPreview ? (
                      <div
                        className="prose prose-invert prose-sm max-w-none bg-white text-gray-900 rounded p-3 min-h-[200px] text-sm"
                        dangerouslySetInnerHTML={{ __html: editPreviewHtml }}
                      />
                    ) : (
                      <textarea
                        value={editFields.bodyMarkdown ?? ''}
                        onChange={e => setEditFields(p => ({ ...p, bodyMarkdown: e.target.value }))}
                        rows={10}
                        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-xs font-mono resize-y"
                      />
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditSave(c.id)}
                      disabled={editSaving}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded"
                    >
                      {editSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="text-gray-400 hover:text-white text-sm px-4 py-2 border border-gray-600 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={c.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`text-xs font-bold uppercase ${statusColor[c.status] ?? 'text-gray-400'}`}>
                        {c.status}
                      </span>
                      <span className="text-xs text-gray-500">·</span>
                      <span className="text-xs text-gray-400">{c.mailingList.name}</span>
                    </div>
                    {c.name && <p className="text-xs text-purple-400 italic mb-0.5">{c.name}</p>}
                    <p className="font-semibold truncate">{c.subject}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      From: {c.fromName ? `${c.fromName} <${c.fromEmail}>` : c.fromEmail}
                      {' · '}{c.sendRatePerMinute}/min
                    </p>
                    {(stats || c.status === 'completed') && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-green-400">✓ {stats?.sent ?? c.totalSent} sent</span>
                        {stats?.pending ? <span className="text-gray-400">{stats.pending} pending</span> : null}
                        {stats?.hardBounce ? <span className="text-red-400">{stats.hardBounce} hard bounce{stats.hardBounce !== 1 ? 's' : ''}</span> : null}
                        {stats?.softBounce ? <span className="text-yellow-400">{stats.softBounce} soft bounce{stats.softBounce !== 1 ? 's' : ''}</span> : null}
                        {stats?.failed && !stats?.hardBounce && !stats?.softBounce ? <span className="text-red-400">{stats.failed} failed</span> : null}
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

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {c.status === 'draft' && (
                      <div className="flex flex-col items-end gap-1.5">
                        <label className="flex items-center gap-1.5 text-xs text-yellow-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeSoftBounces[c.id] ?? false}
                            onChange={e => setIncludeSoftBounces(prev => ({ ...prev, [c.id]: e.target.checked }))}
                            className="accent-yellow-400"
                          />
                          Include soft bounces
                        </label>
                        <button
                          onClick={() => handleAction(c.id, 'start')}
                          disabled={acting === c.id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded"
                        >
                          Send
                        </button>
                      </div>
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
                    {canEdit && (
                      <button
                        onClick={() => startEdit(c)}
                        className="text-xs text-blue-400 hover:text-blue-300 border border-blue-800 rounded px-2 py-1.5"
                      >
                        Edit
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

// ── Analytics Tab ────────────────────────────────────────────────────────────

interface DailyStat {
  day: string;
  sent: number;
  failed: number;
  softBounce: number;
  hardBounce: number;
}

interface CampaignStat {
  id: string;
  name: string | null;
  subject: string;
  listName: string;
  status: string;
  sent: number;
  failed: number;
  softBounce: number;
  hardBounce: number;
  total: number;
}

function AnalyticsTab() {
  const [days, setDays] = useState(30);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/admin/mailings/analytics?days=${days}`)
      .then(r => r.json())
      .then(d => {
        setDaily(d.daily ?? []);
        setCampaigns(d.campaigns ?? []);
      })
      .finally(() => setLoading(false));
  }, [days]);

  const totalSent = daily.reduce((s, r) => s + r.sent, 0);
  const totalFailed = daily.reduce((s, r) => s + r.failed, 0);
  const deliveryRate = totalSent + totalFailed === 0
    ? null
    : Math.round(totalSent / (totalSent + totalFailed) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Send Analytics</h2>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm animate-pulse">Loading…</p>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Sent ({days}d)</p>
              <p className="text-2xl font-bold text-green-400">{totalSent.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Failed ({days}d)</p>
              <p className="text-2xl font-bold text-red-400">{totalFailed.toLocaleString()}</p>
            </div>
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <p className="text-xs text-gray-400 mb-1">Delivery rate</p>
              <p className="text-2xl font-bold text-blue-400">{deliveryRate !== null ? `${deliveryRate}%` : '—'}</p>
            </div>
          </div>

          {/* Daily breakdown */}
          {daily.length > 0 ? (
            <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-700">
                <h3 className="text-sm font-semibold">Daily Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-700/50 text-gray-400">
                      <th className="text-left px-4 py-2 font-medium">Date</th>
                      <th className="text-right px-4 py-2 font-medium text-green-400">Sent</th>
                      <th className="text-right px-4 py-2 font-medium text-red-400">Failed</th>
                      <th className="text-right px-4 py-2 font-medium text-yellow-400">Soft Bounce</th>
                      <th className="text-right px-4 py-2 font-medium text-red-400">Hard Bounce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...daily].reverse().map(r => (
                      <tr key={r.day} className="border-t border-gray-700 hover:bg-gray-700/30">
                        <td className="px-4 py-2 text-gray-300">{r.day}</td>
                        <td className="px-4 py-2 text-right text-green-400 font-medium">{r.sent.toLocaleString()}</td>
                        <td className="px-4 py-2 text-right text-red-400">{r.failed || '—'}</td>
                        <td className="px-4 py-2 text-right text-yellow-400">{r.softBounce || '—'}</td>
                        <td className="px-4 py-2 text-right text-red-400">{r.hardBounce || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">No send data for the selected period.</p>
            </div>
          )}

          {/* Campaign summary */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-700">
              <h3 className="text-sm font-semibold">Campaign Summary</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-700/50 text-gray-400">
                    <th className="text-left px-4 py-2 font-medium">Campaign</th>
                    <th className="text-left px-4 py-2 font-medium">List</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-right px-4 py-2 font-medium text-green-400">Sent</th>
                    <th className="text-right px-4 py-2 font-medium text-red-400">Failed</th>
                    <th className="text-right px-4 py-2 font-medium text-yellow-400">Soft</th>
                    <th className="text-right px-4 py-2 font-medium text-red-400">Hard</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(c => (
                    <tr key={c.id} className="border-t border-gray-700 hover:bg-gray-700/30">
                      <td className="px-4 py-2 max-w-[220px]">
                        {c.name && <span className="text-purple-400 italic block text-[10px]">{c.name}</span>}
                        <span className="text-gray-200 truncate block">{c.subject}</span>
                      </td>
                      <td className="px-4 py-2 text-gray-400 max-w-[120px] truncate">{c.listName}</td>
                      <td className="px-4 py-2">
                        <span className={`font-semibold uppercase text-[10px] ${statusColor[c.status] ?? 'text-gray-400'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-2 text-right text-green-400 font-medium">{c.sent || '—'}</td>
                      <td className="px-4 py-2 text-right text-red-400">{c.failed || '—'}</td>
                      <td className="px-4 py-2 text-right text-yellow-400">{c.softBounce || '—'}</td>
                      <td className="px-4 py-2 text-right text-red-400">{c.hardBounce || '—'}</td>
                      <td className="px-4 py-2 text-right text-gray-400">{c.total || '—'}</td>
                    </tr>
                  ))}
                  {campaigns.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-6 text-gray-500 text-center">No campaigns yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
