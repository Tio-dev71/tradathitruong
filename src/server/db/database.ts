import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import type { SignalData } from '../../types/signal';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, 'tra_da_thi_truong.sqlite');

export class AppDatabase {
  private db: DatabaseSync;

  constructor(filePath: string = DB_FILE) {
    this.db = new DatabaseSync(filePath);
    this.init();
  }

  private init() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        nickname TEXT NOT NULL,
        role TEXT NOT NULL,
        avatar_json TEXT NOT NULL,
        credits INTEGER NOT NULL DEFAULT 100,
        tea_count INTEGER NOT NULL DEFAULT 0,
        last_seen_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS signals (
        id TEXT PRIMARY KEY,
        symbol TEXT NOT NULL,
        market TEXT NOT NULL,
        direction TEXT NOT NULL,
        entry TEXT NOT NULL,
        stop_loss TEXT NOT NULL,
        take_profit_json TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        note TEXT,
        source TEXT NOT NULL,
        is_demo INTEGER NOT NULL DEFAULT 1,
        channel_id TEXT,
        tier TEXT DEFAULT 'M1',
        expires_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS signal_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        npc_quote TEXT NOT NULL,
        signal_id TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS webhook_events (
        event_id TEXT PRIMARY KEY,
        payload_json TEXT NOT NULL,
        status TEXT NOT NULL,
        error_message TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS payment_orders (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        order_number TEXT UNIQUE NOT NULL,
        plisio_txn_id TEXT,
        amount_usd REAL NOT NULL,
        credits INTEGER NOT NULL,
        currency TEXT,
        crypto_amount REAL,
        wallet_hash TEXT,
        qr_code TEXT,
        invoice_url TEXT,
        status TEXT NOT NULL DEFAULT 'new',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        completed_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS app_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Ensure columns exist if DB was created previously
    try {
      this.db.exec('ALTER TABLE sessions ADD COLUMN credits INTEGER NOT NULL DEFAULT 100;');
    } catch {
      // already exists
    }
    try {
      this.db.exec('ALTER TABLE sessions ADD COLUMN tea_count INTEGER NOT NULL DEFAULT 0;');
    } catch {
      // already exists
    }
    try {
      this.db.exec('ALTER TABLE signals ADD COLUMN channel_id TEXT;');
    } catch {
      // already exists
    }
    try {
      this.db.exec("ALTER TABLE signals ADD COLUMN tier TEXT DEFAULT 'M1';");
    } catch {
      // already exists
    }

    // Default configuration seeds
    this.setDefaultConfig('acceptRate', '0.8');
    this.setDefaultConfig('cooldownSeconds', '60');
    this.setDefaultConfig('providerMode', 'MOCK');
    this.setDefaultConfig('maxPlayers', '30');
  }

  private setDefaultConfig(key: string, value: string) {
    const existing = this.getConfig(key);
    if (existing === null) {
      this.setConfig(key, value);
    }
  }

  // Config helpers
  public getConfig(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM app_config WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  public setConfig(key: string, value: string) {
    const stmt = this.db.prepare(
      'INSERT INTO app_config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
    );
    stmt.run(key, value);
  }

  // Session helpers
  public saveSession(id: string, nickname: string, role: string, avatarJson: string, credits = 100, teaCount = 0) {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, nickname, role, avatar_json, credits, tea_count, last_seen_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        nickname = excluded.nickname,
        role = excluded.role,
        avatar_json = excluded.avatar_json,
        last_seen_at = excluded.last_seen_at
    `);
    stmt.run(id, nickname, role, avatarJson, credits, teaCount, now, now);
  }

  public getSession(id: string) {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(id) as {
      id: string;
      nickname: string;
      role: string;
      avatar_json: string;
      credits: number;
      tea_count: number;
      last_seen_at: number;
      created_at: number;
    } | undefined;
  }

  public updateSessionCredits(id: string, credits: number, teaCount?: number) {
    if (teaCount !== undefined) {
      const stmt = this.db.prepare('UPDATE sessions SET credits = ?, tea_count = ?, last_seen_at = ? WHERE id = ?');
      stmt.run(credits, teaCount, Date.now(), id);
    } else {
      const stmt = this.db.prepare('UPDATE sessions SET credits = ?, last_seen_at = ? WHERE id = ?');
      stmt.run(credits, Date.now(), id);
    }
  }

  public addSessionCredits(id: string, creditsToAdd: number): number {
    const session = this.getSession(id);
    const newCredits = (session ? session.credits : 0) + creditsToAdd;
    this.updateSessionCredits(id, newCredits);
    return newCredits;
  }

  // Signal helpers
  public insertSignal(signal: SignalData) {
    const stmt = this.db.prepare(`
      INSERT INTO signals (
        id, symbol, market, direction, entry, stop_loss, take_profit_json,
        timeframe, note, source, is_demo, channel_id, tier, expires_at, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      signal.id,
      signal.symbol,
      signal.market,
      signal.direction,
      signal.entry,
      signal.stopLoss,
      JSON.stringify(signal.takeProfit),
      signal.timeframe,
      signal.note,
      signal.source,
      signal.isDemo ? 1 : 0,
      signal.channelId || null,
      signal.tier || 'M1',
      signal.expiresAt,
      signal.status,
      signal.createdAt
    );
  }

  public getActiveSignals(limit = 20, tier?: 'VIP' | 'M1'): SignalData[] {
    const now = Date.now();
    let stmt;
    let rows: any[];

    if (tier) {
      stmt = this.db.prepare(`
        SELECT * FROM signals
        WHERE status = 'ACTIVE' AND expires_at > ? AND tier = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      rows = stmt.all(now, tier, limit) as any[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM signals
        WHERE status = 'ACTIVE' AND expires_at > ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      rows = stmt.all(now, limit) as any[];
    }

    return rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      market: r.market,
      direction: r.direction,
      entry: r.entry,
      stopLoss: r.stop_loss,
      takeProfit: JSON.parse(r.take_profit_json),
      timeframe: r.timeframe,
      note: r.note || '',
      source: r.source,
      isDemo: Boolean(r.is_demo),
      channelId: r.channel_id || undefined,
      tier: (r.tier as 'VIP' | 'M1') || 'M1',
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      status: r.status,
    }));
  }

  public getAllSignals(limit = 50): SignalData[] {
    const stmt = this.db.prepare(`
      SELECT * FROM signals
      ORDER BY created_at DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.map((r) => ({
      id: r.id,
      symbol: r.symbol,
      market: r.market,
      direction: r.direction,
      entry: r.entry,
      stopLoss: r.stop_loss,
      takeProfit: JSON.parse(r.take_profit_json),
      timeframe: r.timeframe,
      note: r.note || '',
      source: r.source,
      isDemo: Boolean(r.is_demo),
      createdAt: r.created_at,
      expiresAt: r.expires_at,
      status: r.status,
    }));
  }

  // Signal Request logs
  public logSignalRequest(sessionId: string, role: string, allowed: boolean, npcQuote: string, signalId?: string) {
    const stmt = this.db.prepare(`
      INSERT INTO signal_requests (session_id, role, allowed, npc_quote, signal_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(sessionId, role, allowed ? 1 : 0, npcQuote, signalId || null, Date.now());
  }

  public getSignalStats(): { total: number; accepted: number; rejected: number } {
    const totalStmt = this.db.prepare('SELECT COUNT(*) as count FROM signal_requests');
    const acceptedStmt = this.db.prepare('SELECT COUNT(*) as count FROM signal_requests WHERE allowed = 1');
    const total = (totalStmt.get() as { count: number }).count;
    const accepted = (acceptedStmt.get() as { count: number }).count;
    return {
      total,
      accepted,
      rejected: total - accepted,
    };
  }

  // Webhook event logs & idempotency
  public hasWebhookEvent(eventId: string): boolean {
    const stmt = this.db.prepare('SELECT 1 FROM webhook_events WHERE event_id = ?');
    return Boolean(stmt.get(eventId));
  }

  public logWebhookEvent(eventId: string, payload: unknown, status: 'SUCCESS' | 'ERROR', errorMessage?: string) {
    const stmt = this.db.prepare(`
      INSERT INTO webhook_events (event_id, payload_json, status, error_message, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(eventId, JSON.stringify(payload), status, errorMessage || null, Date.now());
  }

  public getWebhookLogs(limit = 30) {
    const stmt = this.db.prepare(`
      SELECT event_id as eventId, status, error_message as reason, created_at as timestamp
      FROM webhook_events
      ORDER BY created_at DESC
      LIMIT ?
    `);
    return stmt.all(limit) as { eventId: string; status: 'SUCCESS' | 'ERROR'; reason?: string; timestamp: number }[];
  }

  // Payment Orders (Plisio)
  public createPaymentOrder(order: PaymentOrder) {
    const stmt = this.db.prepare(`
      INSERT INTO payment_orders (
        id, session_id, order_number, plisio_txn_id, amount_usd, credits,
        currency, crypto_amount, wallet_hash, qr_code, invoice_url, status,
        created_at, updated_at, completed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      order.id,
      order.sessionId,
      order.orderNumber,
      order.plisioTxnId || null,
      order.amountUsd,
      order.credits,
      order.currency || null,
      order.cryptoAmount || null,
      order.walletHash || null,
      order.qrCode || null,
      order.invoiceUrl || null,
      order.status,
      order.createdAt,
      order.updatedAt,
      order.completedAt || null
    );
  }

  public getPaymentOrderByOrderNumber(orderNumber: string): PaymentOrder | undefined {
    const stmt = this.db.prepare('SELECT * FROM payment_orders WHERE order_number = ?');
    const row = stmt.get(orderNumber) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      sessionId: row.session_id,
      orderNumber: row.order_number,
      plisioTxnId: row.plisio_txn_id,
      amountUsd: Number(row.amount_usd),
      credits: Number(row.credits),
      currency: row.currency,
      cryptoAmount: row.crypto_amount ? Number(row.crypto_amount) : null,
      walletHash: row.wallet_hash,
      qrCode: row.qr_code,
      invoiceUrl: row.invoice_url,
      status: row.status,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      completedAt: row.completed_at ? Number(row.completed_at) : null,
    };
  }

  public getPaymentOrderById(id: string): PaymentOrder | undefined {
    const stmt = this.db.prepare('SELECT * FROM payment_orders WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;
    return {
      id: row.id,
      sessionId: row.session_id,
      orderNumber: row.order_number,
      plisioTxnId: row.plisio_txn_id,
      amountUsd: Number(row.amount_usd),
      credits: Number(row.credits),
      currency: row.currency,
      cryptoAmount: row.crypto_amount ? Number(row.crypto_amount) : null,
      walletHash: row.wallet_hash,
      qrCode: row.qr_code,
      invoiceUrl: row.invoice_url,
      status: row.status,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      completedAt: row.completed_at ? Number(row.completed_at) : null,
    };
  }

  public updatePaymentOrderStatus(
    orderNumber: string,
    status: PaymentOrder['status'],
    details?: Partial<PaymentOrder>
  ) {
    const current = this.getPaymentOrderByOrderNumber(orderNumber);
    if (!current) return;

    const updatedAt = Date.now();
    const completedAt = status === 'completed' ? (details?.completedAt || Date.now()) : current.completedAt;
    const plisioTxnId = details?.plisioTxnId !== undefined ? details.plisioTxnId : current.plisioTxnId;
    const cryptoAmount = details?.cryptoAmount !== undefined ? details.cryptoAmount : current.cryptoAmount;
    const walletHash = details?.walletHash !== undefined ? details.walletHash : current.walletHash;
    const qrCode = details?.qrCode !== undefined ? details.qrCode : current.qrCode;
    const invoiceUrl = details?.invoiceUrl !== undefined ? details.invoiceUrl : current.invoiceUrl;
    const currency = details?.currency !== undefined ? details.currency : current.currency;

    const stmt = this.db.prepare(`
      UPDATE payment_orders SET
        status = ?,
        plisio_txn_id = ?,
        crypto_amount = ?,
        wallet_hash = ?,
        qr_code = ?,
        invoice_url = ?,
        currency = ?,
        updated_at = ?,
        completed_at = ?
      WHERE order_number = ?
    `);
    stmt.run(
      status,
      plisioTxnId || null,
      cryptoAmount || null,
      walletHash || null,
      qrCode || null,
      invoiceUrl || null,
      currency || null,
      updatedAt,
      completedAt || null,
      orderNumber
    );
  }

  public getRecentPaymentOrders(sessionId?: string, limit = 20): PaymentOrder[] {
    let stmt;
    let rows: any[];
    if (sessionId) {
      stmt = this.db.prepare(`
        SELECT * FROM payment_orders
        WHERE session_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `);
      rows = stmt.all(sessionId, limit) as any[];
    } else {
      stmt = this.db.prepare(`
        SELECT * FROM payment_orders
        ORDER BY created_at DESC
        LIMIT ?
      `);
      rows = stmt.all(limit) as any[];
    }

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      orderNumber: row.order_number,
      plisioTxnId: row.plisio_txn_id,
      amountUsd: Number(row.amount_usd),
      credits: Number(row.credits),
      currency: row.currency,
      cryptoAmount: row.crypto_amount ? Number(row.crypto_amount) : null,
      walletHash: row.wallet_hash,
      qrCode: row.qr_code,
      invoiceUrl: row.invoice_url,
      status: row.status,
      createdAt: Number(row.created_at),
      updatedAt: Number(row.updated_at),
      completedAt: row.completed_at ? Number(row.completed_at) : null,
    }));
  }
}

export interface PaymentOrder {
  id: string;
  sessionId: string;
  orderNumber: string;
  plisioTxnId?: string | null;
  amountUsd: number;
  credits: number;
  currency?: string | null;
  cryptoAmount?: number | null;
  walletHash?: string | null;
  qrCode?: string | null;
  invoiceUrl?: string | null;
  status: 'new' | 'pending' | 'completed' | 'expired' | 'cancelled' | 'mismatch';
  createdAt: number;
  updatedAt: number;
  completedAt?: number | null;
}

export const db = new AppDatabase();
