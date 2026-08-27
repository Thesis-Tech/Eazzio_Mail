import type { Metadata } from 'next';
import React from 'react';
import { FacebookSdk } from '../../components/auth/FacebookSdk';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FacebookSdk />
      {children}
    </>
  );
}
