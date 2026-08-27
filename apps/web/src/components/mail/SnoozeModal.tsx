'use client';

import React, { useState } from 'react';
import { Clock, Calendar, Sun, Moon, CalendarDays, X, Check } from 'lucide-react';

interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (snoozeDate: Date) => void;
  targetCount?: number;
}

export const SnoozeModal: React.FC<SnoozeModalProps> = ({
  isOpen,
  onClose,
  onSnooze,
  targetCount = 1,
}) => {
  const [customDateTime, setCustomDateTime] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  if (!isOpen) return null;

  const now = new Date();

  // Presets
  const getLaterToday = () => {
    const d = new Date();
    d.setHours(18, 0, 0, 0);
    if (d.getTime() <= now.getTime()) {
      d.setHours(21, 0, 0, 0);
    }
    return d;
  };

  const getTomorrowMorning = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(8, 0, 0, 0);
    return d;
  };

  const getThisWeekend = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(9, 0, 0, 0);
    return d;
  };

  const getNextWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (1 - day + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
    d.setHours(8, 0, 0, 0);
    return d;
  };

  const presets = [
    {
      id: 'later-today',
      label: 'Later today',
      time: '6:00 PM',
      icon: Sun,
      getDate: getLaterToday,
    },
    {
      id: 'tomorrow',
      label: 'Tomorrow',
      time: '8:00 AM',
      icon: Clock,
      getDate: getTomorrowMorning,
    },
    {
      id: 'this-weekend',
      label: 'This weekend',
      time: 'Sat, 9:00 AM',
      icon: Moon,
      getDate: getThisWeekend,
    },
    {
      id: 'next-week',
      label: 'Next week',
      time: 'Mon, 8:00 AM',
      icon: CalendarDays,
      getDate: getNextWeek,
    },
  ];

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customDateTime) return;
    const d = new Date(customDateTime);
    if (!isNaN(d.getTime()) && d.getTime() > Date.now()) {
      onSnooze(d);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-sm rounded-2xl bg-[#16181D] border border-[#2E3440] shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#22262E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2D5BFF]/10 text-[#2D5BFF] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Snooze until...</h3>
              <p className="text-[11px] text-slate-400">
                {targetCount > 1 ? `${targetCount} conversations` : '1 conversation'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#22262E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-1">
          {!isCustom ? (
            <>
              {presets.map((p) => {
                const Icon = p.icon;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      onSnooze(p.getDate());
                      onClose();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left hover:bg-[#22262E] text-slate-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-[#2D5BFF] transition-colors" />
                      <span className="text-xs font-medium">{p.label}</span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">{p.time}</span>
                  </button>
                );
              })}

              <div className="pt-2 border-t border-[#22262E] mt-2">
                <button
                  onClick={() => setIsCustom(true)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left hover:bg-[#22262E] text-[#2D5BFF] font-semibold text-xs transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Pick custom date & time...</span>
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={handleCustomSubmit} className="p-2 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Select Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111317] border border-[#2E3440] text-white text-xs focus:outline-none focus:border-[#2D5BFF]"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustom(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!customDateTime}
                  className="px-4 py-1.5 rounded-lg bg-[#2D5BFF] hover:bg-[#2448CC] disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md shadow-[#2D5BFF]/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
