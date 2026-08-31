'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function AllMailPage() {
  return <MailDashboard initialFolder="fld-archive" />;
}
