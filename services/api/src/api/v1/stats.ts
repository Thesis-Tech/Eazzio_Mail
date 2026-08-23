import { Router, Response, NextFunction } from 'express';
import { defaultDb } from '../../config/index.js';

export const statsRouter: Router = Router();

// GET /v1/stats or /api/v1/stats - Realtime system health and mail flow metrics (FR-OBS-02)
statsRouter.get('/', async (_req, res: Response, next: NextFunction) => {
  try {
    const uptimeSeconds = Math.floor(process.uptime());

    // 1. Mail flow volume breakdown
    const flowRows = (await defaultDb.query(`
      SELECT 
        direction, 
        count(*)::int as count,
        coalesce(sum(size_bytes), 0)::bigint as total_bytes
      FROM messages 
      GROUP BY direction
    `)) as any[];

    // 2. Delivery states
    const stateRows = (await defaultDb.query(`
      SELECT 
        coalesce(delivery_state, 'delivered') as state,
        count(*)::int as count
      FROM messages
      GROUP BY coalesce(delivery_state, 'delivered')
    `)) as any[];

    // 3. Mailbox and user counts
    const countRows = (await defaultDb.query(`
      SELECT 
        (SELECT count(*)::int FROM users) as total_users,
        (SELECT count(*)::int FROM mailboxes) as total_mailboxes,
        (SELECT count(*)::int FROM domains WHERE verification_status = 'verified') as active_domains,
        (SELECT count(*)::int FROM outbound_queue WHERE state = 'queued' OR state = 'pending') as pending_outbound_queue
    `)) as any[];

    const flowMap: Record<string, { count: number; totalBytes: string }> = {};
    for (const r of flowRows) {
      flowMap[r.direction] = { count: r.count, totalBytes: r.total_bytes.toString() };
    }

    const stateMap: Record<string, number> = {};
    for (const r of stateRows) {
      stateMap[r.state] = r.count;
    }

    const counts = countRows[0] || {};

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptimeSeconds,
        mailFlow: {
          inbound: flowMap['inbound'] || { count: 0, totalBytes: '0' },
          outbound: flowMap['outbound'] || { count: 0, totalBytes: '0' },
        },
        deliveryStates: stateMap,
        infrastructure: {
          totalUsers: counts.total_users || 0,
          totalMailboxes: counts.total_mailboxes || 0,
          activeDomains: counts.active_domains || 0,
          pendingOutboundQueue: counts.pending_outbound_queue || 0,
        },
      },
    });
  } catch (err) {
    next(err);
  }
});
