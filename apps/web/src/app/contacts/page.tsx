'use client';

import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Users, Search, Plus, Mail, Phone, Building2, MoreVertical, Trash2, Edit2, Star, Download, Upload } from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  jobTitle?: string;
  isStarred?: boolean;
}

const initialMockContacts: Contact[] = [
  { id: 'c-1', name: 'Thesis Support', email: 'support@thesistech.com', phone: '+1 (555) 019-2834', organization: 'Thesis Technologies', jobTitle: 'Technical Support', isStarred: true },
  { id: 'c-2', name: 'Alex Rivera', email: 'alex@thesistech.com', phone: '+1 (555) 019-4821', organization: 'Thesis Technologies', jobTitle: 'Product Lead', isStarred: true },
  { id: 'c-3', name: 'Billing Dept', email: 'billing@thesistech.com', phone: '+1 (555) 019-9942', organization: 'Thesis Technologies', jobTitle: 'Finance', isStarred: false },
  { id: 'c-4', name: 'Sarah Jenkins', email: 'sarah.j@acme.corp', phone: '+1 (555) 028-1192', organization: 'Acme Corp', jobTitle: 'VP Engineering', isStarred: false },
];

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>(initialMockContacts);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(initialMockContacts[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newOrg, setNewOrg] = useState('');

  // Auto-fetch suggestions if available
  useEffect(() => {
    fetch('/api/contacts?q=a')
      .then(res => res.json())
      .then(json => {
        if (json.data && Array.isArray(json.data) && json.data.length > 0) {
          const fetched: Contact[] = json.data.map((c: any, i: number) => ({
            id: `c-db-${i}`,
            name: c.name || c.email.split('@')[0],
            email: c.email,
            organization: 'Recent Correspondence',
          }));
          setContacts(prev => {
            const existingEmails = new Set(prev.map(p => p.email.toLowerCase()));
            const newOnes = fetched.filter(f => !existingEmails.has(f.email.toLowerCase()));
            return [...prev, ...newOnes];
          });
        }
      })
      .catch(() => {});
  }, []);

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.organization && c.organization.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;
    const created: Contact = {
      id: `c-${Date.now()}`,
      name: newName.trim() || newEmail.split('@')[0],
      email: newEmail.trim(),
      phone: newPhone.trim(),
      organization: newOrg.trim(),
    };
    setContacts(prev => [created, ...prev]);
    setSelectedContact(created);
    setIsCreating(false);
    setNewName('');
    setNewEmail('');
    setNewPhone('');
    setNewOrg('');
  };

  const handleDelete = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
    if (selectedContact?.id === id) {
      setSelectedContact(null);
    }
  };

  return (
    <DashboardLayout
      activeFolderId="contacts"
      onSelectFolder={() => {}}
      density="comfortable"
      readingPane="none"
      onDensityChange={() => {}}
      onReadingPaneChange={() => {}}
      onOpenCompose={() => {}}
    >
      <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-[var(--theme-bg-main,#F8FAFC)] text-[var(--theme-text-primary,#0F172A)]">
        {/* Left: Contact Directory List */}
        <div className="w-full md:w-96 border-r border-[var(--theme-border,#E2E8F0)] bg-[var(--theme-bg-header,#FFFFFF)] flex flex-col shrink-0">
          {/* Top Bar */}
          <div className="p-4 border-b border-[var(--theme-border,#E2E8F0)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="font-bold text-sm">Contacts</h1>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold font-mono">
                {contacts.length}
              </span>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="px-3 py-1.5 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create</span>
            </button>
          </div>

          {/* Search Contacts */}
          <div className="p-3 border-b border-[var(--theme-border,#E2E8F0)]">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 opacity-40" />
              <input
                type="text"
                placeholder="Search contacts..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/80 border border-transparent focus:border-[#14B8A6] text-xs outline-none"
              />
            </div>
          </div>

          {/* List items */}
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--theme-border,#E2E8F0)]">
            {filtered.map(contact => (
              <div
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`p-3.5 flex items-center justify-between cursor-pointer transition-colors ${selectedContact?.id === contact.id ? 'bg-teal-500/10 border-l-4 border-teal-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold truncate">{contact.name}</div>
                    <div className="text-[11px] text-slate-500 truncate font-mono">{contact.email}</div>
                  </div>
                </div>
                {contact.isStarred && <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Contact Detail Card or Create Modal */}
        <div className="flex-1 p-6 sm:p-10 overflow-y-auto">
          {isCreating ? (
            <div className="max-w-lg mx-auto p-6 rounded-2xl bg-white dark:bg-slate-900 border border-[var(--theme-border,#CBD5E1)] shadow-xl animate-in fade-in">
              <h2 className="text-base font-bold mb-4">Create New Contact</h2>
              <form onSubmit={handleCreateContact} className="space-y-3 text-xs">
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-[#14B8A6]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="jane@company.com"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-[#14B8A6]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Phone</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-[#14B8A6]"
                  />
                </div>
                <div>
                  <label className="block mb-1 font-semibold text-slate-600">Company / Organization</label>
                  <input
                    type="text"
                    value={newOrg}
                    onChange={e => setNewOrg(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-transparent outline-none focus:border-[#14B8A6]"
                  />
                </div>
                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#14B8A6] text-white font-bold"
                  >
                    Save Contact
                  </button>
                </div>
              </form>
            </div>
          ) : selectedContact ? (
            <div className="max-w-xl mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-[var(--theme-border,#E2E8F0)] shadow-sm space-y-6 animate-in fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-white font-bold text-2xl flex items-center justify-center shadow-md">
                    {selectedContact.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{selectedContact.name}</h2>
                    <p className="text-xs text-slate-500 font-medium">{selectedContact.jobTitle || 'Contact'} {selectedContact.organization ? `at ${selectedContact.organization}` : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(selectedContact.id)}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
                  title="Delete Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[var(--theme-border,#E2E8F0)] text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Email
                  </div>
                  <div className="font-mono font-semibold text-teal-600 dark:text-teal-400 truncate">{selectedContact.email}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> Phone
                  </div>
                  <div className="font-semibold">{selectedContact.phone || '—'}</div>
                </div>
              </div>

              <div className="p-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-teal-900 dark:text-teal-200">Send an Email</div>
                  <div className="text-[11px] text-teal-700/80 dark:text-teal-400">Compose a message directly to this contact.</div>
                </div>
                <button
                  onClick={() => { window.location.href = `/mail/inbox?composeTo=${encodeURIComponent(selectedContact.email)}`; }}
                  className="px-4 py-2 rounded-xl bg-[#14B8A6] hover:bg-[#0D9488] text-white text-xs font-bold transition-all shadow-xs"
                >
                  Compose
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-60">
              <Users className="w-12 h-12 mb-3" />
              <p className="text-sm font-bold">Select a contact to view details</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
