'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function ScheduledPage() {
  return <MailDashboard initialFolder="fld-scheduled" />;
}
