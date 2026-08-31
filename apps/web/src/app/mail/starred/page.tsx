'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function StarredPage() {
  return <MailDashboard initialFolder="fld-starred" />;
}
