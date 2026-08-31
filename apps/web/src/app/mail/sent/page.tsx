'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function SentPage() {
  return <MailDashboard initialFolder="fld-sent" />;
}
