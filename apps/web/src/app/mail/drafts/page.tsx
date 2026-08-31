'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function DraftsPage() {
  return <MailDashboard initialFolder="fld-drafts" />;
}
