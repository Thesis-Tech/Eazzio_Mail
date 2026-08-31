'use client';

import React from 'react';
import { MailDashboard } from '../../../components/mail/MailDashboard';

export default function TrashPage() {
  return <MailDashboard initialFolder="fld-trash" />;
}
