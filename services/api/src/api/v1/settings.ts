import { Router, Response, NextFunction } from 'express';
import { AuthenticatedRequest, requireAuth } from '../../middleware/auth.js';
import { AppError } from '../../middleware/error-handler.js';
import { defaultDb } from '../../config/index.js';
import crypto from 'crypto';

export const settingsRouter: Router = Router();

settingsRouter.use(requireAuth);

// Helper to resolve user's mailbox
async function resolveMailbox(userId: string, email?: string): Promise<{ id: string; address: string }> {
  const rows = (await defaultDb.query(
    `SELECT m.id, m.address 
     FROM mailboxes m 
     WHERE m.owner_user_id = $1 
        OR ($2::text IS NOT NULL AND LOWER(m.address) = LOWER($2))
     ORDER BY m.created_at ASC 
     LIMIT 1`,
    [userId, email || null]
  )) as any[];

  if (rows.length === 0) {
    throw new AppError('NOT_FOUND', 'Mailbox not found for user', 404);
  }
  return rows[0];
}

// Ensure user_preferences table exists gracefully
let isPrefsTableEnsured = false;
async function ensurePrefsTable() {
  if (isPrefsTableEnsured) return;
  await defaultDb.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id               UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      density               TEXT NOT NULL DEFAULT 'default',
      theme                 TEXT NOT NULL DEFAULT 'dark-oled',
      inbox_type            TEXT NOT NULL DEFAULT 'default',
      reading_pane          TEXT NOT NULL DEFAULT 'right',
      conversation_view     BOOLEAN NOT NULL DEFAULT true,
      signature_text        TEXT NOT NULL DEFAULT '',
      signature_enabled     BOOLEAN NOT NULL DEFAULT false,
      auto_reply_enabled    BOOLEAN NOT NULL DEFAULT false,
      auto_reply_subject    TEXT NOT NULL DEFAULT '',
      auto_reply_body       TEXT NOT NULL DEFAULT '',
      auto_reply_start_date TIMESTAMPTZ,
      auto_reply_end_date   TIMESTAMPTZ,
      notifications_enabled BOOLEAN NOT NULL DEFAULT true,
      sound_enabled         BOOLEAN NOT NULL DEFAULT true,
      spam_threshold        NUMERIC(3,2) NOT NULL DEFAULT 0.85,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  isPrefsTableEnsured = true;
}

// ==========================================
// 1. USER PREFERENCES ENDPOINTS
// ==========================================

// GET /v1/settings/preferences
settingsRouter.get('/preferences', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await ensurePrefsTable();
    const userId = req.user!.userId;

    const rows = (await defaultDb.query(
      `SELECT * FROM user_preferences WHERE user_id = $1`,
      [userId]
    )) as any[];

    if (rows.length === 0) {
      // Default preferences
      const defaultPrefs = {
        density: 'default',
        theme: 'dark-oled',
        inboxType: 'default',
        readingPane: 'right',
        conversationView: true,
        signature: {
          text: '',
          enabled: false,
        },
        autoReply: {
          enabled: false,
          subject: '',
          body: '',
          startDate: null,
          endDate: null,
        },
        notifications: {
          enabled: true,
          sound: true,
        },
        spamThreshold: 0.85,
      };

      res.json({ success: true, data: defaultPrefs });
      return;
    }

    const row = rows[0];
    res.json({
      success: true,
      data: {
        density: row.density || 'default',
        theme: row.theme || 'dark-oled',
        inboxType: row.inbox_type || 'default',
        readingPane: row.reading_pane || 'right',
        conversationView: row.conversation_view ?? true,
        signature: {
          text: row.signature_text || '',
          enabled: Boolean(row.signature_enabled),
        },
        autoReply: {
          enabled: Boolean(row.auto_reply_enabled),
          subject: row.auto_reply_subject || '',
          body: row.auto_reply_body || '',
          startDate: row.auto_reply_start_date,
          endDate: row.auto_reply_end_date,
        },
        notifications: {
          enabled: Boolean(row.notifications_enabled),
          sound: Boolean(row.sound_enabled),
        },
        spamThreshold: Number(row.spam_threshold || 0.85),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT & PATCH /v1/settings/preferences - Save user preferences
settingsRouter.put('/preferences', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await ensurePrefsTable();
    const userId = req.user!.userId;
    const {
      density = 'default',
      theme = 'dark-oled',
      inboxType = 'default',
      readingPane = 'right',
      conversationView = true,
      signature = {},
      autoReply = {},
      notifications = {},
      spamThreshold = 0.85,
    } = req.body;

    const signatureText = signature.text || '';
    const signatureEnabled = Boolean(signature.enabled);
    const autoReplyEnabled = Boolean(autoReply.enabled);
    const autoReplySubject = autoReply.subject || '';
    const autoReplyBody = autoReply.body || '';
    const autoReplyStartDate = autoReply.startDate ? new Date(autoReply.startDate) : null;
    const autoReplyEndDate = autoReply.endDate ? new Date(autoReply.endDate) : null;
    const notificationsEnabled = notifications.enabled !== undefined ? Boolean(notifications.enabled) : true;
    const soundEnabled = notifications.sound !== undefined ? Boolean(notifications.sound) : true;

    await defaultDb.query(
      `INSERT INTO user_preferences (
        user_id, density, theme, inbox_type, reading_pane, conversation_view,
        signature_text, signature_enabled, auto_reply_enabled, auto_reply_subject,
        auto_reply_body, auto_reply_start_date, auto_reply_end_date,
        notifications_enabled, sound_enabled, spam_threshold, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, now())
      ON CONFLICT (user_id) DO UPDATE SET
        density = EXCLUDED.density,
        theme = EXCLUDED.theme,
        inbox_type = EXCLUDED.inbox_type,
        reading_pane = EXCLUDED.reading_pane,
        conversation_view = EXCLUDED.conversation_view,
        signature_text = EXCLUDED.signature_text,
        signature_enabled = EXCLUDED.signature_enabled,
        auto_reply_enabled = EXCLUDED.auto_reply_enabled,
        auto_reply_subject = EXCLUDED.auto_reply_subject,
        auto_reply_body = EXCLUDED.auto_reply_body,
        auto_reply_start_date = EXCLUDED.auto_reply_start_date,
        auto_reply_end_date = EXCLUDED.auto_reply_end_date,
        notifications_enabled = EXCLUDED.notifications_enabled,
        sound_enabled = EXCLUDED.sound_enabled,
        spam_threshold = EXCLUDED.spam_threshold,
        updated_at = now()`,
      [
        userId,
        density,
        theme,
        inboxType,
        readingPane,
        Boolean(conversationView),
        signatureText,
        signatureEnabled,
        autoReplyEnabled,
        autoReplySubject,
        autoReplyBody,
        autoReplyStartDate,
        autoReplyEndDate,
        notificationsEnabled,
        soundEnabled,
        spamThreshold,
      ]
    );

    res.json({
      success: true,
      message: 'Preferences saved successfully',
      data: req.body,
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. LABELS ENDPOINTS
// ==========================================

// GET /v1/settings/labels
settingsRouter.get('/labels', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);

    const rows = (await defaultDb.query(
      `SELECT id, name, color FROM labels WHERE mailbox_id = $1 ORDER BY name ASC`,
      [mailbox.id]
    )) as any[];

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color || '#3B82F6',
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/settings/labels
settingsRouter.post('/labels', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const { name, color = '#2D5BFF' } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Label name is required', 400);
    }

    const id = `lbl-${crypto.randomUUID()}`;
    const rows = (await defaultDb.query(
      `INSERT INTO labels (id, mailbox_id, name, color)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (mailbox_id, name) DO UPDATE SET color = EXCLUDED.color
       RETURNING id, name, color`,
      [id, mailbox.id, name.trim(), color]
    )) as any[];

    res.status(201).json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/settings/labels/:id
settingsRouter.patch('/labels/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const labelId = req.params.id;
    const { name, color } = req.body;

    const rows = (await defaultDb.query(
      `UPDATE labels 
       SET name = COALESCE($1, name), 
           color = COALESCE($2, color)
       WHERE id = $3 AND mailbox_id = $4
       RETURNING id, name, color`,
      [name?.trim() || null, color || null, labelId, mailbox.id]
    )) as any[];

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Label not found', 404);
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/settings/labels/:id
settingsRouter.delete('/labels/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const labelId = req.params.id;

    await defaultDb.query(
      `DELETE FROM labels WHERE id = $1 AND mailbox_id = $2`,
      [labelId, mailbox.id]
    );

    res.json({ success: true, message: 'Label deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. FOLDERS ENDPOINTS
// ==========================================

// GET /v1/settings/folders
settingsRouter.get('/folders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);

    const rows = (await defaultDb.query(
      `SELECT f.id, f.name, f.kind, f.parent_folder_id,
              COUNT(m.id) as total_count,
              COUNT(m.id) FILTER (WHERE m.is_read = false) as unread_count
       FROM folders f
       LEFT JOIN messages m ON m.folder_id = f.id
       WHERE f.mailbox_id = $1
       GROUP BY f.id, f.name, f.kind, f.parent_folder_id
       ORDER BY f.name ASC`,
      [mailbox.id]
    )) as any[];

    res.json({
      success: true,
      data: rows.map((r: any) => ({
        id: r.id,
        name: r.name,
        slug: r.name.toLowerCase().replace(/\s+/g, '-'),
        type: r.kind || 'custom',
        parentFolderId: r.parent_folder_id,
        totalCount: parseInt(r.total_count || '0', 10),
        unreadCount: parseInt(r.unread_count || '0', 10),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/settings/folders
settingsRouter.post('/folders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const { name, parentFolderId = null } = req.body;

    if (!name || !name.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Folder name is required', 400);
    }

    const id = `fld-${crypto.randomUUID()}`;
    const rows = (await defaultDb.query(
      `INSERT INTO folders (id, mailbox_id, name, kind, parent_folder_id)
       VALUES ($1, $2, $3, 'custom', $4)
       ON CONFLICT (mailbox_id, parent_folder_id, name) DO UPDATE SET name = EXCLUDED.name
       RETURNING id, name, kind, parent_folder_id`,
      [id, mailbox.id, name.trim(), parentFolderId]
    )) as any[];

    res.status(201).json({
      success: true,
      data: {
        id: rows[0].id,
        name: rows[0].name,
        slug: rows[0].name.toLowerCase().replace(/\s+/g, '-'),
        type: 'custom',
        parentFolderId: rows[0].parent_folder_id,
        totalCount: 0,
        unreadCount: 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/settings/folders/:id
settingsRouter.patch('/folders/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const folderId = req.params.id;
    const { name } = req.body;

    const rows = (await defaultDb.query(
      `UPDATE folders 
       SET name = $1
       WHERE id = $2 AND mailbox_id = $3
       RETURNING id, name, kind, parent_folder_id`,
      [name?.trim(), folderId, mailbox.id]
    )) as any[];

    if (rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Folder not found', 404);
    }

    res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/settings/folders/:id
settingsRouter.delete('/folders/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const folderId = req.params.id;

    // Move any messages in this folder to Inbox before deleting
    const inboxRes = (await defaultDb.query(
      `SELECT id FROM folders WHERE mailbox_id = $1 AND LOWER(name) = 'inbox' LIMIT 1`,
      [mailbox.id]
    )) as any[];

    if (inboxRes.length > 0) {
      await defaultDb.query(
        `UPDATE messages SET folder_id = $1 WHERE folder_id = $2`,
        [inboxRes[0].id, folderId]
      );
    }

    await defaultDb.query(
      `DELETE FROM folders WHERE id = $1 AND mailbox_id = $2 AND kind = 'custom'`,
      [folderId, mailbox.id]
    );

    res.json({ success: true, message: 'Folder deleted successfully' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. FILTER RULES ENDPOINTS
// ==========================================

// GET /v1/settings/filters
settingsRouter.get('/filters', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);

    const rows = (await defaultDb.query(
      `SELECT id, conditions, actions, is_enabled, priority 
       FROM filters 
       WHERE mailbox_id = $1 
       ORDER BY priority ASC, id ASC`,
      [mailbox.id]
    )) as any[];

    res.json({
      success: true,
      data: rows.map((r: any) => {
        const cond = Array.isArray(r.conditions) ? r.conditions[0] : (r.conditions || {});
        const act = Array.isArray(r.actions) ? r.actions[0] : (r.actions || {});
        return {
          id: r.id,
          name: cond.name || `Rule: ${cond.field || 'subject'} ${cond.operator || 'contains'} ${cond.value || ''}`,
          field: cond.field || 'from',
          operator: cond.operator || 'contains',
          value: cond.value || '',
          action: act.type || 'apply_label',
          actionValue: act.value || '',
          isEnabled: Boolean(r.is_enabled),
        };
      }),
    });
  } catch (err) {
    next(err);
  }
});

// POST /v1/settings/filters
settingsRouter.post('/filters', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const { name, field = 'from', operator = 'contains', value = '', action = 'apply_label', actionValue = '', isEnabled = true } = req.body;

    const id = `flt-${crypto.randomUUID()}`;
    const conditions = [{ name, field, operator, value }];
    const actions = [{ type: action, value: actionValue }];

    const rows = (await defaultDb.query(
      `INSERT INTO filters (id, mailbox_id, conditions, actions, is_enabled, priority)
       VALUES ($1, $2, $3, $4, $5, 0)
       RETURNING id, conditions, actions, is_enabled, priority`,
      [id, mailbox.id, JSON.stringify(conditions), JSON.stringify(actions), Boolean(isEnabled)]
    )) as any[];

    res.status(201).json({
      success: true,
      data: {
        id: rows[0].id,
        name: name || `Rule: ${field} ${operator} ${value}`,
        field,
        operator,
        value,
        action,
        actionValue,
        isEnabled: Boolean(rows[0].is_enabled),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /v1/settings/filters/:id
settingsRouter.patch('/filters/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const filterId = req.params.id;
    const { isEnabled, name, field, operator, value, action, actionValue } = req.body;

    const existing = (await defaultDb.query(
      `SELECT * FROM filters WHERE id = $1 AND mailbox_id = $2`,
      [filterId, mailbox.id]
    )) as any[];

    if (existing.length === 0) {
      throw new AppError('NOT_FOUND', 'Filter rule not found', 404);
    }

    const currCond = Array.isArray(existing[0].conditions) ? existing[0].conditions[0] : {};
    const currAct = Array.isArray(existing[0].actions) ? existing[0].actions[0] : {};

    const updatedCond = [{
      name: name !== undefined ? name : currCond.name,
      field: field !== undefined ? field : currCond.field,
      operator: operator !== undefined ? operator : currCond.operator,
      value: value !== undefined ? value : currCond.value,
    }];

    const updatedAct = [{
      type: action !== undefined ? action : currAct.type,
      value: actionValue !== undefined ? actionValue : currAct.value,
    }];

    const updatedEnabled = isEnabled !== undefined ? Boolean(isEnabled) : existing[0].is_enabled;

    await defaultDb.query(
      `UPDATE filters 
       SET conditions = $1, actions = $2, is_enabled = $3
       WHERE id = $4 AND mailbox_id = $5`,
      [JSON.stringify(updatedCond), JSON.stringify(updatedAct), updatedEnabled, filterId, mailbox.id]
    );

    res.json({
      success: true,
      data: {
        id: filterId,
        name: updatedCond[0]?.name || '',
        field: updatedCond[0]?.field || 'from',
        operator: updatedCond[0]?.operator || 'contains',
        value: updatedCond[0]?.value || '',
        action: updatedAct[0]?.type || 'apply_label',
        actionValue: updatedAct[0]?.value || '',
        isEnabled: updatedEnabled,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /v1/settings/filters/:id
settingsRouter.delete('/filters/:id', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const mailbox = await resolveMailbox(userId, req.user!.email);
    const filterId = req.params.id;

    await defaultDb.query(
      `DELETE FROM filters WHERE id = $1 AND mailbox_id = $2`,
      [filterId, mailbox.id]
    );

    res.json({ success: true, message: 'Filter rule deleted successfully' });
  } catch (err) {
    next(err);
  }
});
