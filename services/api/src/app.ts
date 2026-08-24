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
import { errorHandler } from './middleware/error-handler.js';

export const app: Express = express();

app.use(express.json({ limit: '25mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// API v1 routes
app.use('/v1/auth', authRouter);
app.use('/v1/mailboxes', mailboxRouter);
app.use('/v1/mail/inbound', mailSyncRouter);
app.use('/v1/messages/cloudflare-inbound', cloudflareInboundRouter);
app.use('/v1/messages', messagesRouter);
app.use('/v1/search', searchRouter);
app.use('/v1/filters', filtersRouter);
app.use('/v1/webhooks', webhooksRouter);
app.use('/v1/stats', statsRouter);

// Support /api/v1 prefixes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/mailboxes', mailboxRouter);
app.use('/api/v1/mail/inbound', mailSyncRouter);
app.use('/api/v1/messages/cloudflare-inbound', cloudflareInboundRouter);
app.use('/api/v1/messages', messagesRouter);
app.use('/api/v1/search', searchRouter);
app.use('/api/v1/filters', filtersRouter);
app.use('/api/v1/webhooks', webhooksRouter);
app.use('/api/v1/stats', statsRouter);

// Standard error handling envelope
app.use(errorHandler);
