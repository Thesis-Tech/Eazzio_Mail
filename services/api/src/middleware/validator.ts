import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { AppError } from './error-handler.js';

export interface ValidationTargetSchemas {
  body?: ZodSchema<any>;
  query?: ZodSchema<any>;
  params?: ZodSchema<any>;
}

export function validateRequest(schemas: ValidationTargetSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((issue) => ({
          path: issue.path.join('.'),
          field: issue.path[issue.path.length - 1]?.toString() || 'unknown',
          issue: issue.message,
        }));
        return next(
          new AppError(
            'VALIDATION_ERROR',
            details[0]?.issue || 'Invalid request structure or payload',
            422,
            details
          )
        );
      }
      next(err);
    }
  };
}

// Common reusable schema primitives
export const CommonSchemas = {
  uuid: z.string().uuid({ message: 'Must be a valid UUID' }),
  email: z.string().email({ message: 'Must be a valid email address' }).max(254),
  identifier: z.string().min(1, 'Identifier is required').max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(1024),
  folderKind: z.enum(['inbox', 'starred', 'snoozed', 'sent', 'drafts', 'archive', 'spam', 'trash', 'custom']),
  paginationQuery: z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(50),
    page: z.coerce.number().min(1).optional().default(1),
    offset: z.coerce.number().min(0).optional(),
    folder: z.string().optional(),
    q: z.string().optional(),
  }),
};

// Mail Mutation Schemas
export const MailSchemas = {
  sendMessage: z.object({
    to: z.array(z.string().min(1)).min(1, 'At least one recipient is required'),
    cc: z.array(z.string()).optional().default([]),
    bcc: z.array(z.string()).optional().default([]),
    subject: z.string().max(998, 'Subject line too long').optional().default(''),
    bodyText: z.string().optional().default(''),
    bodyHtml: z.string().optional().default(''),
    inReplyTo: z.string().optional(),
    references: z.string().optional(),
    threadId: z.string().optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string().min(1),
          mimeType: z.string().min(1),
          content: z.string().optional(),
          sizeBytes: z.number().optional(),
        })
      )
      .optional()
      .default([]),
  }),

  saveDraft: z.object({
    id: z.string().optional(),
    to: z.array(z.string()).optional().default([]),
    cc: z.array(z.string()).optional().default([]),
    bcc: z.array(z.string()).optional().default([]),
    subject: z.string().max(998).optional().default(''),
    bodyText: z.string().optional().default(''),
    bodyHtml: z.string().optional().default(''),
    threadId: z.string().optional(),
    inReplyTo: z.string().optional(),
    references: z.string().optional(),
  }),

  batchAction: z.object({
    action: z.enum([
      'star',
      'unstar',
      'trash',
      'archive',
      'unarchive',
      'inbox',
      'move-to-inbox',
      'read',
      'unread',
      'delete',
      'spam',
      'not-spam',
      'snooze',
      'unsnooze',
    ]),
    threadIds: z.array(z.string()).min(1, 'At least one message/thread ID is required'),
    folderId: z.string().optional(),
    snoozeUntil: z.string().optional(),
  }),

  snooze: z.object({
    snoozeUntil: z.string().min(1, 'Snooze timestamp is required'),
  }),

  createLabel: z.object({
    name: z.string().min(1, 'Label name is required').max(100),
    color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Valid HEX color required').optional().default('#3B82F6'),
  }),

  updatePreferences: z.object({
    density: z.enum(['default', 'comfortable', 'compact']).optional(),
    theme: z.string().max(50).optional(),
    language: z.string().max(20).optional(),
    pageSize: z.number().min(10).max(100).optional(),
    undoSendTime: z.number().min(0).max(30).optional(),
    defaultReplyBehavior: z.enum(['reply', 'reply-all']).optional(),
    hoverActions: z.boolean().optional(),
    sendAndArchive: z.boolean().optional(),
    inboxType: z.enum(['default', 'important', 'unread', 'starred', 'priority']).optional(),
    readingPane: z.enum(['none', 'right', 'below']).optional(),
    conversationView: z.boolean().optional(),
    desktopNotifications: z.enum(['all', 'important', 'none']).optional(),
    starPreset: z.string().optional(),
    signature: z.object({
      text: z.string().max(2000).optional(),
      enabled: z.boolean().optional(),
      forNew: z.string().optional(),
      forReply: z.string().optional(),
    }).optional(),
    autoReply: z.object({
      enabled: z.boolean().optional(),
      subject: z.string().max(200).optional(),
      body: z.string().max(5000).optional(),
      startDate: z.string().nullable().optional(),
      endDate: z.string().nullable().optional(),
      contactsOnly: z.boolean().optional(),
    }).optional(),
  }).passthrough(),
};
