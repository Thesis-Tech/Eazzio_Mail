import express, { Express } from 'express';
import { mailboxRouter } from './api/v1/mailboxes.js';
import { errorHandler } from './middleware/error-handler.js';

export const app: Express = express();

app.use(express.json());

// API v1 routes
app.use('/v1/mailboxes', mailboxRouter);

// Standard error handling envelope
app.use(errorHandler);
