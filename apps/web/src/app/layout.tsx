import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Eazzio Mail',
  description: 'Fast, secure, and privacy-first email platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0F1115] text-[#EDEEF0] antialiased">
        {children}
      </body>
    </html>
  );
}
