'use client';

import { MailDashboardPage } from '@/components/mail/MailDashboard';

export default function MailSettingsPage() {
  return (
    <MailDashboardPage 
      initialFolder="fld-inbox" 
      initialSettingsOpen={true} 
      initialSettingsTab="general" 
    />
  );
}
