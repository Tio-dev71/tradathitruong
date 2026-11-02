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
  getAvailableSignal(role?: string): Promise<SignalData | null>;
  getSignalById(id: string): Promise<SignalData | null>;
  validateSignal(signal: unknown): boolean;
  getProviderStatus(): ProviderStatus;
}

const DEMO_SIGNALS: Array<Omit<SignalData, 'id' | 'createdAt' | 'expiresAt'>> = [
  {
    symbol: 'BTC/USDT (DEMO)',
    market: 'CRYPTO',
    direction: 'LONG',
    entry: '88,200 - 88,500',
    stopLoss: '87,100',
    takeProfit: ['89,800', '91,200', '93,000'],
    timeframe: '4H',
    note: 'DEMO – KHÔNG PHẢI TÍN HIỆU THẬT: Nến búa đảo chiều tại vùng hỗ trợ EMA 50 kết hợp phân kỳ dương RSI.',
    source: 'MOCK_ENGINE',
    isDemo: true,
    status: 'ACTIVE',
  },
  {
    symbol: 'ETH/USDT (DEMO)',
    market: 'CRYPTO',
    direction: 'SHORT',
    entry: '2,640 - 2,660',
    stopLoss: '2,710',
    takeProfit: ['2,580', '2,520', '2,450'],
    timeframe: '1H',
    note: 'DEMO – KHÔNG PHẢI TÍN HIỆU THẬT: Kháng cự kênh giá giảm, volume suy yếu tại đỉnh cũ.',
    source: 'MOCK_ENGINE',
    isDemo: true,
    status: 'ACTIVE',
  },
  {
    symbol: 'VNINDEX (DEMO)',
    market: 'VN_STOCK',
    direction: 'LONG',
    entry: '1,245 - 1,250',
    stopLoss: '1,230',
    takeProfit: ['1,275', '1,290', '1,310'],
    timeframe: '1D',
    note: 'DEMO – KHÔNG PHẢI TÍN HIỆU THẬT: Khối ngoại đảo chiều mua ròng nhóm ngân hàng và bán lẻ.',
    source: 'MOCK_ENGINE',
    isDemo: true,
    status: 'ACTIVE',
  },
  {
    symbol: 'XAU/USD (VÀNG) (DEMO)',
    market: 'COMMODITY',
    direction: 'LONG',
    entry: '2,725 - 2,730',
    stopLoss: '2,710',
    takeProfit: ['2,750', '2,775', '2,800'],
    timeframe: '1H',
    note: 'DEMO – KHÔNG PHẢI TÍN HIỆU THẬT: Lực mua gom mạnh trước phiên Mỹ, giữ vững trên trendline tăng.',
    source: 'MOCK_ENGINE',
    isDemo: true,
    status: 'ACTIVE',
  },
  {
    symbol: 'EUR/USD (DEMO)',
    market: 'FOREX',
    direction: 'WAIT',
    entry: 'Quan sát vùng 1.0820',
    stopLoss: 'N/A',
    takeProfit: ['N/A'],
    timeframe: '4H',
    note: 'DEMO – KHÔNG PHẢI TÍN HIỆU THẬT: Chờ tin tức lãi suất ECB, chưa có điểm vào lệnh rõ ràng.',
    source: 'MOCK_ENGINE',
    isDemo: true,
    status: 'ACTIVE',
  },
  {
    symbol: 'SOL/USDT (DEMO)',
    market: 'CRYPTO',
    direction: 'LONG',
    entry: '185 - 188',
    stopLoss: '179',
    takeProfit: ['195', '205', '215'],
    timeframe: '1H',
    note: 'DEMO – KHÔNG PHẢI TÍN HIỆU THẬT: Breakout mô hình tam giác tích lũy với khối lượng lớn.',
    source: 'MOCK_ENGINE',
    isDemo: true,
    status: 'ACTIVE',
  },
];

export class MockSignalProvider implements ISignalProvider {
  public async getAvailableSignal(_role?: string): Promise<SignalData | null> {
    const template = DEMO_SIGNALS[Math.floor(Math.random() * DEMO_SIGNALS.length)];
    const now = Date.now();
    const signal: SignalData = {
      ...template,
      id: 'mock_' + crypto.randomBytes(4).toString('hex'),
      createdAt: now,
      expiresAt: now + 3600 * 1000 * 4, // 4 hours
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
      activeSignalsCount: DEMO_SIGNALS.length,
      ready: true,
      info: 'Chế độ Demo Mock Engine sẵn sàng với 6 kịch bản thị trường mô phỏng.',
    };
  }
}

export class WebhookSignalProvider implements ISignalProvider {
  public async getAvailableSignal(): Promise<SignalData | null> {
    const signals = db.getActiveSignals(10);
    if (!signals || signals.length === 0) {
      return null;
    }
    // Return the freshest active signal
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
    const mode = db.getConfig('providerMode') || 'MOCK';
    if (mode === 'WEBHOOK') {
      return this.webhookProvider;
    }
    return this.mockProvider;
  }

  public setMode(mode: 'MOCK' | 'WEBHOOK') {
    db.setConfig('providerMode', mode);
  }

  public getStatus(): ProviderStatus {
    return this.getActiveProvider().getProviderStatus();
  }
}

export const signalProviderManager = new SignalProviderManager();
