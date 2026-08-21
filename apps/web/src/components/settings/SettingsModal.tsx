'use client';

import React, { useState } from 'react';
import {
  X,
  Tag,
  Folder,
  Sliders,
  User,
  Plus,
  Trash2,
  Edit2,
  Check,
  ToggleLeft,
  ToggleRight,
  Shield,
  Sparkles,
  Volume2,
  Palette,
} from 'lucide-react';
import { FolderItem, LabelItem, FilterRule, UserPreferences } from '../../types/mail';

export interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderItem[];
  labels: LabelItem[];
  filterRules: FilterRule[];
  preferences: UserPreferences;
  onUpdateFolders: (folders: FolderItem[]) => void;
  onUpdateLabels: (labels: LabelItem[]) => void;
  onUpdateFilterRules: (rules: FilterRule[]) => void;
  onUpdatePreferences: (preferences: UserPreferences) => void;
}

const PRESET_COLORS = [
  '#2D5BFF', // Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  folders,
  labels,
  filterRules,
  preferences,
  onUpdateFolders,
  onUpdateLabels,
  onUpdateFilterRules,
  onUpdatePreferences,
}) => {
  const [activeTab, setActiveTab] = useState<'labels' | 'folders' | 'filters' | 'preferences'>('labels');

  // Label Management State
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_COLORS[0]);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [editingLabelColor, setEditingLabelColor] = useState('');

  // Folder Management State
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  // Filter Rule State
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleField, setNewRuleField] = useState<'from' | 'to' | 'subject' | 'body'>('from');
  const [newRuleOperator, setNewRuleOperator] = useState<'contains' | 'equals' | 'starts_with' | 'ends_with'>('contains');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<'apply_label' | 'move_to_folder' | 'mark_as_read' | 'star'>('apply_label');
  const [newRuleActionValue, setNewRuleActionValue] = useState(labels[0]?.name || 'Work');

  if (!isOpen) return null;

  // --- LABEL HANDLERS ---
  const handleCreateLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabelName.trim()) return;
    const newLabel: LabelItem = {
      id: `lbl-${Date.now()}`,
      name: newLabelName.trim(),
      color: newLabelColor || '#2D5BFF',
    };
    onUpdateLabels([...labels, newLabel]);
    setNewLabelName('');
    setNewLabelColor(PRESET_COLORS[0]);
  };

  const handleSaveEditLabel = (id: string) => {
    if (!editingLabelName.trim()) return;
    onUpdateLabels(
      labels.map((l) =>
        l.id === id ? { ...l, name: editingLabelName.trim(), color: editingLabelColor || l.color } : l
      )
    );
    setEditingLabelId(null);
  };

  const handleDeleteLabel = (id: string) => {
    onUpdateLabels(labels.filter((l) => l.id !== id));
  };

  // --- FOLDER HANDLERS ---
  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    const newFolder: FolderItem = {
      id: `fld-${Date.now()}`,
      name: newFolderName.trim(),
      slug: newFolderName.trim().toLowerCase().replace(/\s+/g, '-'),
      type: 'custom',
      unreadCount: 0,
      totalCount: 0,
    };
    onUpdateFolders([...folders, newFolder]);
    setNewFolderName('');
  };

  const handleSaveEditFolder = (id: string) => {
    if (!editingFolderName.trim()) return;
    onUpdateFolders(
      folders.map((f) =>
        f.id === id ? { ...f, name: editingFolderName.trim(), slug: editingFolderName.trim().toLowerCase().replace(/\s+/g, '-') } : f
      )
    );
    setEditingFolderId(null);
  };

  const handleDeleteFolder = (id: string) => {
    onUpdateFolders(folders.filter((f) => f.id !== id));
  };

  // --- FILTER RULE HANDLERS ---
  const handleCreateFilterRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newRuleValue.trim()) return;
    const rule: FilterRule = {
      id: `rule-${Date.now()}`,
      name: newRuleName.trim(),
      field: newRuleField,
      operator: newRuleOperator,
      value: newRuleValue.trim(),
      action: newRuleAction,
      actionValue: newRuleActionValue,
      isEnabled: true,
    };
    onUpdateFilterRules([...filterRules, rule]);
    setNewRuleName('');
    setNewRuleValue('');
  };

  const handleToggleFilterRule = (id: string) => {
    onUpdateFilterRules(
      filterRules.map((r) => (r.id === id ? { ...r, isEnabled: !r.isEnabled } : r))
    );
  };

  const handleDeleteFilterRule = (id: string) => {
    onUpdateFilterRules(filterRules.filter((r) => r.id !== id));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in"
      data-testid="settings-modal"
    >
      <div className="bg-[#16181D] border border-[#2A2E37] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-[#2A2E37] flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-white font-semibold text-base">
            <Sliders className="w-5 h-5 text-[#2D5BFF]" />
            <span>Settings & Preferences</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#2A2E37] transition-colors"
            data-testid="settings-close-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div className="flex-1 flex overflow-hidden">
          {/* Navigation Tabs */}
          <div className="w-48 bg-[#121418] border-r border-[#2A2E37] p-3 space-y-1">
            <button
              onClick={() => setActiveTab('labels')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'labels'
                  ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-semibold'
                  : 'text-slate-400 hover:bg-[#1C1F26] hover:text-slate-200'
              }`}
              data-testid="tab-labels"
            >
              <Tag className="w-4 h-4" />
              <span>Labels</span>
            </button>
            <button
              onClick={() => setActiveTab('folders')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'folders'
                  ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-semibold'
                  : 'text-slate-400 hover:bg-[#1C1F26] hover:text-slate-200'
              }`}
              data-testid="tab-folders"
            >
              <Folder className="w-4 h-4" />
              <span>Folders</span>
            </button>
            <button
              onClick={() => setActiveTab('filters')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'filters'
                  ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-semibold'
                  : 'text-slate-400 hover:bg-[#1C1F26] hover:text-slate-200'
              }`}
              data-testid="tab-filters"
            >
              <Sliders className="w-4 h-4" />
              <span>Filters & Rules</span>
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-semibold'
                  : 'text-slate-400 hover:bg-[#1C1F26] hover:text-slate-200'
              }`}
              data-testid="tab-preferences"
            >
              <User className="w-4 h-4" />
              <span>Preferences</span>
            </button>
          </div>

          {/* Tab Content Panels */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar text-slate-200">
            {/* 1. LABELS TAB */}
            {activeTab === 'labels' && (
              <div className="space-y-5" data-testid="panel-labels">
                <div>
                  <h3 className="text-sm font-semibold text-white">Manage Mail Labels</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Organize your incoming and outbound messages with custom color tags.
                  </p>
                </div>

                {/* Create Label Form */}
                <form onSubmit={handleCreateLabel} className="p-3.5 bg-[#121418] border border-[#2A2E37] rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Label name (e.g. Work, Finance, Important)"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="flex-1 bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#2D5BFF]"
                      data-testid="new-label-name-input"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2D5BFF] hover:bg-[#1E48E0] text-white text-xs font-semibold shadow-md transition-all shrink-0"
                      data-testid="create-label-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Label</span>
                    </button>
                  </div>
                  {/* Color Swatches */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-xs text-slate-400">Color:</span>
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewLabelColor(color)}
                        className={`w-5 h-5 rounded-full border transition-all ${
                          newLabelColor === color ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </form>

                {/* Labels List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Existing Labels ({labels.length})</h4>
                  {labels.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No labels created yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {labels.map((label) => (
                        <div
                          key={label.id}
                          className="p-2.5 bg-[#121418] border border-[#2A2E37] rounded-xl flex items-center justify-between gap-3 text-xs"
                          data-testid={`label-card-${label.id}`}
                        >
                          {editingLabelId === label.id ? (
                            <div className="flex-1 flex items-center gap-2">
                              <input
                                type="text"
                                value={editingLabelName}
                                onChange={(e) => setEditingLabelName(e.target.value)}
                                className="flex-1 bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded px-2 py-1 outline-none"
                              />
                              <button
                                onClick={() => handleSaveEditLabel(label.id)}
                                className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                              <span className="font-medium text-white truncate">{label.name}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1 shrink-0">
                            {editingLabelId !== label.id && (
                              <button
                                onClick={() => {
                                  setEditingLabelId(label.id);
                                  setEditingLabelName(label.name);
                                  setEditingLabelColor(label.color);
                                }}
                                className="p-1 text-slate-400 hover:text-white"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteLabel(label.id)}
                              className="p-1 text-slate-400 hover:text-red-400"
                              title="Delete"
                              data-testid={`delete-label-${label.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. FOLDERS TAB */}
            {activeTab === 'folders' && (
              <div className="space-y-5" data-testid="panel-folders">
                <div>
                  <h3 className="text-sm font-semibold text-white">Custom Folders Management</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Create custom mail folders to categorize messages beyond default system folders.
                  </p>
                </div>

                {/* Create Folder Form */}
                <form onSubmit={handleCreateFolder} className="p-3.5 bg-[#121418] border border-[#2A2E37] rounded-xl flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="New folder name (e.g. Invoices, Clients, HR)"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    className="flex-1 bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#2D5BFF]"
                    data-testid="new-folder-name-input"
                  />
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#2D5BFF] hover:bg-[#1E48E0] text-white text-xs font-semibold shadow-md transition-all shrink-0"
                    data-testid="create-folder-btn"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Folder</span>
                  </button>
                </form>

                {/* Folder List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">All Mail Folders</h4>
                  <div className="space-y-1.5">
                    {folders.map((folder) => (
                      <div
                        key={folder.id}
                        className="p-2.5 bg-[#121418] border border-[#2A2E37] rounded-xl flex items-center justify-between gap-3 text-xs"
                      >
                        {editingFolderId === folder.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={editingFolderName}
                              onChange={(e) => setEditingFolderName(e.target.value)}
                              className="flex-1 bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded px-2 py-1 outline-none"
                            />
                            <button
                              onClick={() => handleSaveEditFolder(folder.id)}
                              className="p-1 rounded text-emerald-400 hover:bg-emerald-500/10"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2.5 truncate">
                            <Folder className="w-4 h-4 text-slate-400" />
                            <span className="font-medium text-white">{folder.name}</span>
                            {folder.type === 'system' ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2A2E37] text-slate-400">System</span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2D5BFF]/15 text-[#2D5BFF]">Custom</span>
                            )}
                          </div>
                        )}

                        {folder.type === 'custom' && (
                          <div className="flex items-center gap-1 shrink-0">
                            {editingFolderId !== folder.id && (
                              <button
                                onClick={() => {
                                  setEditingFolderId(folder.id);
                                  setEditingFolderName(folder.name);
                                }}
                                className="p-1 text-slate-400 hover:text-white"
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteFolder(folder.id)}
                              className="p-1 text-slate-400 hover:text-red-400"
                              title="Delete"
                              data-testid={`delete-folder-${folder.id}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 3. FILTERS TAB */}
            {activeTab === 'filters' && (
              <div className="space-y-5" data-testid="panel-filters">
                <div>
                  <h3 className="text-sm font-semibold text-white">Automation Filter Rules</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Automatically tag, categorize, or organize incoming emails according to criteria.
                  </p>
                </div>

                {/* Create Filter Rule Form */}
                <form onSubmit={handleCreateFilterRule} className="p-4 bg-[#121418] border border-[#2A2E37] rounded-xl space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">Rule Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Tag Company Emails"
                        value={newRuleName}
                        onChange={(e) => setNewRuleName(e.target.value)}
                        className="w-full bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#2D5BFF]"
                        data-testid="filter-name-input"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">Match Field</label>
                      <select
                        value={newRuleField}
                        onChange={(e) => setNewRuleField(e.target.value as any)}
                        className="w-full bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-3 py-2 outline-none"
                      >
                        <option value="from">From Address</option>
                        <option value="to">To Address</option>
                        <option value="subject">Subject Line</option>
                        <option value="body">Body Text</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">Condition & Value</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={newRuleOperator}
                          onChange={(e) => setNewRuleOperator(e.target.value as any)}
                          className="bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-2 py-2 outline-none"
                        >
                          <option value="contains">contains</option>
                          <option value="equals">equals</option>
                          <option value="starts_with">starts with</option>
                        </select>
                        <input
                          type="text"
                          placeholder="e.g. @company.com"
                          value={newRuleValue}
                          onChange={(e) => setNewRuleValue(e.target.value)}
                          className="flex-1 bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-3 py-2 outline-none focus:border-[#2D5BFF]"
                          data-testid="filter-value-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 mb-1 block">Action</label>
                      <div className="flex items-center gap-2">
                        <select
                          value={newRuleAction}
                          onChange={(e) => setNewRuleAction(e.target.value as any)}
                          className="bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-2 py-2 outline-none"
                        >
                          <option value="apply_label">Apply Label</option>
                          <option value="move_to_folder">Move to Folder</option>
                          <option value="star">Star Message</option>
                          <option value="mark_as_read">Mark as Read</option>
                        </select>
                        {newRuleAction === 'apply_label' && (
                          <select
                            value={newRuleActionValue}
                            onChange={(e) => setNewRuleActionValue(e.target.value)}
                            className="flex-1 bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg px-2 py-2 outline-none"
                          >
                            {labels.map((l) => (
                              <option key={l.id} value={l.name}>
                                {l.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#2D5BFF] hover:bg-[#1E48E0] text-white text-xs font-semibold shadow-md transition-all"
                      data-testid="create-filter-btn"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Save Rule</span>
                    </button>
                  </div>
                </form>

                {/* Filter Rules List */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Rules ({filterRules.length})</h4>
                  {filterRules.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No automated filter rules configured.</p>
                  ) : (
                    <div className="space-y-2">
                      {filterRules.map((rule) => (
                        <div
                          key={rule.id}
                          className="p-3 bg-[#121418] border border-[#2A2E37] rounded-xl flex items-center justify-between gap-3 text-xs"
                          data-testid={`filter-card-${rule.id}`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{rule.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  rule.isEnabled ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-700 text-slate-400'
                                }`}
                              >
                                {rule.isEnabled ? 'Active' : 'Disabled'}
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px]">
                              If <span className="text-slate-200 font-mono">{rule.field}</span> {rule.operator} "{rule.value}" ➔ {rule.action} {rule.actionValue ? `("${rule.actionValue}")` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              onClick={() => handleToggleFilterRule(rule.id)}
                              className="text-slate-400 hover:text-white"
                              title={rule.isEnabled ? 'Disable' : 'Enable'}
                            >
                              {rule.isEnabled ? (
                                <ToggleRight className="w-5 h-5 text-[#2D5BFF]" />
                              ) : (
                                <ToggleLeft className="w-5 h-5 text-slate-500" />
                              )}
                            </button>
                            <button
                              onClick={() => handleDeleteFilterRule(rule.id)}
                              className="p-1 text-slate-400 hover:text-red-400"
                              title="Delete Rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 4. PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div className="space-y-5" data-testid="panel-preferences">
                <div>
                  <h3 className="text-sm font-semibold text-white">User Preferences & Compose Signature</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Customize your email signature, AI assistant features, and notifications.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Email Signature */}
                  <div className="p-4 bg-[#121418] border border-[#2A2E37] rounded-xl space-y-2">
                    <label className="text-xs font-semibold text-white flex items-center gap-2">
                      <span>Default Outbound Signature</span>
                    </label>
                    <textarea
                      rows={3}
                      value={preferences.signature}
                      onChange={(e) => onUpdatePreferences({ ...preferences, signature: e.target.value })}
                      placeholder="Best regards,&#10;Your Name&#10;Company"
                      className="w-full bg-[#1A1D24] border border-[#2A2E37] text-white text-xs rounded-lg p-2.5 outline-none focus:border-[#2D5BFF] resize-none"
                      data-testid="signature-textarea"
                    />
                  </div>

                  {/* AI & Automation Settings */}
                  <div className="p-4 bg-[#121418] border border-[#2A2E37] rounded-xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="w-4 h-4 text-[#2D5BFF]" />
                        <div>
                          <p className="text-xs font-semibold text-white">AI Thread Summarization</p>
                          <p className="text-[11px] text-slate-400">Generate one-click thread executive summaries</p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onUpdatePreferences({
                            ...preferences,
                            autoSummarizeWithAI: !preferences.autoSummarizeWithAI,
                          })
                        }
                        className="text-slate-400 hover:text-white"
                        data-testid="toggle-ai-btn"
                      >
                        {preferences.autoSummarizeWithAI ? (
                          <ToggleRight className="w-6 h-6 text-[#2D5BFF]" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-500" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[#2A2E37]/60">
                      <div className="flex items-center gap-2.5">
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="text-xs font-semibold text-white">Sound Notifications</p>
                          <p className="text-[11px] text-slate-400">Play audio chime upon arrival of incoming emails</p>
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          onUpdatePreferences({
                            ...preferences,
                            soundNotifications: !preferences.soundNotifications,
                          })
                        }
                        className="text-slate-400 hover:text-white"
                        data-testid="toggle-sound-btn"
                      >
                        {preferences.soundNotifications ? (
                          <ToggleRight className="w-6 h-6 text-emerald-400" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-500" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
