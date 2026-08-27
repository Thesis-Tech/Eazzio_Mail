'use client';

import React from 'react';
import { GripVertical, ChevronLeft, ChevronRight } from 'lucide-react';

interface SplitSliderProps {
  isDragging: boolean;
  currentWidth?: number;
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart?: (e: React.TouchEvent) => void;
  onDoubleClick?: () => void;
  onCollapse?: () => void;
  onExpand?: () => void;
  className?: string;
}

export const SplitSlider: React.FC<SplitSliderProps> = ({
  isDragging,
  currentWidth,
  onMouseDown,
  onTouchStart,
  onDoubleClick,
  onCollapse,
  onExpand,
  className = '',
}) => {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      tabIndex={0}
      title="Drag to resize panes | Double-click to reset (384px)"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      onDoubleClick={onDoubleClick}
      className={`hidden md:flex relative items-center justify-center w-3 -mx-1.5 z-30 cursor-col-resize select-none group transition-all duration-150 ${
        isDragging ? 'bg-[#2D5BFF]/30' : 'hover:bg-[#2D5BFF]/20'
      } ${className}`}
    >
      {/* Visual vertical divider line */}
      <div
        className={`w-[2px] h-full transition-colors ${
          isDragging
            ? 'bg-[#2D5BFF] shadow-[0_0_8px_rgba(45,91,255,0.8)]'
            : 'bg-[#2A2E37] group-hover:bg-[#2D5BFF]'
        }`}
      />

      {/* Interactive Center Grab Handle */}
      <div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-9 rounded-full border transition-all duration-150 shadow-lg ${
          isDragging
            ? 'bg-[#2D5BFF] border-[#2D5BFF] text-white scale-110 shadow-[0_0_12px_rgba(45,91,255,0.7)]'
            : 'bg-[#181B22] border-[#2E3440] text-slate-400 group-hover:border-[#2D5BFF] group-hover:text-white group-hover:bg-[#222734] group-hover:scale-105'
        }`}
      >
        <GripVertical className="w-3 h-3" />
      </div>

      {/* Active dragging floating width pill badge */}
      {isDragging && currentWidth && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-[#2D5BFF] text-white text-[10px] font-mono font-bold shadow-xl border border-white/20 whitespace-nowrap pointer-events-none z-50 animate-in fade-in zoom-in-90 duration-100">
          {Math.round(currentWidth)}px
        </div>
      )}
    </div>
  );
};
