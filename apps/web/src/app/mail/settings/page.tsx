'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function SettingsPage() {
  return <MailDashboard initialFolder="fld-inbox" initialSettingsOpen={true} initialSettingsTab="general" />;
}
