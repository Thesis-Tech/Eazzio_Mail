'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-[#475569] dark:text-[#CBD5E1] mb-1.5">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <input
            {...props}
            ref={ref}
            type={isVisible ? 'text' : 'password'}
            className={`w-full px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#2A2E37] bg-white dark:bg-[#16181D] text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#14B8A6] focus:border-transparent text-sm transition-all pr-10 ${
              error ? 'border-rose-500 focus:ring-rose-500' : ''
            } ${className}`}
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            aria-label={isVisible ? 'Hide password' : 'Show password'}
            aria-pressed={isVisible}
            className="absolute right-3 p-1 rounded text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white transition-colors focus:outline-none focus:ring-1 focus:ring-[#14B8A6]"
          >
            {isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error && <p className="text-xs text-rose-500 mt-1 font-medium">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
