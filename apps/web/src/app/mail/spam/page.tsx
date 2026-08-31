'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function SpamPage() {
  return <MailDashboard initialFolder="fld-spam" />;
}
