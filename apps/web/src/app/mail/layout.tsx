import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Inbox',
  robots: {
    index: false,
    follow: false,
  },
};

export default function MailLayout({ children }: { children: React.ReactNode }) {
  return <div className="dark bg-[#0F1115] text-[#EDEEF0] min-h-screen">{children}</div>;
}
