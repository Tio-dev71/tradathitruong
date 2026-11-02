import type { Server as SocketIOServer } from 'socket.io';

export interface TickerData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  updatedAt: number;
}

export class MarketPriceService {
  private io: SocketIOServer | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private lastPrices = new Map<string, TickerData>();

  constructor() {
    // Seed initial sensible fallback data
    this.lastPrices.set('XAU/USD', {
      symbol: 'XAU/USD',
      price: 2748.50,
      change: 18.60,
      changePercent: 0.68,
      high: 2756.20,
      low: 2729.40,
      updatedAt: Date.now(),
    });
    this.lastPrices.set('BTC/USDT', {
      symbol: 'BTC/USDT',
      price: 69420.00,
      change: 850.00,
      changePercent: 1.24,
      high: 69900.00,
      low: 68100.00,
      updatedAt: Date.now(),
    });
    this.lastPrices.set('ETH/USDT', {
      symbol: 'ETH/USDT',
      price: 2680.50,
      change: 35.20,
      changePercent: 1.33,
      high: 2710.00,
      low: 2620.00,
      updatedAt: Date.now(),
    });
    this.lastPrices.set('XRP/USDT', {
      symbol: 'XRP/USDT',
      price: 1.25,
      change: 0.04,
      changePercent: 3.20,
      high: 1.28,
      low: 1.19,
      updatedAt: Date.now(),
    });
  }

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  public startPolling(intervalMs = 6000) {
    if (this.pollInterval) return;
    this.fetchLivePrices();
    this.pollInterval = setInterval(() => {
      this.fetchLivePrices();
    }, intervalMs);
  }

  public stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  public getTicker(symbol: string): TickerData | undefined {
    return this.lastPrices.get(symbol);
  }

  public getAllTickers(): Record<string, TickerData> {
    const res: Record<string, TickerData> = {};
    for (const [k, v] of this.lastPrices.entries()) {
      res[k] = v;
    }
    return res;
  }

  /**
   * Fetch live prices from public Binance API (free, zero API key required)
   * or user-provided custom endpoints.
   */
  public async fetchLivePrices() {
    try {
      // 1. Custom user API endpoint if configured in .env
      const customGoldApi = process.env.GOLD_API_URL;
      if (customGoldApi) {
        try {
          const res = await fetch(customGoldApi);
          if (res.ok) {
            const data: any = await res.json();
            const p = parseFloat(data.price || data.last || data.rate);
            if (!isNaN(p)) {
              this.updatePrice('XAU/USD', p, data.change, data.changePercent);
            }
          }
        } catch (e) {
          console.warn('[MarketPriceService] Custom Gold API unreachable, falling back to public feed:', (e as Error).message);
        }
      }

      // 2. Binance 24hr ticker public endpoint for BTC, ETH, XRP and PAXG (Gold spot benchmark)
      const symbolsQuery = encodeURIComponent('["BTCUSDT","ETHUSDT","XRPUSDT","PAXGUSDT"]');
      const binanceUrl = `https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsQuery}`;

      const res = await fetch(binanceUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(4000) });
      if (!res.ok) return;

      const data: any = await res.json();
      if (!Array.isArray(data)) return;

      data.forEach((item: any) => {
        const symbol = item.symbol;
        const price = parseFloat(item.lastPrice);
        const change = parseFloat(item.priceChange);
        const changePercent = parseFloat(item.priceChangePercent);
        const high = parseFloat(item.highPrice);
        const low = parseFloat(item.lowPrice);

        if (symbol === 'PAXGUSDT') {
          // PAXG tracks 1 fine troy ounce of physical gold vaulted in London (XAU/USD)
          this.updatePrice('XAU/USD', price, change, changePercent, high, low);
        } else if (symbol === 'BTCUSDT') {
          this.updatePrice('BTC/USDT', price, change, changePercent, high, low);
        } else if (symbol === 'ETHUSDT') {
          this.updatePrice('ETH/USDT', price, change, changePercent, high, low);
        } else if (symbol === 'XRPUSDT') {
          this.updatePrice('XRP/USDT', price, change, changePercent, high, low);
        }
      });

      // Broadcast full ticker packet to 3D world
      if (this.io) {
        this.io.emit('market:tickers', this.getAllTickers());
      }
    } catch {
      // Offline fallback: apply subtle realistic random walk micro-tick so the board keeps alive
      const currentGold = this.lastPrices.get('XAU/USD')!;
      const microTick = (Math.random() - 0.49) * 0.4;
      const nextP = Number((currentGold.price + microTick).toFixed(2));
      const nextC = Number((currentGold.change + microTick).toFixed(2));
      this.updatePrice('XAU/USD', nextP, nextC, currentGold.changePercent);
    }
  }

  public updatePrice(
    symbol: string,
    price: number,
    change?: number,
    changePercent?: number,
    high?: number,
    low?: number
  ) {
    const existing = this.lastPrices.get(symbol);
    const now = Date.now();
    const updated: TickerData = {
      symbol,
      price,
      change: change !== undefined ? change : (existing?.change ?? 0),
      changePercent: changePercent !== undefined ? changePercent : (existing?.changePercent ?? 0),
      high: high !== undefined ? high : (existing?.high ?? price),
      low: low !== undefined ? low : (existing?.low ?? price),
      updatedAt: now,
    };
    this.lastPrices.set(symbol, updated);

    // If Gold price updated, broadcast gold:update for Tiệm Vàng DJN billboard
    if (symbol === 'XAU/USD' && this.io) {
      this.io.emit('gold:update', {
        price: updated.price,
        change: updated.change,
        changePercent: updated.changePercent,
        high: updated.high,
        low: updated.low,
      });
    }
  }
}

export const marketPriceService = new MarketPriceService();
