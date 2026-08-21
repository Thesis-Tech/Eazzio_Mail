import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eazzio Mail — Enterprise Admin Portal',
  description: 'Multi-tenant organization, domain verification, and mailbox administration portal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0F1115] text-[#EDEEF0] antialiased">{children}</body>
    </html>
  );
}
