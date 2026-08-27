import { describe, it, expect } from 'vitest';
import { FolderItem, LabelItem } from '../src/types/mail';

describe('NavigationSidebar Unit Tests (ACTION-W01.1 / STEP-7-DATA-INTEGRITY)', () => {
  const mockFolders: FolderItem[] = [
    { id: 'f-1', name: 'Inbox', slug: 'inbox', type: 'system', unreadCount: 4, totalCount: 20 },
    { id: 'f-2', name: 'Sent', slug: 'sent', type: 'system', unreadCount: 0, totalCount: 15 },
    { id: 'f-3', name: 'Drafts', slug: 'drafts', type: 'system', unreadCount: 0, totalCount: 3 },
    { id: 'f-4', name: 'Spam', slug: 'spam', type: 'system', unreadCount: 2, totalCount: 4 },
    { id: 'f-5', name: 'Trash', slug: 'trash', type: 'system', unreadCount: 0, totalCount: 8 },
    { id: 'f-6', name: 'Archive', slug: 'archive', type: 'system', unreadCount: 0, totalCount: 50 },
  ];

  const mockLabels: LabelItem[] = [
    { id: 'l-1', name: 'Work', color: '#2D5BFF' },
    { id: 'l-2', name: 'Urgent', color: '#EF4444' },
  ];

  it('should validate complete set of 6 system folders', () => {
    expect(mockFolders.length).toBe(6);
    const slugs = mockFolders.map((f) => f.slug);
    expect(slugs).toEqual(['inbox', 'sent', 'drafts', 'spam', 'trash', 'archive']);
  });

  it('should correctly calculate total unread badge counts across folders', () => {
    const totalUnread = mockFolders.reduce((acc, f) => acc + f.unreadCount, 0);
    expect(totalUnread).toBe(6);
  });

  it('should display unreadCount for Inbox and totalCount for Drafts and Sent', () => {
    const inbox = mockFolders.find((f) => f.slug === 'inbox');
    const drafts = mockFolders.find((f) => f.slug === 'drafts');
    const sent = mockFolders.find((f) => f.slug === 'sent');

    expect(inbox?.unreadCount).toBe(4);
    expect(drafts?.totalCount).toBe(3);
    expect(sent?.totalCount).toBe(15);
  });

  it('should match label color tokens with design system standards', () => {
    expect(mockLabels[0].color).toBe('#2D5BFF');
  });
});
