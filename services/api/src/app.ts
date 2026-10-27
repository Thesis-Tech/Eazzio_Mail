import express, { Express } from 'express';
import { mailboxRouter } from './api/v1/mailboxes.js';
import { messagesRouter } from './api/v1/messages.js';
import { searchRouter } from './api/v1/search.js';
import { filtersRouter } from './api/v1/filters.js';
import { webhooksRouter } from './api/v1/webhooks.js';
import { statsRouter } from './api/v1/stats.js';
import { authRouter } from './api/v1/auth.js';
import { cloudflareInboundRouter } from './api/v1/cloudflare-inbound.js';
import { mailSyncRouter } from './api/v1/mail-sync.js';
import { domainsRouter } from './api/v1/domains.js';
import { settingsRouter } from './api/v1/settings.js';
import { contactsRouter } from './api/v1/contacts.js';
import { errorHandler } from './middleware/error-handler.js';
import { rateLimit, RateLimitPolicies } from './middleware/rate-limiter.js';

export const app: Express = express();

app.use(express.raw({ type: ['message/rfc822', 'application/octet-stream'], limit: '35mb' }));
app.use(express.text({ type: ['text/plain', 'text/html'], limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));

// Health check (always available for load balancers & monitoring)
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Protect all API endpoints against flood/DDoS & high concurrency exhaustion
app.use(rateLimit(RateLimitPolicies.DDOS_PROTECTION));
app.use(rateLimit(RateLimitPolicies.GLOBAL_API));

// API v1 routes
app.use('/v1/auth', authRouter);
app.use('/v1/domains', domainsRouter);
app.use('/v1/settings', settingsRouter);
app.use('/v1/mailboxes', mailboxRouter);
app.use('/v1/mail/inbound', mailSyncRouter);
app.use('/v1/messages/cloudflare-inbound', cloudflareInboundRouter);
app.use('/v1/messages', messagesRouter);
app.use('/v1/search', searchRouter);
app.use('/v1/filters', filtersRouter);
app.use('/v1/webhooks', webhooksRouter);
app.use('/v1/stats', statsRouter);
app.use('/v1/contacts', contactsRouter);

// Support /api/v1 prefixes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/domains', domainsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/mailboxes', mailboxRouter);
app.use('/api/v1/mail/inbound', mailSyncRouter);
app.use('/api/v1/messages/cloudflare-inbound', cloudflareInboundRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/filters', filtersRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/stats', statsRouter);
app.use('/api/v1/contacts', contactsRouter);

// Standard error handling envelope
app.use(errorHandler);

