import { describe, it, expect } from 'vitest';
import crypto from 'crypto';
import { verifyHmacSignature } from '../src/server/routes/webhookRoutes';
import { db } from '../src/server/db/database';
import { WebhookSignalInputSchema } from '../src/server/validators/schemas';

describe('Webhook Security & Ingestion', () => {
  const secret = 'test-secret-key-xyz';

  it('verifies valid HMAC-SHA256 signature correctly', () => {
    const payload = JSON.stringify({ eventId: 'evt_123', symbol: 'BTC/USDT' });
    const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const isValid = verifyHmacSignature(payload, signature, secret);
    expect(isValid).toBe(true);
  });

  it('rejects tampered or forged signatures', () => {
    const payload = JSON.stringify({ eventId: 'evt_123', symbol: 'BTC/USDT' });
    const wrongSignature = crypto.createHmac('sha256', 'wrong-secret').update(payload).digest('hex');

    const isValid = verifyHmacSignature(payload, wrongSignature, secret);
    expect(isValid).toBe(false);
  });

  it('validates schema with Zod correctly', () => {
    const validData = {
      eventId: 'evt_valid_1',
      timestamp: Date.now(),
      symbol: 'ETH/USDT',
      market: 'CRYPTO',
      direction: 'LONG',
      entry: '2650',
      stopLoss: '2590',
      takeProfit: ['2750', '2850'],
      timeframe: '1H',
    };

    const parseResult = WebhookSignalInputSchema.safeParse(validData);
    expect(parseResult.success).toBe(true);

    const invalidData = {
      eventId: 'evt_short', // too short or missing fields
      symbol: 'BTC',
      // missing direction, entry, stopLoss, takeProfit
    };
    const invalidResult = WebhookSignalInputSchema.safeParse(invalidData);
    expect(invalidResult.success).toBe(false);
  });

  it('enforces idempotency for eventId', () => {
    const eventId = 'idem_test_' + Date.now();
    expect(db.hasWebhookEvent(eventId)).toBe(false);

    db.logWebhookEvent(eventId, { test: 1 }, 'SUCCESS');
    expect(db.hasWebhookEvent(eventId)).toBe(true);
  });
});

