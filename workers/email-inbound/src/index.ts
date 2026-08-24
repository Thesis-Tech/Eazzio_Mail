export interface Env {
  EAZZIO_API_URL: string;
  INBOUND_WEBHOOK_SECRET?: string;
}

export interface ForwardableEmailMessage {
  readonly from: string;
  readonly to: string;
  readonly headers: Headers;
  readonly raw: ReadableStream;
  readonly rawSize: number;
  setReject(reason: string): void;
  forward(rcptTo: string, headers?: Headers): Promise<void>;
  reply(message: any): Promise<void>;
}

export default {
  async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
    const from = message.from;
    const to = message.to;
    const rawSize = message.rawSize || 0;

    console.log(`[Cloudflare Email Worker] Inbound message received from: ${from} to: ${to} (Size: ${rawSize} bytes)`);

    // 1. Read full raw RFC 822 MIME stream
    const rawBytes = await new Response(message.raw).arrayBuffer();

    const apiUrl = (env.EAZZIO_API_URL || 'https://api.eazzio.com').replace(/\/+$/, '');
    const webhookSecret = env.INBOUND_WEBHOOK_SECRET || '';

    // 2. Forward to Eazzio Mail Inbound Webhook
    try {
      const response = await fetch(`${apiUrl}/v1/mail/inbound/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'message/rfc822',
          'X-Envelope-From': from,
          'X-Envelope-To': to,
          'X-Inbound-Secret': webhookSecret,
          'Authorization': `Bearer ${webhookSecret}`,
          'User-Agent': 'Cloudflare-Email-Worker/1.0',
        },
        body: rawBytes,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Cloudflare Email Worker] Backend returned error: HTTP ${response.status} - ${errorText}`);

        // If recipient is unknown or domain rejected (422 / 550), reject at edge
        if (response.status === 422 || response.status === 550) {
          message.setReject(`550 5.1.1 Recipient <${to}> not found on Eazzio Mail.`);
          return;
        }

        // Temporary backend failure: throw error so Cloudflare Email Routing retries delivery
        throw new Error(`Eazzio API transient error: HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log(`[Cloudflare Email Worker] Successfully ingested to Eazzio:`, JSON.stringify(result));
    } catch (err: any) {
      console.error(`[Cloudflare Email Worker] Forwarding exception:`, err?.message || err);
      throw err; // Trigger Cloudflare Email Routing retry
    }
  },

  // HTTP handler for health checks and status pings
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/health' || url.pathname === '/') {
      return new Response(
        JSON.stringify({
          service: 'eazzio-email-inbound-worker',
          status: 'healthy',
          targetApi: env.EAZZIO_API_URL || 'https://api.eazzio.com',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
    return new Response('Not Found', { status: 404 });
  },
};
