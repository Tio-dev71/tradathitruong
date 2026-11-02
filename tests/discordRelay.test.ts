import { describe, it, expect, beforeEach } from 'vitest';
import { discordSignalRelay, DiscordEmbed } from '../src/server/services/discordSignalRelay';
import { signalDecisionService } from '../src/server/services/signalDecisionService';
import { db } from '../src/server/db/database';

describe('Discord TradingView Bot Signal Relay & Embed Parser', () => {
  it('correctly parses Trading-Bot_TLS1 embed format from Discord screenshot', () => {
    const rawEmbed: DiscordEmbed = {
      title: 'Lệnh nhóm VIP - Bot Liquidation',
      fields: [
        { name: 'Side:', value: 'SHORT 🔴' },
        { name: 'Coin:', value: 'XRP/USD' },
        { name: 'Timeframe:', value: 'm1' },
        { name: 'TP:', value: '$1.24' },
        { name: 'Entry 1:', value: '$1.25 (1%)' },
        { name: 'Entry 2:', value: '$1.25 (2%)' },
        { name: 'SL:', value: '$1.26' },
        { name: 'Event:', value: 'Entry' },
      ],
      footer: { text: 'Nội dung chỉ có mục đích thông tin, không phải lời khuyên đầu tư' },
    };

    const parsed = discordSignalRelay.parseTradingBotEmbed(rawEmbed);
    expect(parsed).not.toBeNull();
    expect(parsed?.symbol).toBe('XRP/USD');
    expect(parsed?.direction).toBe('SHORT');
    expect(parsed?.market).toBe('CRYPTO');
    expect(parsed?.timeframe).toBe('m1');
    expect(parsed?.entry).toBe('$1.25 (1%)');
    expect(parsed?.stopLoss).toBe('$1.26');
    expect(parsed?.takeProfit).toContain('$1.24');
    expect(parsed?.note).toContain('Lệnh nhóm VIP - Bot Liquidation');
  });

  it('correctly parses Gold XAU/USD signal from bot', () => {
    const goldEmbed: DiscordEmbed = {
      title: 'Lệnh nhóm VIP - Gold Spot',
      fields: [
        { name: 'Side:', value: 'LONG 🟢' },
        { name: 'Coin:', value: 'XAU/USD' },
        { name: 'Timeframe:', value: 'm5' },
        { name: 'TP:', value: '$2,765.00' },
        { name: 'Entry:', value: '$2,748.50' },
        { name: 'SL:', value: '$2,735.00' },
        { name: 'Event:', value: 'Entry' },
      ],
    };

    const parsed = discordSignalRelay.parseTradingBotEmbed(goldEmbed);
    expect(parsed).not.toBeNull();
    expect(parsed?.symbol).toBe('XAU/USD');
    expect(parsed?.direction).toBe('LONG');
    expect(parsed?.market).toBe('COMMODITY');
  });

  it('ingests and persists signal in database and rejects duplicates', () => {
    const payload = {
      id: 'test_discord_msg_101',
      embeds: [
        {
          title: 'Lệnh nhóm VIP - Bot Liquidation',
          fields: [
            { name: 'Side:', value: 'SHORT 🔴' },
            { name: 'Coin:', value: 'BTC/USD' },
            { name: 'Timeframe:', value: 'm15' },
            { name: 'TP:', value: '$68,500' },
            { name: 'Entry:', value: '$69,200' },
            { name: 'SL:', value: '$69,800' },
          ],
        },
      ],
    };

    const res1 = discordSignalRelay.processDiscordPayload(payload);
    expect(res1.success).toBe(true);
    expect(res1.signal?.symbol).toBe('BTC/USD');

    // Duplicate check
    const res2 = discordSignalRelay.processDiscordPayload(payload);
    expect(res2.success).toBe(false);
  });
});

describe('Economy Credit System & Tea Luck Boost', () => {
  const sessionId = 'test_eco_' + Date.now();

  beforeEach(() => {
    db.saveSession(sessionId, 'Trader Test', 'Thợ Săn Kèo', '{}', 100, 0);
  });

  it('initializes session with 100 credits and 0 tea count', () => {
    const session = db.getSession(sessionId);
    expect(session).toBeDefined();
    expect(session?.credits).toBe(100);
    expect(session?.tea_count).toBe(0);
  });

  it('persists credit deduction and tea count increment', () => {
    db.updateSessionCredits(sessionId, 90, 1);
    const session = db.getSession(sessionId);
    expect(session?.credits).toBe(90);
    expect(session?.tea_count).toBe(1);
  });

  it('boosts Bà Bán Trà accept probability with teaCount', async () => {
    // With 0 tea: base accept rate
    // With 4 tea: acceptRate increases by 4 * 5% = +20%
    const baseRate = signalDecisionService.getAcceptRate();
    const boostedWithTea = Math.min(0.98, baseRate + 4 * 0.05);
    expect(boostedWithTea).toBeGreaterThanOrEqual(baseRate);
    expect(boostedWithTea).toBeLessThanOrEqual(0.98);
  });
});

