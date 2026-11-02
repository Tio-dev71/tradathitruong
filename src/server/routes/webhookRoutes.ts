import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { WebhookSignalInputSchema } from '../validators/schemas';
import type { SignalData } from '../../types/signal';

export const webhookRouter = Router();

const DEFAULT_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'tra-da-thi-truong-secret-key-2026';

export function verifyHmacSignature(rawBody: string, signature: string, secret: string = DEFAULT_WEBHOOK_SECRET): boolean {
  if (!signature) return false;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(rawBody);
  const expectedSignature = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

// Ingest signals from external sources
webhookRouter.post('/signals', (req: Request, res: Response) => {
  const signature = (req.headers['x-signature-sha256'] || req.headers['x-webhook-signature']) as string;
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

  const secret = process.env.WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;

  if (!signature || !verifyHmacSignature(rawBody, signature, secret)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing HMAC signature in x-signature-sha256 header',
    });
  }

  // Schema validation
  const parseResult = WebhookSignalInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      success: false,
      error: 'Schema validation failed',
      details: parseResult.error.format(),
    });
  }

  const payload = parseResult.data;
  const now = Date.now();

  // Replay protection: payload timestamp must be within 5 minutes
  if (Math.abs(now - payload.timestamp) > 5 * 60 * 1000) {
    db.logWebhookEvent(payload.eventId, payload, 'ERROR', 'Timestamp expired or too far in future (Replay check failed)');
    return res.status(400).json({
      success: false,
      error: 'Timestamp out of acceptable window (5 minutes max deviation)',
    });
  }

  // Idempotency check: has this eventId been processed?
  if (db.hasWebhookEvent(payload.eventId)) {
    return res.status(409).json({
      success: false,
      error: `Duplicate event: eventId "${payload.eventId}" has already been processed`,
    });
  }

  const durationMin = payload.expiresInMinutes || 120; // default 2 hours
  const newSignal: SignalData = {
    id: `sig_${payload.eventId}`,
    symbol: payload.symbol,
    market: payload.market,
    direction: payload.direction,
    entry: payload.entry,
    stopLoss: payload.stopLoss,
    takeProfit: payload.takeProfit,
    timeframe: payload.timeframe,
    note: payload.note || 'Tín hiệu phân tích kỹ thuật từ Webhook Provider',
    source: 'WEBHOOK',
    isDemo: false,
    createdAt: now,
    expiresAt: now + durationMin * 60 * 1000,
    status: 'ACTIVE',
  };

  try {
    db.insertSignal(newSignal);
    db.logWebhookEvent(payload.eventId, payload, 'SUCCESS');

    return res.status(200).json({
      success: true,
      message: 'Signal ingested successfully',
      signalId: newSignal.id,
      expiresAt: newSignal.expiresAt,
    });
  } catch (err: any) {
    db.logWebhookEvent(payload.eventId, payload, 'ERROR', err.message);
    return res.status(500).json({
      success: false,
      error: 'Failed to persist signal into database',
      details: err.message,
    });
  }
});
