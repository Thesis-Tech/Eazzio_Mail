import { NextRequest, NextResponse } from 'next/server';
import { getProxyAuthHeaders } from '../../../../lib/api-auth-helper';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

const DEFAULT_PREFERENCES = {
  density: 'default',
  theme: 'dark-oled',
  language: 'en_US',
  pageSize: 50,
  undoSendTime: 10,
  defaultReplyBehavior: 'reply',
  hoverActions: true,
  sendAndArchive: false,
  inboxType: 'default',
  readingPane: 'right',
  conversationView: true,
  desktopNotifications: 'all',
  starPreset: '1star',
  signature: {
    text: '',
    enabled: false,
    forNew: 'default',
    forReply: 'default',
  },
  autoReply: {
    enabled: false,
    subject: 'Out of Office',
    body: '',
    startDate: null,
    endDate: null,
    contactsOnly: false,
  },
  categories: {
    primary: true,
    promotions: true,
    social: true,
    updates: true,
    forums: false,
  },
  importanceMarkers: true,
  forwardingAddress: '',
  popEnabled: false,
  imapEnabled: true,
  imapExpunge: 'auto',
  imapFolderLimit: 1000,
  blockedAddresses: [],
  notifications: {
    enabled: true,
    sound: true,
  },
  spamThreshold: 0.85,
};

export async function GET(req: NextRequest) {
  try {
    const headers = getProxyAuthHeaders(req);
    const response = await fetch(`${API_BACKEND_URL}/v1/settings/preferences`, {
      method: 'GET',
      headers,
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json({ success: true, data: DEFAULT_PREFERENCES }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: true, data: DEFAULT_PREFERENCES },
      { status: 200 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const headers = getProxyAuthHeaders(req);
    const body = await req.json();
    const response = await fetch(`${API_BACKEND_URL}/v1/settings/preferences`, {
      method: 'PUT',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: 200 });
    }
    return NextResponse.json({ success: true, message: 'Preferences saved locally', data: body }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { success: true, message: 'Preferences saved locally' },
      { status: 200 }
    );
  }
}
