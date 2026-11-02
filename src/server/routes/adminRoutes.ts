import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { AdminConfigUpdateSchema } from '../validators/schemas';
import { signalProviderManager } from '../services/signalProvider';
import { activePlayersStore } from '../socket/multiplayerHandler';

export const adminRouter = Router();

const DEFAULT_ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-tra-da-2026';
const DEFAULT_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'tra-da-thi-truong-secret-key-2026';

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  const token =
    req.headers['x-admin-token'] ||
    req.headers.authorization?.replace(/^Bearer\s+/, '') ||
    req.query.token;

  const expectedToken = process.env.ADMIN_TOKEN || DEFAULT_ADMIN_TOKEN;

  if (!token || token !== expectedToken) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid Admin Token' });
  }

  next();
}

adminRouter.use(adminAuthMiddleware);

// Get live statistics
adminRouter.get('/stats', (_req: Request, res: Response) => {
  const onlinePlayers = activePlayersStore.getOnlinePlayers();
  const acceptRate = parseFloat(db.getConfig('acceptRate') || '0.8');
  const cooldownSeconds = parseInt(db.getConfig('cooldownSeconds') || '60', 10);
  const providerMode = (db.getConfig('providerMode') || 'MOCK') as 'MOCK' | 'WEBHOOK';
  const signalStats = db.getSignalStats();
  const signals = db.getAllSignals(30);
  const webhookLogs = db.getWebhookLogs(30);

  return res.json({
    success: true,
    data: {
      onlineCount: onlinePlayers.length,
      activePlayers: onlinePlayers.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        role: p.role,
        joinedAt: p.joinedAt,
      })),
      acceptRate,
      cooldownSeconds,
      totalRequests: signalStats.total,
      totalAccepted: signalStats.accepted,
      totalRejected: signalStats.rejected,
      providerMode,
      signals,
      webhookLogs,
    },
  });
});

// Update runtime configurations
adminRouter.post('/config', (req: Request, res: Response) => {
  const parseResult = AdminConfigUpdateSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, error: 'Invalid configuration format', details: parseResult.error.format() });
  }

  const { acceptRate, cooldownSeconds, providerMode, maxPlayers } = parseResult.data;

  if (acceptRate !== undefined) {
    db.setConfig('acceptRate', acceptRate.toString());
  }
  if (cooldownSeconds !== undefined) {
    db.setConfig('cooldownSeconds', cooldownSeconds.toString());
  }
  if (providerMode !== undefined) {
    signalProviderManager.setMode(providerMode);
  }
  if (maxPlayers !== undefined) {
    db.setConfig('maxPlayers', maxPlayers.toString());
  }

  return res.json({
    success: true,
    message: 'Configuration updated successfully',
    config: {
      acceptRate: parseFloat(db.getConfig('acceptRate') || '0.8'),
      cooldownSeconds: parseInt(db.getConfig('cooldownSeconds') || '60', 10),
      providerMode: db.getConfig('providerMode') || 'MOCK',
      maxPlayers: parseInt(db.getConfig('maxPlayers') || '30', 10),
    },
  });
});

// Test helper: Simulate an external signed webhook call for testing and demonstration
adminRouter.post('/test-webhook', async (req: Request, res: Response) => {
  const secret = process.env.WEBHOOK_SECRET || DEFAULT_WEBHOOK_SECRET;
  const eventId = 'test_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');

  const payload = {
    eventId,
    timestamp: Date.now(),
    symbol: req.body.symbol || 'BTC/USDT (PROD FEED)',
    market: req.body.market || 'CRYPTO',
    direction: req.body.direction || 'LONG',
    entry: req.body.entry || '91,500 - 91,800',
    stopLoss: req.body.stopLoss || '90,200',
    takeProfit: req.body.takeProfit || ['93,000', '95,000'],
    timeframe: req.body.timeframe || '4H',
    note: req.body.note || 'Tín hiệu Webhook tự động qua TradingView Alert',
    expiresInMinutes: 180,
  };

  const raw = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(raw).digest('hex');

  try {
    // Ingest directly via internal call or log
    db.insertSignal({
      id: `sig_${eventId}`,
      symbol: payload.symbol,
      market: payload.market as any,
      direction: payload.direction as any,
      entry: payload.entry,
      stopLoss: payload.stopLoss,
      takeProfit: payload.takeProfit,
      timeframe: payload.timeframe,
      note: payload.note,
      source: 'WEBHOOK',
      isDemo: false,
      createdAt: payload.timestamp,
      expiresAt: payload.timestamp + payload.expiresInMinutes * 60 * 1000,
      status: 'ACTIVE',
    });
    db.logWebhookEvent(eventId, payload, 'SUCCESS');

    return res.json({
      success: true,
      message: 'Test webhook signal processed and inserted',
      eventId,
      signature,
      payload,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

