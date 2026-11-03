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

/**
 * Strips parentheses and percentage annotations, e.g. "(1%)", "(-2%)", "(+1.5%)"
 */
export function cleanPriceString(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.replace(/\s*\([+\-]?[0-9.]+%?\)/g, '').trim();
  cleaned = cleaned.replace(/\s+/g, ' ');
  return cleaned;
}

/**
 * Extracts numeric value, decimal precision, and currency prefix from price string
 */
export function extractPriceNumber(val: string): { num: number; decimals: number; prefix: string } | null {
  if (!val) return null;
  const cleaned = cleanPriceString(val);
  const match = cleaned.match(/([$€£₫]?)\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
  if (!match) return null;
  const prefix = match[1] || '';
  const numStr = match[2].replace(/,/g, '');
  const num = parseFloat(numStr);
  if (isNaN(num)) return null;

  const dotIdx = numStr.indexOf('.');
  const decimals = dotIdx >= 0 ? numStr.length - dotIdx - 1 : 0;
  return { num, decimals, prefix };
}

/**
 * Formats a numeric price with thousands commas, decimal places, and currency prefix
 */
export function formatPrice(num: number, decimals: number, prefix: string = '$'): string {
  const dec = Math.max(0, decimals);
  const factor = Math.pow(10, dec);
  // Round half-up to avoid IEEE-754 precision issues (e.g. 77092.025 -> 77092.03)
  const rounded = Math.round(num * factor + 1e-9) / factor;
  const parts = rounded.toFixed(dec).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const formatted = parts.join('.');
  return `${prefix}${formatted}`.trim();
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
    // Check if both Entry 1 and Entry 2 are provided (common in DCA / multi-entry signals)
    let rawEntry1 = fieldsMap.get('entry 1') || fieldsMap.get('entry1') || fieldsMap.get('vào 1') || '';
    let rawEntry2 = fieldsMap.get('entry 2') || fieldsMap.get('entry2') || fieldsMap.get('vào 2') || '';

    if (!rawEntry1) {
      const m1 = textBlob.match(/entry\s*1[\s:]*([^\n\r]+)/i);
      if (m1) rawEntry1 = m1[1].trim();
    }
    if (!rawEntry2) {
      const m2 = textBlob.match(/entry\s*2[\s:]*([^\n\r]+)/i);
      if (m2) rawEntry2 = m2[1].trim();
    }

    let entry = '';
    const p1 = extractPriceNumber(rawEntry1);
    const p2 = extractPriceNumber(rawEntry2);

    if (p1 && p2) {
      // Yêu cầu: khi có thông tin entry 1 và entry 2 -> hiện 1 entry duy nhất = (entry 1 + entry 2) / 2
      const avg = (p1.num + p2.num) / 2;
      let dec = Math.max(p1.decimals, p2.decimals);
      if (dec === 0 && avg % 1 !== 0) {
        dec = 1;
      }
      const prefix = p1.prefix || p2.prefix || (rawEntry1.includes('$') || rawEntry2.includes('$') ? '$' : '');
      entry = formatPrice(avg, dec, prefix);
    } else if (p1) {
      entry = cleanPriceString(rawEntry1);
    } else if (p2) {
      entry = cleanPriceString(rawEntry2);
    } else {
      let genericEntry = fieldsMap.get('entry') || fieldsMap.get('vào') || '';
      if (!genericEntry) {
        const eMatch = textBlob.match(/entry[\s:]*([^\n\r]+)/i);
        if (eMatch) genericEntry = eMatch[1].trim();
      }
      entry = genericEntry ? cleanPriceString(genericEntry) : 'Thị giá hiện tại';
    }

    // 6. Stop Loss - lấy đúng như tín hiệu được bắn lên
    let rawSL = fieldsMap.get('sl') || fieldsMap.get('stop loss') || fieldsMap.get('cắt lỗ') || '';
    if (!rawSL) {
      const slMatch = textBlob.match(/(?:sl|stop\s*loss)[\s:]*([^\n\r]+)/i);
      if (slMatch) rawSL = slMatch[1].trim();
    }
    const stopLoss = rawSL ? cleanPriceString(rawSL) : 'Theo quản lý vốn';

    // 7. Take Profit - lấy đúng như tín hiệu được bắn lên
    const tpList: string[] = [];
    if (fieldsMap.has('tp 1') || fieldsMap.has('tp1')) {
      for (let i = 1; i <= 5; i++) {
        const val = fieldsMap.get(`tp ${i}`) || fieldsMap.get(`tp${i}`);
        if (val) tpList.push(cleanPriceString(val));
      }
    }

    if (tpList.length === 0) {
      let rawTP = fieldsMap.get('tp') || fieldsMap.get('take profit') || fieldsMap.get('chốt lời') || '';
      if (!rawTP) {
        const tpMatch = textBlob.match(/(?:tp|take\s*profit)[\s:]*([^\n\r]+)/i);
        if (tpMatch) rawTP = tpMatch[1].trim();
      }
      if (rawTP) {
        // Split if multiple TPs separated by newline, semicolon, pipe, slash, or comma followed by currency
        const parts = rawTP.split(/[\n;|\/]+|,\s*(?=[$€£₫])/).map((s) => cleanPriceString(s)).filter(Boolean);
        if (parts.length > 0) {
          tpList.push(...parts);
        } else {
          tpList.push(cleanPriceString(rawTP));
        }
      } else {
        tpList.push('Mục tiêu 1:2');
      }
    }

    // 8. Event
    const event = fieldsMap.get('event') || fieldsMap.get('sự kiện') || 'Entry';

    return {
      symbol,
      market,
      direction,
      entry,
      stopLoss,
      takeProfit: tpList,
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

    const VIP_CHANNELS = new Set([
      '1450669768884617247', // XAU / Vàng
      '1416343865752817664', // BTC (Low TF)
      '1418660997425528973', // ETH (High TF)
    ]);

    const isVipChannel = payload.channel_id && VIP_CHANNELS.has(payload.channel_id);
    const isVipSymbol = /XAU|GOLD|BTC|ETH/i.test(parsedSignal.symbol || '');
    const isM1 = payload.channel_id === '1428795313014968522' || parsedSignal.timeframe?.toLowerCase() === 'm1';

    const tier: 'VIP' | 'M1' = (isVipChannel || (isVipSymbol && !isM1)) ? 'VIP' : 'M1';

    const now = Date.now();
    const isFullTP = /full\s*tp/i.test(parsedSignal.note || '');

    const finalSignal: SignalData = {
      id: `sig_discord_${now}_${Math.random().toString(36).substring(2, 7)}`,
      symbol: parsedSignal.symbol,
      market: parsedSignal.market || 'CRYPTO',
      direction: parsedSignal.direction,
      entry: parsedSignal.entry || 'Thị giá',
      stopLoss: parsedSignal.stopLoss || 'Cắt lỗ kỹ thuật',
      takeProfit: parsedSignal.takeProfit || ['Chốt lời R:R 1:2'],
      timeframe: parsedSignal.timeframe || (isM1 ? 'm1' : '15m'),
      note: parsedSignal.note || (tier === 'VIP' ? 'Kèo VIP winrate cao (Phòng Vàng/BTC/ETH)' : 'Kèo lướt nhanh phòng M1 Scalp'),
      source: tier === 'VIP' ? 'Trading-Bot (VIP Vàng/BTC/ETH)' : 'Trading-Bot (M1 Scalp)',
      isDemo: false,
      channelId: payload.channel_id || undefined,
      tier,
      createdAt: now,
      expiresAt: isFullTP ? now : now + 30 * 24 * 3600 * 1000, // 30 days if active
      status: isFullTP ? 'FULL_TP' : 'ACTIVE',
    };

    if (isFullTP) {
      // 1. Khi lệnh chạm Full TP -> Đóng tất cả các lệnh trước đó của cặp tiền này
      db.markSignalFullTP(finalSignal.symbol);
      db.insertSignal(finalSignal);

      // Thông báo Full TP trong phòng chơi
      if (this.io) {
        this.io.emit('chat:received', {
          id: 'sig_ann_' + Date.now(),
          senderId: 'SYSTEM',
          senderName: 'Hội Quán Trà Đá',
          senderRole: 'Trà Quán',
          content: `🎯 [FULL TP THẮNG LỚN] Kèo ${finalSignal.symbol} đã hoàn thành mục tiêu Full TP! Chúc mừng các đại hiệp!`,
          timestamp: Date.now(),
          type: 'system',
        });
        this.io.emit('signal:full_tp', finalSignal);
      }

      return { success: true, signal: finalSignal };
    }

    // 1. Insert active signal into SQLite Database (Chưa Full TP thì nhận luôn và giữ active)
    db.insertSignal(finalSignal);

    // 2. Broadcast via Socket.IO to all players
    if (this.io) {
      this.io.emit('signal:new', finalSignal);

      // System announcement in chat
      const chatAnnouncement = tier === 'VIP'
        ? `🔥 [KÈO VIP XỊN] ${finalSignal.symbol} [${finalSignal.direction}] từ phòng VIP! Uống trà tích duyên để Bà Bán Trà soi sổ tay cho nhé!`
        : `⚡ [KÈO LƯỚT M1] ${finalSignal.symbol} [${finalSignal.direction}] từ phòng Scalp! Kèo nhanh cho anh em thích lướt sóng!`;

      this.io.emit('chat:received', {
        id: 'sig_ann_' + Date.now(),
        senderId: 'SYSTEM',
        senderName: 'Hội Quán Trà Đá',
        senderRole: 'Trà Quán',
        content: chatAnnouncement,
        timestamp: Date.now(),
        type: 'system',
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
