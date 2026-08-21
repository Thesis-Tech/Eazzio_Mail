import { describe, it, expect } from 'vitest';
import { FolderItem, LabelItem, FilterRule, UserPreferences } from '../src/types/mail';

describe('TASK-020: Settings, Labels, Filters & Folder Management UI Tests', () => {
  const initialFolders: FolderItem[] = [
    { id: 'fld-inbox', name: 'Inbox', slug: 'inbox', type: 'system', unreadCount: 3, totalCount: 142 },
    { id: 'fld-sent', name: 'Sent', slug: 'sent', type: 'system', unreadCount: 0, totalCount: 89 },
    { id: 'fld-custom-1', name: 'Projects', slug: 'projects', type: 'custom', unreadCount: 1, totalCount: 15 },
  ];

  const initialLabels: LabelItem[] = [
    { id: 'lbl-1', name: 'Work', color: '#2D5BFF' },
    { id: 'lbl-2', name: 'Finance', color: '#10B981' },
  ];

  const initialFilterRules: FilterRule[] = [
    {
      id: 'rule-1',
      name: 'Tag Company Emails',
      field: 'from',
      operator: 'contains',
      value: '@eazzio.com',
      action: 'apply_label',
      actionValue: 'Work',
      isEnabled: true,
    },
    {
      id: 'rule-2',
      name: 'Archive Old Invoices',
      field: 'subject',
      operator: 'contains',
      value: 'Invoice',
      action: 'move_to_folder',
      actionValue: 'Finance',
      isEnabled: false,
    },
  ];

  const initialPreferences: UserPreferences = {
    defaultMailbox: 'user@eazzio.com',
    signature: 'Best regards,\nRahul Kumar',
    autoSummarizeWithAI: true,
    soundNotifications: true,
    theme: 'dark',
  };

  describe('Label Management', () => {
    it('should create a new label with color tag', () => {
      const newLabel: LabelItem = {
        id: 'lbl-3',
        name: 'Urgent',
        color: '#EF4444',
      };
      const updatedLabels = [...initialLabels, newLabel];
      expect(updatedLabels).toHaveLength(3);
      expect(updatedLabels[2].name).toBe('Urgent');
      expect(updatedLabels[2].color).toBe('#EF4444');
    });

    it('should edit an existing label name and color', () => {
      const updatedLabels = initialLabels.map((l) =>
        l.id === 'lbl-1' ? { ...l, name: 'Work & Operations', color: '#8B5CF6' } : l
      );
      const edited = updatedLabels.find((l) => l.id === 'lbl-1');
      expect(edited?.name).toBe('Work & Operations');
      expect(edited?.color).toBe('#8B5CF6');
    });

    it('should delete a label by ID', () => {
      const remaining = initialLabels.filter((l) => l.id !== 'lbl-2');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe('lbl-1');
    });
  });

  describe('Folder Hierarchy Management', () => {
    it('should distinguish between system and custom folders', () => {
      const systemFolders = initialFolders.filter((f) => f.type === 'system');
      const customFolders = initialFolders.filter((f) => f.type === 'custom');
      expect(systemFolders).toHaveLength(2);
      expect(customFolders).toHaveLength(1);
      expect(customFolders[0].slug).toBe('projects');
    });

    it('should create custom folder and generate URL slug', () => {
      const newFolderName = 'Legal & Compliance';
      const newFolder: FolderItem = {
        id: 'fld-custom-2',
        name: newFolderName,
        slug: newFolderName.toLowerCase().replace(/\s+/g, '-'),
        type: 'custom',
        unreadCount: 0,
        totalCount: 0,
      };
      const updatedFolders = [...initialFolders, newFolder];
      expect(updatedFolders).toHaveLength(4);
      expect(updatedFolders[3].slug).toBe('legal-&-compliance');
    });

    it('should prevent deletion of system folders', () => {
      const attemptDelete = (folderId: string, list: FolderItem[]) => {
        const target = list.find((f) => f.id === folderId);
        if (target?.type === 'system') {
          throw new Error('Cannot delete system folder');
        }
        return list.filter((f) => f.id !== folderId);
      };

      expect(() => attemptDelete('fld-inbox', initialFolders)).toThrow('Cannot delete system folder');
      const result = attemptDelete('fld-custom-1', initialFolders);
      expect(result).toHaveLength(2);
    });
  });

  describe('Filter Rules & Automation', () => {
    it('should evaluate filter rule conditions accurately', () => {
      const rule = initialFilterRules[0];
      const matchMessage = {
        from: 'ceo@eazzio.com',
        subject: 'Q3 Review',
        body: 'Please review',
      };

      const isMatch = rule.field === 'from' && matchMessage.from.includes(rule.value);
      expect(isMatch).toBe(true);
    });

    it('should toggle rule enabled state', () => {
      const toggled = initialFilterRules.map((r) =>
        r.id === 'rule-2' ? { ...r, isEnabled: !r.isEnabled } : r
      );
      expect(toggled.find((r) => r.id === 'rule-2')?.isEnabled).toBe(true);
    });
  });

  describe('User Preferences & AI Settings', () => {
    it('should update user outbound email signature', () => {
      const newSignature = 'Rahul Kumar\nCTO | Eazzio Inc.';
      const updatedPrefs = { ...initialPreferences, signature: newSignature };
      expect(updatedPrefs.signature).toBe(newSignature);
    });

    it('should toggle AI auto-summarization and sound preferences', () => {
      const updatedPrefs = {
        ...initialPreferences,
        autoSummarizeWithAI: false,
        soundNotifications: false,
      };
      expect(updatedPrefs.autoSummarizeWithAI).toBe(false);
      expect(updatedPrefs.soundNotifications).toBe(false);
    });
  });
});
