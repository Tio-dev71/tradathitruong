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

  it('tags VIP channels and M1 scalp channels with correct tier', () => {
    // 1. VIP room: Gold (1450669768884617247)
    const vipGold = discordSignalRelay.processDiscordPayload({
      id: 'test_vip_gold_' + Date.now(),
      channel_id: '1450669768884617247',
      content: 'Coin: XAU/USD\nSide: LONG 🟢\nEntry: 2750\nTP: 2770\nSL: 2735',
    });
    expect(vipGold.success).toBe(true);
    expect(vipGold.signal?.tier).toBe('VIP');

    // 2. VIP room: BTC (1416343865752817664)
    const vipBtc = discordSignalRelay.processDiscordPayload({
      id: 'test_vip_btc_' + Date.now(),
      channel_id: '1416343865752817664',
      content: 'Coin: BTC/USD\nSide: SHORT 🔴\nEntry: 88000\nTP: 86000\nSL: 89000',
    });
    expect(vipBtc.success).toBe(true);
    expect(vipBtc.signal?.tier).toBe('VIP');

    // 3. M1 room: 1428795313014968522
    const m1Scalp = discordSignalRelay.processDiscordPayload({
      id: 'test_m1_scalp_' + Date.now(),
      channel_id: '1428795313014968522',
      content: 'Coin: XRP/USD\nSide: LONG 🟢\nTimeframe: m1\nEntry: 1.25\nTP: 1.28\nSL: 1.23',
    });
    expect(m1Scalp.success).toBe(true);
    expect(m1Scalp.signal?.tier).toBe('M1');
  });

  it('keeps trades active if not Full TP (Entry or 2/3 TP) and marks FULL_TP when Full TP arrives', () => {
    // 1. Entry event -> ACTIVE
    const entryRes = discordSignalRelay.processDiscordPayload({
      id: 'test_lifecycle_entry_' + Date.now(),
      embeds: [
        {
          title: 'Lệnh nhóm VIP - Bot Liquidation',
          fields: [
            { name: 'Side:', value: 'SHORT 🔴' },
            { name: 'Coin:', value: 'ADA/USD' },
            { name: 'Timeframe:', value: 'm1' },
            { name: 'TP:', value: '$0.70' },
            { name: 'Entry:', value: '$0.75' },
            { name: 'SL:', value: '$0.78' },
            { name: 'Event:', value: 'Entry' },
          ],
        },
      ],
    });
    expect(entryRes.success).toBe(true);
    expect(entryRes.signal?.status).toBe('ACTIVE');

    // Should be returned by getActiveSignals
    const activeBefore = db.getActiveSignals(20);
    const adaActive = activeBefore.find((s) => s.symbol === 'ADA/USD');
    expect(adaActive).toBeDefined();
    expect(adaActive?.status).toBe('ACTIVE');

    // 2. Full TP event -> marks prior trades as FULL_TP
    const fullTpRes = discordSignalRelay.processDiscordPayload({
      id: 'test_lifecycle_fulltp_' + Date.now(),
      embeds: [
        {
          title: 'Lệnh nhóm VIP - Bot Liquidation',
          fields: [
            { name: 'Side:', value: 'SHORT 🔴' },
            { name: 'Coin:', value: 'ADA/USD' },
            { name: 'Timeframe:', value: 'm1' },
            { name: 'TP:', value: '$0.70' },
            { name: 'Entry:', value: '$0.75' },
            { name: 'SL:', value: '$0.78' },
            { name: 'Event:', value: 'Full TP' },
          ],
        },
      ],
    });
    expect(fullTpRes.success).toBe(true);
    expect(fullTpRes.signal?.status).toBe('FULL_TP');

    // In getActiveSignals, ADA/USD should no longer appear
    const activeAfter = db.getActiveSignals(20);
    const adaActiveAfter = activeAfter.find((s) => s.symbol === 'ADA/USD');
    expect(adaActiveAfter).toBeUndefined();
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

