import type { SignalData, MarketType, SignalDirection } from '../../types/signal';
import { db } from '../db/database';
import crypto from 'crypto';

export interface ProviderStatus {
  mode: 'MOCK' | 'WEBHOOK';
  activeSignalsCount: number;
  ready: boolean;
  info: string;
}

export interface ISignalProvider {
  getAvailableSignal(role?: string, tier?: 'VIP' | 'M1'): Promise<SignalData | null>;
  getSignalById(id: string): Promise<SignalData | null>;
  validateSignal(signal: unknown): boolean;
  getProviderStatus(): ProviderStatus;
}

const REAL_SIGNAL_TEMPLATES: Array<Omit<SignalData, 'id' | 'createdAt' | 'expiresAt'>> = [
  {
    symbol: 'BTC/USDT',
    market: 'CRYPTO',
    direction: 'LONG',
    entry: '88,200 - 88,500',
    stopLoss: '87,100',
    takeProfit: ['89,800', '91,200', '93,000'],
    timeframe: '4H',
    note: 'Nến búa đảo chiều tại vùng hỗ trợ EMA 50 kết hợp phân kỳ dương RSI.',
    source: 'Trading-Bot (VIP Vàng/BTC/ETH)',
    isDemo: false,
    status: 'ACTIVE',
  },
  {
    symbol: 'ETH/USDT',
    market: 'CRYPTO',
    direction: 'SHORT',
    entry: '2,640 - 2,660',
    stopLoss: '2,710',
    takeProfit: ['2,580', '2,520', '2,450'],
    timeframe: '1H',
    note: 'Kháng cự kênh giá giảm, volume suy yếu tại đỉnh cũ.',
    source: 'Trading-Bot (VIP Vàng/BTC/ETH)',
    isDemo: false,
    status: 'ACTIVE',
  },
  {
    symbol: 'XAU/USD (VÀNG)',
    market: 'COMMODITY',
    direction: 'LONG',
    entry: '2,725 - 2,730',
    stopLoss: '2,710',
    takeProfit: ['2,750', '2,775', '2,800'],
    timeframe: '1H',
    note: 'Lực mua gom mạnh trước phiên Mỹ, giữ vững trên trendline tăng.',
    source: 'Trading-Bot (VIP Vàng/BTC/ETH)',
    isDemo: false,
    status: 'ACTIVE',
  },
  {
    symbol: 'SOL/USDT',
    market: 'CRYPTO',
    direction: 'LONG',
    entry: '185 - 188',
    stopLoss: '179',
    takeProfit: ['195', '205', '215'],
    timeframe: 'm1',
    note: 'Breakout mô hình tam giác tích lũy với khối lượng lớn.',
    source: 'Trading-Bot (M1 Scalp)',
    isDemo: false,
    status: 'ACTIVE',
  },
  {
    symbol: 'XRP/USD',
    market: 'CRYPTO',
    direction: 'LONG',
    entry: '1.25',
    stopLoss: '1.23',
    takeProfit: ['1.28'],
    timeframe: 'm1',
    note: 'Lệnh nhóm VIP - Bot Liquidation [Trạng thái: Entry]',
    source: 'Trading-Bot (M1 Scalp)',
    isDemo: false,
    status: 'ACTIVE',
  },
];

export class MockSignalProvider implements ISignalProvider {
  public async getAvailableSignal(_role?: string, tier?: 'VIP' | 'M1'): Promise<SignalData | null> {
    let pool = REAL_SIGNAL_TEMPLATES;
    if (tier === 'VIP') {
      pool = REAL_SIGNAL_TEMPLATES.filter((s) => s.symbol.includes('BTC') || s.symbol.includes('ETH') || s.symbol.includes('XAU'));
    } else if (tier === 'M1') {
      pool = REAL_SIGNAL_TEMPLATES.filter((s) => s.timeframe === 'm1' || s.timeframe === '1H');
    }
    const template = pool[Math.floor(Math.random() * pool.length)] || REAL_SIGNAL_TEMPLATES[0];
    const now = Date.now();
    const signal: SignalData = {
      ...template,
      id: 'sig_' + crypto.randomBytes(4).toString('hex'),
      tier: tier || 'VIP',
      note: tier === 'VIP' ? `[KÈO VIP PHÒNG XỊN] ${template.note}` : `[KÈO LƯỚT M1 SCALP] ${template.note}`,
      createdAt: now,
      expiresAt: now + 3600 * 1000 * 4,
    };
    return signal;
  }
  public async getSignalById(id: string): Promise<SignalData | null> {
    const list = await this.getAvailableSignal();
    return list ? { ...list, id } : null;
  }

  public validateSignal(signal: unknown): boolean {
    return typeof signal === 'object' && signal !== null && 'symbol' in signal && 'direction' in signal;
  }

  public getProviderStatus(): ProviderStatus {
    return {
      mode: 'MOCK',
      activeSignalsCount: REAL_SIGNAL_TEMPLATES.length,
      ready: true,
      info: 'Chế độ Signal Provider sẵn sàng với 5 kịch bản thị trường.',
    };
  }
}

export class WebhookSignalProvider implements ISignalProvider {
  public async getAvailableSignal(_role?: string, tier?: 'VIP' | 'M1'): Promise<SignalData | null> {
    // 1. Tìm kèo thuộc tier tương ứng đang ACTIVE (chưa Full TP)
    let signals = db.getActiveSignals(10, tier);
    
    // 2. Nếu phòng đó tạm chưa có, lấy bất kỳ kèo nào đang ACTIVE chưa Full TP
    if (!signals || signals.length === 0) {
      signals = db.getActiveSignals(10);
    }

    // 3. Dự phòng mở rộng: lấy kèo bất kỳ trong cơ sở dữ liệu chưa Full TP
    if (!signals || signals.length === 0) {
      signals = db.getNonFullTPSignals(10);
    }

    if (!signals || signals.length === 0) {
      return null;
    }

    // Trả về tín hiệu thật mới nhất từ bot Discord/TradingView (chưa Full TP)
    return signals[0];
  }

  public async getSignalById(id: string): Promise<SignalData | null> {
    const signals = db.getAllSignals(100);
    return signals.find((s) => s.id === id) || null;
  }

  public validateSignal(signal: unknown): boolean {
    return typeof signal === 'object' && signal !== null && 'symbol' in signal && 'direction' in signal;
  }

  public getProviderStatus(): ProviderStatus {
    const active = db.getActiveSignals(50);
    return {
      mode: 'WEBHOOK',
      activeSignalsCount: active.length,
      ready: true,
      info: `Webhook Signal Provider: Có ${active.length} tín hiệu active trong cơ sở dữ liệu.`,
    };
  }
}

export class SignalProviderManager {
  private mockProvider = new MockSignalProvider();
  private webhookProvider = new WebhookSignalProvider();

  public getActiveProvider(): ISignalProvider {
    const mode = db.getConfig('providerMode') || 'WEBHOOK';
    if (mode === 'MOCK') {
      return this.mockProvider;
    }
    return this.webhookProvider;
  }

  public setMode(mode: 'MOCK' | 'WEBHOOK') {
    db.setConfig('providerMode', mode);
  }

  public getStatus(): ProviderStatus {
    return this.getActiveProvider().getProviderStatus();
  }
}

export const signalProviderManager = new SignalProviderManager();

