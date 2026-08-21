'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Globe,
  Users,
  Shield,
  FileText,
  Building2,
  ChevronRight,
  ShieldCheck,
  Server,
} from 'lucide-react';
import { AdminRole } from '../../types/admin';

interface AdminSidebarProps {
  role: AdminRole;
  orgName?: string;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ role, orgName = 'Eazzio Enterprise' }) => {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Overview', icon: LayoutDashboard, testId: 'nav-overview' },
    { href: '/domains', label: 'Custom Domains', icon: Globe, testId: 'nav-domains' },
    { href: '/mailboxes', label: 'Mailboxes & Quota', icon: Users, testId: 'nav-mailboxes' },
    { href: '/security', label: 'Security Policies', icon: Shield, testId: 'nav-security' },
    { href: '/audit-logs', label: 'Immutable Audit Logs', icon: FileText, testId: 'nav-audit' },
  ];

  return (
    <aside
      className="w-64 h-full flex flex-col bg-[#16181D] border-r border-[#2A2E37] text-[#E1E4EA]"
      data-testid="admin-sidebar"
    >
      {/* Brand Header */}
      <div className="p-4 border-b border-[#2A2E37] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-[#2D5BFF] flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
            E
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-white tracking-tight">Eazzio</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#FFA43D]/20 text-[#FFA43D]">ADMIN</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate max-w-[130px]">{orgName}</p>
          </div>
        </div>
      </div>

      {/* Role Indicator Banner */}
      <div className="p-3 mx-3 my-2 rounded-xl bg-[#1C1F26] border border-[#2A2E37] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#2D5BFF]" />
          <div>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Access Tier</p>
            <p className="text-xs font-bold text-white">{role}</p>
          </div>
        </div>
        {role === 'PlatformAdmin' ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-[#2D5BFF]/20 text-[#2D5BFF]">SUPER</span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-400">ORG</span>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1 custom-scrollbar">
        <div className="px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Management
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={item.testId}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#2D5BFF]/15 text-[#2D5BFF] font-bold shadow-sm'
                  : 'text-slate-300 hover:bg-[#1C1F26] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#2D5BFF]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#2D5BFF]" />}
            </Link>
          );
        })}
      </nav>

      {/* Cluster / Service Status Footer */}
      <div className="p-3 border-t border-[#2A2E37] space-y-2 text-xs">
        <div className="p-2.5 rounded-xl bg-[#121418] border border-[#2A2E37] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-slate-300 text-[11px] font-medium">Cluster Nodes</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Healthy
          </span>
        </div>
      </div>
    </aside>
  );
};
