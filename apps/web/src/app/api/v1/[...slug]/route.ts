import { NextRequest, NextResponse } from 'next/server';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://127.0.0.1:8080';

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = slug.join('/');
  const search = req.nextUrl.search;
  const targetUrl = `${API_BACKEND_URL}/v1/${path}${search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
      headers.set(key, value);
    }
  });

  let body: BodyInit | undefined = undefined;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    try {
      body = await req.text();
    } catch {
      body = undefined;
    }
  }

  try {
    const res = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
    });

    const resData = await res.text();
    let parsedData;
    try {
      parsedData = JSON.parse(resData);
      return NextResponse.json(parsedData, { status: res.status });
    } catch {
      return new NextResponse(resData, {
        status: res.status,
        headers: { 'Content-Type': res.headers.get('content-type') || 'text/plain' },
      });
    }
  } catch (error: any) {
    console.error(`[Next.js API Proxy Error] Failed forwarding to ${targetUrl}:`, error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'GATEWAY_ERROR',
          message: 'Failed to connect to backend authentication server on port 8080.',
        },
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return handleProxy(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return handleProxy(req, context);
}

export async function PUT(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return handleProxy(req, context);
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return handleProxy(req, context);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ slug: string[] }> }) {
  return handleProxy(req, context);
}
