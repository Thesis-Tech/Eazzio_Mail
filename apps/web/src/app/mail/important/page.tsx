'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function ImportantPage() {
  return <MailDashboard initialFolder="fld-starred" />;
}
