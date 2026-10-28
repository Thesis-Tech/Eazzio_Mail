import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
