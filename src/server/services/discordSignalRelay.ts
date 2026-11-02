import { db } from '../db/database';
import type { SignalData } from '../../types/signal';
import type { Server as SocketIOServer } from 'socket.io';

export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  fields?: DiscordEmbedField[];
  footer?: { text?: string };
  timestamp?: string;
}

export interface DiscordMessagePayload {
  id?: string;
  channel_id?: string;
  author?: {
    id?: string;
    username?: string;
    bot?: boolean;
  };
  content?: string;
  embeds?: DiscordEmbed[];
}

export class DiscordSignalRelayService {
  private io: SocketIOServer | null = null;
  private processedMessageIds = new Set<string>();

  public setSocketServer(io: SocketIOServer) {
    this.io = io;
  }

  /**
   * Parse the exact Discord Embed format posted by Trading-Bot_TLS1:
   * Title: "Lệnh nhóm VIP - Bot Liquidation"
   * Fields:
   *   Side: SHORT 🔴 / LONG 🟢
   *   Coin: XRP/USD, XAU/USD, BTC/USD, ETH/USD...
   *   Timeframe: m1, m5, 1h...
   *   TP: $1.24
   *   Entry 1: $1.25 (1%)
   *   Entry 2: $1.25 (2%)
   *   SL: $1.26
   *   Event: Entry / 2/3 TP / Full TP
   */
  public parseTradingBotEmbed(embed: DiscordEmbed): Partial<SignalData> | null {
    if (!embed) return null;

    const fieldsMap = new Map<string, string>();
    if (embed.fields && Array.isArray(embed.fields)) {
      embed.fields.forEach((f) => {
        // Strip colons and whitespace for robust key matching
        const key = f.name.replace(/[:：]/g, '').trim().toLowerCase();
        fieldsMap.set(key, f.value.trim());
      });
    }

    // Also parse from description or title if fields are embedded in text
    const textBlob = `${embed.title || ''}\n${embed.description || ''}\n${Array.from(fieldsMap.entries()).map(([k, v]) => `${k}: ${v}`).join('\n')}`;

    // 1. Side (Direction)
    let direction: 'LONG' | 'SHORT' = 'LONG';
    const sideField = fieldsMap.get('side') || fieldsMap.get('lệnh') || '';
    if (/short/i.test(sideField) || /bán/i.test(sideField) || /🔴/.test(sideField)) {
      direction = 'SHORT';
    } else if (/long/i.test(sideField) || /mua/i.test(sideField) || /🟢/.test(sideField)) {
      direction = 'LONG';
    } else if (/short/i.test(textBlob)) {
      direction = 'SHORT';
    }

    // 2. Coin (Symbol)
    let rawSymbol = fieldsMap.get('coin') || fieldsMap.get('symbol') || fieldsMap.get('cặp') || '';
    if (!rawSymbol) {
      const match = textBlob.match(/(?:coin|symbol|cặp)[\s:]*([A-Za-z0-9/_\-]+)/i);
      if (match) rawSymbol = match[1];
    }
    if (!rawSymbol) {
      // Look for standard tickers: XRP/USD, XAU/USD, BTC/USD, ETH/USD
      const tickerMatch = textBlob.match(/\b(XAU\/USD|GOLD|BTC\/USD|ETH\/USD|XRP\/USD|SOL\/USD|[A-Z]{2,6}\/[A-Z]{2,6})\b/i);
      if (tickerMatch) rawSymbol = tickerMatch[1].toUpperCase();
    }
    if (!rawSymbol) return null; // Cannot parse without symbol

    const symbol = rawSymbol.toUpperCase();

    // 3. Market Type classification
    let market: 'CRYPTO' | 'FOREX' | 'COMMODITY' | 'STOCK' = 'CRYPTO';
    if (/XAU|GOLD|BẠC|SILVER|DẦU|OIL/i.test(symbol)) {
      market = 'COMMODITY';
    } else if (/EUR|GBP|JPY|AUD|CAD|CHF/i.test(symbol)) {
      market = 'FOREX';
    } else if (/BTC|ETH|XRP|SOL|DOGE|BNB|ADA|AVAX/i.test(symbol)) {
      market = 'CRYPTO';
    }

    // 4. Timeframe
    let timeframe = fieldsMap.get('timeframe') || fieldsMap.get('khung') || 'm1';
    const tfMatch = textBlob.match(/(?:timeframe|khung)[\s:]*([mhdMHD0-9]+)/i);
    if (tfMatch) timeframe = tfMatch[1].toLowerCase();

    // 5. Entry
    let entry = fieldsMap.get('entry 1') || fieldsMap.get('entry') || fieldsMap.get('vào') || '';
    if (!entry) {
      const eMatch = textBlob.match(/entry(?:\s*1)?[\s:]*([$0-9.,]+)/i);
      if (eMatch) entry = eMatch[1];
      else entry = 'Thị giá hiện tại';
    }

    // 6. Stop Loss
    let stopLoss = fieldsMap.get('sl') || fieldsMap.get('stop loss') || fieldsMap.get('cắt lỗ') || '';
    if (!stopLoss) {
      const slMatch = textBlob.match(/(?:sl|stop\s*loss)[\s:]*([$0-9.,]+)/i);
      if (slMatch) stopLoss = slMatch[1];
      else stopLoss = 'Theo quản lý vốn';
    }

    // 7. Take Profit
    let tp = fieldsMap.get('tp') || fieldsMap.get('take profit') || fieldsMap.get('chốt lời') || '';
    if (!tp) {
      const tpMatch = textBlob.match(/(?:tp|take\s*profit)[\s:]*([$0-9.,]+)/i);
      if (tpMatch) tp = tpMatch[1];
      else tp = 'Mục tiêu 1:2';
    }

    // 8. Event
    const event = fieldsMap.get('event') || fieldsMap.get('sự kiện') || 'Entry';

    return {
      symbol,
      market,
      direction,
      entry,
      stopLoss,
      takeProfit: [tp],
      timeframe,
      note: `Lệnh nhóm VIP - Bot Liquidation [Trạng thái: ${event}]`,
      source: 'Trading-Bot_TLS1 (Discord VIP)',
      isDemo: false,
    };
  }

  /**
   * Process and ingest an incoming Discord message or webhook payload into the game
   */
  public processDiscordPayload(payload: DiscordMessagePayload): { success: boolean; signal?: SignalData; error?: string } {
    const msgId = payload.id || `disc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    if (this.processedMessageIds.has(msgId)) {
      return { success: false, error: 'Tin nhắn này đã được tiếp nhận rồi' };
    }
    this.processedMessageIds.add(msgId);
    if (this.processedMessageIds.size > 2000) {
      // Keep set bounded
      const first = this.processedMessageIds.values().next().value;
      if (first) this.processedMessageIds.delete(first);
    }

    let parsedSignal: Partial<SignalData> | null = null;

    // Check embeds
    if (payload.embeds && payload.embeds.length > 0) {
      for (const embed of payload.embeds) {
        parsedSignal = this.parseTradingBotEmbed(embed);
        if (parsedSignal) break;
      }
    }

    // Fallback: check content text
    if (!parsedSignal && payload.content) {
      parsedSignal = this.parseTradingBotEmbed({
        title: 'Trading-Bot Signal',
        description: payload.content,
      });
    }

    if (!parsedSignal || !parsedSignal.symbol || !parsedSignal.direction) {
      return {
        success: false,
        error: 'Không tìm thấy dữ liệu kèo lệnh hợp lệ từ nội dung Discord',
      };
    }

    const now = Date.now();
    const finalSignal: SignalData = {
      id: `sig_discord_${Date.now()}`,
      symbol: parsedSignal.symbol,
      market: parsedSignal.market || 'CRYPTO',
      direction: parsedSignal.direction,
      entry: parsedSignal.entry || 'Thị giá',
      stopLoss: parsedSignal.stopLoss || 'Cắt lỗ kỹ thuật',
      takeProfit: parsedSignal.takeProfit || ['Chốt lời R:R 1:2'],
      timeframe: parsedSignal.timeframe || 'm1',
      note: parsedSignal.note || 'Tín hiệu trực tiếp từ bot Discord TradingView',
      source: 'Trading-Bot_TLS1 (Discord VIP)',
      isDemo: false,
      createdAt: now,
      expiresAt: now + 2 * 3600 * 1000, // 2 hours
      status: 'ACTIVE',
    };

    // 1. Insert into SQLite Database
    db.insertSignal(finalSignal);

    // 2. Broadcast via Socket.IO to all players
    if (this.io) {
      this.io.emit('signal:new', finalSignal);

      // System announcement in chat
      this.io.emit('chat:message', {
        id: 'sig_ann_' + Date.now(),
        playerId: 'system',
        nickname: 'Quán Trà Đá',
        role: 'Nhà Tiên Tri Nến',
        text: `⚡ KÈO VIP MỚI TỪ BOT TRADING: [${finalSignal.direction}] ${finalSignal.symbol} (Entry: ${finalSignal.entry} | TP: ${finalSignal.takeProfit.join(', ')} | SL: ${finalSignal.stopLoss})! Ra xin bà hoặc thầy để nhận chi tiết!`,
        timestamp: Date.now(),
        isSystem: true,
      });

      // If it's a Gold Signal, trigger immediate update for Tiệm Vàng DJN billboard
      if (finalSignal.symbol.includes('XAU') || finalSignal.symbol.includes('GOLD')) {
        const cleanPrice = parseFloat(finalSignal.entry.replace(/[^0-9.]/g, ''));
        if (!isNaN(cleanPrice) && cleanPrice > 1000) {
          this.io.emit('gold:update', {
            price: cleanPrice,
            change: finalSignal.direction === 'LONG' ? 14.5 : -12.3,
            changePercent: finalSignal.direction === 'LONG' ? 0.53 : -0.45,
          });
        }
      }
    }

    return { success: true, signal: finalSignal };
  }
}

export const discordSignalRelay = new DiscordSignalRelayService();
