'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function SnoozedPage() {
  return <MailDashboard initialFolder="fld-snoozed" />;
}
