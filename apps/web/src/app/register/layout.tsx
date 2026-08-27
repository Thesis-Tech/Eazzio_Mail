import type { Metadata } from 'next';
import React from 'react';
import { FacebookSdk } from '../../components/auth/FacebookSdk';

export const metadata: Metadata = {
  title: 'Create an Account',
  robots: {
    index: false,
    follow: false,
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FacebookSdk />
      {children}
    </>
  );
}
