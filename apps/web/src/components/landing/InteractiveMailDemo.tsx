'use client';

import React, { useState } from 'react';
import {
  Inbox,
  Star,
  Send,
  FileText,
  Search,
  Sparkles,
  Paperclip,
  CheckCircle2,
  Trash2,
  Archive,
  X,
  Shield,
  Zap,
  ArrowLeft,
} from 'lucide-react';

interface MockMessage {
  id: string;
  senderName: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  snippet: string;
  body: string;
  timestamp: string;
  isUnread: boolean;
  isStarred: boolean;
  folder: 'inbox' | 'starred' | 'sent' | 'drafts';
  hasAttachment?: boolean;
  attachmentName?: string;
}

const initialMockMessages: MockMessage[] = [
  {
    id: 'demo-1',
    senderName: 'Sarah Lin',
    senderEmail: 'sarah.lin@techcorp.io',
    recipientEmail: 'rahulkumar@eazzio.com',
    subject: 'Q3 Product Roadmap & Inbound Architecture Review',
    snippet: 'Hey Rahul, the infrastructure migration looks rock-solid. Let us finalize the Cloudflare worker rules...',
    body: `Hi Rahul,

I reviewed the new Eazzio Mail architecture update. The separation of the public landing page from the production client at /mail is exceptionally clean.

A few quick points for our engineering review:
1. Inbound webhook endpoint (/v1/mail/inbound/webhook) handles RFC 822 MIME parsing cleanly.
2. WebSockets push realtime notifications without polling.
3. Dark product theme matches our production UX.

Let me know if you would like to schedule a 15-minute sync before deploying to production.

Best regards,
Sarah Lin
Principal Platform Engineer`,
    timestamp: '10:42 AM',
    isUnread: true,
    isStarred: true,
    folder: 'inbox',
    hasAttachment: true,
    attachmentName: 'roadmap_v2.pdf',
  },
  {
    id: 'demo-2',
    senderName: 'Cloudflare Security',
    senderEmail: 'security-alerts@cloudflare.com',
    recipientEmail: 'rahulkumar@eazzio.com',
    subject: 'Email Routing Worker Verification Successful',
    snippet: 'Your Cloudflare Inbound Email Worker (eazzio-email-inbound) has been successfully verified and bound...',
    body: `Hello Team,

This is an automated confirmation that your Cloudflare Email Routing configuration for eazzio.com is active.

- Destination: Inbound Gateway Webhook
- SPF / DKIM Checks: Enforced & Passing
- Quota: Unlimited Inbound Relay

Zero tracking pixels detected in incoming streams. No further action required.`,
    timestamp: 'Yesterday',
    isUnread: false,
    isStarred: false,
    folder: 'inbox',
  },
  {
    id: 'demo-3',
    senderName: 'Alex Mercer',
    senderEmail: 'alex@mercerdesign.co',
    recipientEmail: 'rahulkumar@eazzio.com',
    subject: 'Design System & Typography Token Feedback',
    snippet: 'The dark slate visual theme and 8px base spacing system feel very professional and calm...',
    body: `Hey Rahul,

I took a close look at the updated typography scale and design tokens.

The Inter font styling paired with the 8px grid creates a calm, high-density email reading experience. The lack of distracting decorative gradients makes it feel like a real productivity tool.

Great work on this release!

Alex`,
    timestamp: 'Aug 24',
    isUnread: false,
    isStarred: true,
    folder: 'inbox',
  },
  {
    id: 'demo-4',
    senderName: 'Eazzio Notification',
    senderEmail: 'system@eazzio.com',
    recipientEmail: 'rahulkumar@eazzio.com',
    subject: 'Welcome to Eazzio Mail — Getting Started Guide',
    snippet: 'Welcome to your private, ad-free email suite. Here are a few tips to get the most out of your mailbox...',
    body: `Welcome to Eazzio Mail!

Here is how to get started:
- Connect custom domains with automated SPF/DKIM verification.
- Create organized folder hierarchies and color-coded labels.
- Enjoy sub-second search across your entire archive.

Your communication remains private and protected.`,
    timestamp: 'Aug 20',
    isUnread: false,
    isStarred: false,
    folder: 'inbox',
  },
  {
    id: 'demo-5',
    senderName: 'You',
    senderEmail: 'rahulkumar@eazzio.com',
    recipientEmail: 'sarah.lin@techcorp.io',
    subject: 'Re: Cloudflare Inbound Verification',
    snippet: 'Thanks Sarah, the MX records and email routing worker have been verified and tested...',
    body: `Hi Sarah,

Thanks for the note! The inbound gateway webhook is fully verified and passing all unit tests.

We are ready to deploy.

Rahul`,
    timestamp: 'Aug 23',
    isUnread: false,
    isStarred: false,
    folder: 'sent',
  },
  {
    id: 'demo-6',
    senderName: 'Draft',
    senderEmail: 'rahulkumar@eazzio.com',
    recipientEmail: 'team@eazzio.com',
    subject: 'Draft: Product Release Notes v1.2',
    snippet: 'Summary of new features: Interactive sandbox, sub-second search, custom domain support...',
    body: `Team,

Here is the draft for our upcoming release announcement:
- Public Landing Page launch
- Integrated mock sandbox
- Zero tracking guarantee

Draft saved automatically.`,
    timestamp: 'Aug 25',
    isUnread: false,
    isStarred: false,
    folder: 'drafts',
  },
];

export const InteractiveMailDemo: React.FC = () => {
  const [messages, setMessages] = useState<MockMessage[]>(initialMockMessages);
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'starred' | 'sent' | 'drafts'>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>('demo-1');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isComposeOpen, setIsComposeOpen] = useState<boolean>(false);
  const [composeTo, setComposeTo] = useState<string>('');
  const [composeSubject, setComposeSubject] = useState<string>('');
  const [composeBody, setComposeBody] = useState<string>('');
  const [quickReplyText, setQuickReplyText] = useState<string>('');
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const triggerNotice = (msg: string) => {
    setDemoNotice(msg);
    setTimeout(() => setDemoNotice(null), 3500);
  };

  const displayedMessages = messages.filter((msg) => {
    const matchesFolder =
      activeFolder === 'starred'
        ? msg.isStarred
        : msg.folder === activeFolder;

    if (!matchesFolder) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      msg.subject.toLowerCase().includes(q) ||
      msg.senderName.toLowerCase().includes(q) ||
      msg.body.toLowerCase().includes(q) ||
      msg.snippet.toLowerCase().includes(q)
    );
  });

  const selectedMessage = messages.find((m) => m.id === selectedId) || displayedMessages[0];

  const handleToggleStar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isStarred: !m.isStarred } : m))
    );
    triggerNotice('Star status updated');
  };

  const handleSelectMessage = (id: string) => {
    setSelectedId(id);
    setMobileView('detail');
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, isUnread: false } : m))
    );
  };

  const handleSendCompose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeSubject.trim()) return;

    const newMsg: MockMessage = {
      id: `demo-user-${Date.now()}`,
      senderName: 'You',
      senderEmail: 'rahulkumar@eazzio.com',
      recipientEmail: composeTo || 'recipient@example.com',
      subject: composeSubject,
      snippet: composeBody.slice(0, 80) || 'No body content',
      body: composeBody || 'No body content',
      timestamp: 'Just now',
      isUnread: false,
      isStarred: false,
      folder: 'sent',
      hasAttachment: false,
    };

    setMessages((prev) => [newMsg, ...prev]);
    setIsComposeOpen(false);
    setComposeTo('');
    setComposeSubject('');
    setComposeBody('');
    triggerNotice('Simulated message sent to Sent folder.');
  };

  const handleSendQuickReply = () => {
    if (!quickReplyText.trim() || !selectedMessage) return;

    const replyMsg: MockMessage = {
      id: `demo-reply-${Date.now()}`,
      senderName: 'You',
      senderEmail: 'rahulkumar@eazzio.com',
      recipientEmail: selectedMessage.senderEmail,
      subject: `Re: ${selectedMessage.subject}`,
      snippet: quickReplyText,
      body: quickReplyText,
      timestamp: 'Just now',
      isUnread: false,
      isStarred: false,
      folder: 'sent',
      hasAttachment: false,
    };

    setMessages((prev) => [replyMsg, ...prev]);
    setQuickReplyText('');
    triggerNotice('Quick reply added to thread.');
  };

  const inboxUnreadCount = messages.filter((m) => m.folder === 'inbox' && m.isUnread).length;

  return (
    <section id="demo" className="py-16 sm:py-20 md:py-24 bg-[#F8FAFC] border-t border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#F0FDFA] border border-[#CCFBF1] text-xs font-semibold text-[#0F766E] mb-3">
            <Zap className="w-3.5 h-3.5 text-[#14B8A6]" />
            <span>Interactive Demo Sandbox</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#0F172A] tracking-tight mb-3">
            Test drive the real Eazzio Mail interface.
          </h2>
          <p className="text-[#475569] text-xs sm:text-sm md:text-base">
            Click around the live sandbox below. Experience conversation threading, search filters, and fast response times running on isolated mock state.
          </p>
        </div>

        {/* Demo Notification Banner */}
        {demoNotice && (
          <div className="max-w-md mx-auto mb-4 px-4 py-2 rounded-[10px] bg-[#F0FDFA] border border-[#CCFBF1] text-xs text-[#0F766E] text-center font-medium animate-fade-in flex items-center justify-center gap-2 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#14B8A6] shrink-0" />
            <span>{demoNotice}</span>
          </div>
        )}

        {/* Outer App Frame Container */}
        <div className="rounded-[16px] border border-[#CBD5E1] bg-[#020617] shadow-xl overflow-hidden flex flex-col h-[600px] sm:h-[650px] relative">
          {/* Mock App Header */}
          <div className="h-14 border-b border-[#263244] bg-[#0B1220] px-3 sm:px-4 flex items-center justify-between gap-3 select-none shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-[6px] bg-gradient-to-tr from-[#14B8A6] to-[#0E172A] flex items-center justify-center font-bold text-white text-xs shrink-0">
                E
              </div>
              <span className="font-semibold text-white text-sm hidden sm:inline">Eazzio Mail</span>
            </div>

            {/* Search Bar Input */}
            <div className="flex-1 max-w-lg relative">
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search mock emails..."
                className="w-full h-8 pl-8 pr-3 text-xs bg-[#111827] border border-[#263244] rounded-[10px] text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#14B8A6]"
              />
            </div>

            {/* Compose trigger & Status Badges */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsComposeOpen(true)}
                className="md:hidden p-1.5 rounded-[8px] bg-[#14B8A6] text-white text-xs font-semibold flex items-center gap-1"
                aria-label="Compose mock email"
              >
                <Sparkles className="w-3.5 h-3.5" />
              </button>
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111827] border border-[#263244] text-[11px] text-[#CBD5E1]">
                <span className="w-2 h-2 rounded-full bg-[#14B8A6] animate-pulse" />
                <span>Live Sandbox</span>
              </div>
            </div>
          </div>

          {/* Mobile Folder Navigation Bar (< md) */}
          <div className="md:hidden flex items-center gap-1.5 p-2 bg-[#0B1220] border-b border-[#263244] overflow-x-auto text-xs shrink-0 custom-scrollbar">
            {(['inbox', 'starred', 'sent', 'drafts'] as const).map((fld) => (
              <button
                key={fld}
                onClick={() => {
                  setActiveFolder(fld);
                  setMobileView('list');
                }}
                className={`px-3 py-1 rounded-[6px] capitalize font-medium shrink-0 transition-colors ${
                  activeFolder === fld
                    ? 'bg-[#14B8A6] text-white'
                    : 'text-[#94A3B8] hover:text-white bg-[#111827]'
                }`}
              >
                {fld} {fld === 'inbox' && inboxUnreadCount > 0 ? `(${inboxUnreadCount})` : ''}
              </button>
            ))}
          </div>

          {/* Main App Body */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Desktop Left Sidebar (>= md) */}
            <div className="hidden md:flex w-48 sm:w-52 border-r border-[#263244] bg-[#0B1220] flex-col justify-between p-3 select-none shrink-0">
              <div className="space-y-4">
                {/* Compose CTA */}
                <button
                  onClick={() => setIsComposeOpen(true)}
                  className="w-full py-2 px-3 rounded-[8px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#14B8A6]/20 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Compose</span>
                </button>

                {/* Navigation Items */}
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveFolder('inbox')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
                      activeFolder === 'inbox'
                        ? 'bg-[#134E4A] text-white border border-[#14B8A6]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Inbox className="w-3.5 h-3.5 text-[#14B8A6]" />
                      <span>Inbox</span>
                    </div>
                    {inboxUnreadCount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#14B8A6] text-white font-bold">
                        {inboxUnreadCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveFolder('starred')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
                      activeFolder === 'starred'
                        ? 'bg-[#134E4A] text-white border border-[#14B8A6]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span>Starred</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveFolder('sent')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
                      activeFolder === 'sent'
                        ? 'bg-[#134E4A] text-white border border-[#14B8A6]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5 text-[#5BCDC0]" />
                      <span>Sent</span>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveFolder('drafts')}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors ${
                      activeFolder === 'drafts'
                        ? 'bg-[#134E4A] text-white border border-[#14B8A6]/40'
                        : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#111827]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Drafts</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Bottom Storage Widget */}
              <div className="p-2.5 rounded-[8px] bg-[#111827] border border-[#263244] space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-[#94A3B8]">Storage</span>
                  <span className="text-[#F8FAFC] font-mono">12.4 MB / 500 MB</span>
                </div>
                <div className="w-full h-1 rounded-full bg-[#172033] overflow-hidden">
                  <div className="w-2.5% h-full bg-[#14B8A6]" />
                </div>
              </div>
            </div>

            {/* Message List Column */}
            <div
              className={`${
                mobileView === 'detail' ? 'hidden md:flex' : 'flex'
              } w-full md:w-64 lg:w-80 border-r border-[#263244] bg-[#020617] flex-col overflow-y-auto shrink-0`}
            >
              <div className="p-2.5 border-b border-[#263244] flex items-center justify-between text-xs text-[#94A3B8]">
                <span className="font-semibold uppercase tracking-wider text-[10px] text-[#94A3B8]">
                  {activeFolder} ({displayedMessages.length})
                </span>
                <span className="text-[10px] text-[#64748B]">Sorted by Date</span>
              </div>

              <div className="divide-y divide-[#263244]/60">
                {displayedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg.id)}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedId === msg.id
                        ? 'bg-[#111827] border-l-2 border-l-[#14B8A6]'
                        : 'hover:bg-[#111827]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {msg.isUnread && <span className="w-1.5 h-1.5 rounded-full bg-[#14B8A6] shrink-0" />}
                        <span
                          className={`text-xs truncate ${
                            msg.isUnread ? 'font-bold text-[#F8FAFC]' : 'font-medium text-[#CBD5E1]'
                          }`}
                        >
                          {msg.senderName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => handleToggleStar(e, msg.id)}
                          className="text-[#64748B] hover:text-amber-400 p-0.5"
                          aria-label={msg.isStarred ? 'Unstar message' : 'Star message'}
                        >
                          <Star
                            className={`w-3 h-3 ${
                              msg.isStarred ? 'text-amber-400 fill-amber-400' : 'text-[#475569]'
                            }`}
                          />
                        </button>
                        <span className="text-[10px] text-[#64748B] font-mono">{msg.timestamp}</span>
                      </div>
                    </div>

                    <p className={`text-xs truncate mb-1 ${msg.isUnread ? 'font-semibold text-[#F8FAFC]' : 'text-[#94A3B8]'}`}>
                      {msg.subject}
                    </p>
                    <p className="text-[11px] text-[#64748B] line-clamp-1">{msg.snippet}</p>

                    {msg.hasAttachment && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#94A3B8]">
                        <Paperclip className="w-2.5 h-2.5 text-[#14B8A6]" />
                        <span>{msg.attachmentName}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Reading Pane Column */}
            <div
              className={`${
                mobileView === 'list' ? 'hidden md:flex' : 'flex'
              } flex-1 bg-[#020617] flex-col min-w-0 overflow-y-auto`}
            >
              {selectedMessage ? (
                <div className="p-4 sm:p-5 space-y-4 sm:space-y-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-4">
                    {/* Toolbar with Mobile Back Button */}
                    <div className="flex items-center justify-between border-b border-[#263244] pb-3 text-[#94A3B8]">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setMobileView('list')}
                          className="md:hidden flex items-center gap-1 text-xs text-[#14B8A6] font-semibold pr-2 border-r border-[#263244]"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>
                        <button
                          onClick={() => triggerNotice('Message archived')}
                          className="p-1.5 hover:text-white rounded hover:bg-[#111827]"
                          title="Archive"
                          aria-label="Archive message"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setMessages((prev) => prev.filter((m) => m.id !== selectedMessage.id));
                            setMobileView('list');
                            triggerNotice('Message deleted');
                          }}
                          className="p-1.5 hover:text-rose-400 rounded hover:bg-[#111827]"
                          title="Delete"
                          aria-label="Delete message"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#14B8A6]">
                        <Shield className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">SPF/DKIM: Pass</span>
                        <span className="sm:hidden">Pass</span>
                      </div>
                    </div>

                    {/* Subject Header */}
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-[#F8FAFC] mb-2">{selectedMessage.subject}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#94A3B8] gap-1">
                        <div>
                          <span className="font-semibold text-[#CBD5E1]">{selectedMessage.senderName}</span>{' '}
                          <span className="text-[#64748B]">&lt;{selectedMessage.senderEmail}&gt;</span>
                        </div>
                        <span className="font-mono text-[11px] text-[#64748B]">{selectedMessage.timestamp}</span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5">To: {selectedMessage.recipientEmail}</p>
                    </div>

                    {/* Email Body Content */}
                    <div className="p-3.5 sm:p-4 rounded-[10px] bg-[#111827] border border-[#263244] text-xs text-[#CBD5E1] whitespace-pre-line leading-relaxed">
                      {selectedMessage.body}
                    </div>

                    {/* Attachment Box if any */}
                    {selectedMessage.hasAttachment && (
                      <div className="p-2.5 rounded-[8px] bg-[#0B1220] border border-[#263244] flex items-center justify-between max-w-xs text-xs">
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-3.5 h-3.5 text-[#14B8A6]" />
                          <span className="font-medium text-[#F8FAFC] truncate">{selectedMessage.attachmentName}</span>
                        </div>
                        <span className="text-[10px] text-[#64748B] font-mono shrink-0 ml-2">1.2 MB</span>
                      </div>
                    )}
                  </div>

                  {/* Quick Reply & Smart Suggestions Footer */}
                  <div className="pt-3 sm:pt-4 border-t border-[#263244] space-y-2.5">
                    {/* Smart Pill Suggestions */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className="text-[#64748B] hidden sm:flex items-center gap-1 mr-1">
                        <Sparkles className="w-3 h-3 text-[#14B8A6]" /> Smart:
                      </span>
                      {['Looks great to proceed.', 'Thank you for the update!', 'Let us schedule a sync.'].map(
                        (pill, idx) => (
                          <button
                            key={idx}
                            onClick={() => setQuickReplyText(pill)}
                            className="px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-[#111827] hover:bg-[#172033] text-[#CBD5E1] hover:text-white border border-[#263244] transition-all text-[10px] sm:text-[11px]"
                          >
                            {pill}
                          </button>
                        )
                      )}
                    </div>

                    {/* Reply Input Box */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={quickReplyText}
                        onChange={(e) => setQuickReplyText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendQuickReply()}
                        placeholder="Write a quick reply..."
                        className="flex-1 h-9 px-3 text-xs bg-[#111827] border border-[#263244] rounded-[8px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#14B8A6]"
                      />
                      <button
                        onClick={handleSendQuickReply}
                        className="h-9 px-3.5 sm:px-4 rounded-[8px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                      >
                        <span>Send</span>
                        <Send className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-[#64748B]">
                  Select a message to view conversation
                </div>
              )}
            </div>
          </div>

          {/* Floating Demo Compose Modal */}
          {isComposeOpen && (
            <div className="absolute bottom-3 right-3 left-3 sm:left-auto sm:w-96 rounded-[12px] bg-[#0B1220] border border-[#263244] shadow-2xl p-4 z-20 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#263244] pb-2">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#14B8A6]" /> New Message
                </span>
                <button onClick={() => setIsComposeOpen(false)} className="text-[#94A3B8] hover:text-white" aria-label="Close composer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSendCompose} className="space-y-2.5">
                <input
                  type="email"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  placeholder="To: recipient@example.com"
                  className="w-full h-8 px-2.5 text-xs bg-[#111827] border border-[#263244] rounded-[6px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#14B8A6]"
                />
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Subject"
                  required
                  className="w-full h-8 px-2.5 text-xs bg-[#111827] border border-[#263244] rounded-[6px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#14B8A6]"
                />
                <textarea
                  rows={3}
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your email..."
                  className="w-full p-2.5 text-xs bg-[#111827] border border-[#263244] rounded-[6px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#14B8A6] resize-none"
                />
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-[#64748B]">Simulated Relay</span>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-[8px] bg-[#14B8A6] hover:bg-[#19B8A4] text-white text-xs font-semibold flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#14B8A6] focus-visible:outline-none"
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
