'use client';

import React from 'react';
import { MailDashboard } from '../../components/mail/MailDashboard';

export default function MailPage() {
  return <MailDashboard initialFolder="fld-inbox" />;
}
