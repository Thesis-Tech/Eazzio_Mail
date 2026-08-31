'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function InboxPage() {
  return <MailDashboard initialFolder="fld-inbox" />;
}
