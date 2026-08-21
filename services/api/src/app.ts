import express, { Express } from 'express';
import { mailboxRouter } from './api/v1/mailboxes.js';
import { messagesRouter } from './api/v1/messages.js';
import { searchRouter } from './api/v1/search.js';
import { errorHandler } from './middleware/error-handler.js';

export const app: Express = express();

app.use(express.json());

// API v1 routes
app.use('/v1/mailboxes', mailboxRouter);
app.use('/v1/messages', messagesRouter);
app.use('/v1/search', searchRouter);

// Standard error handling envelope
app.use(errorHandler);
