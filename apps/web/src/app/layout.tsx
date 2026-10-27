import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import React from 'react';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'https://eazzio.com';

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: 'Eazzio Mail — Private, Professional Email & Productivity',
    template: '%s | Eazzio Mail',
  },
  description:
    'High-performance webmail suite engineered for privacy, speed, and clean organization. Features custom domain support, sub-second search, zero tracking pixels, and real-time synchronization.',
  keywords: [
    'Eazzio Mail',
    'professional email',
    'private email',
    'secure email',
    'custom domain email',
    'privacy-focused email',
    'productivity webmail',
    'encrypted email platform',
  ],
  authors: [{ name: 'Eazzio Inc.' }],
  creator: 'Eazzio',
  publisher: 'Eazzio',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Eazzio Mail',
    title: 'Eazzio Mail — Private, Professional Email & Productivity',
    description:
      'High-performance webmail suite engineered for privacy, speed, and clean organization. Features custom domain support, sub-second search, zero tracking pixels, and real-time synchronization.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Eazzio Mail — Private, Professional Email & Productivity',
    description:
      'High-performance webmail suite engineered for privacy, speed, and clean organization.',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('eazzio_theme');
                  var themeMap = {
                    'emerald': '#030E0B',
                    'dark-oled': '#0A0C10',
                    'midnight': '#070D18',
                    'purple': '#0D0716',
                    'graphite': '#111113',
                    'sunset': '#120609',
                    'cyberpunk': '#0C0C08',
                    'ocean': '#040C12',
                    'eazzio-teal': '#F8FAFC'
                  };
                  if (saved && themeMap[saved]) {
                    document.documentElement.style.backgroundColor = themeMap[saved];
                    if (saved !== 'eazzio-teal') {
                      document.documentElement.classList.add('dark');
                    }
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} min-h-screen antialiased bg-transparent font-sans`}>
        {children}
      </body>
    </html>
  );
}
