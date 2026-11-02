import { describe, it, expect, beforeEach } from 'vitest';
import { signalDecisionService } from '../src/server/services/signalDecisionService';
import { db } from '../src/server/db/database';

describe('SignalDecisionService & 80/20 Logic', () => {
  beforeEach(() => {
    // Reset config to 80/20 and 60s cooldown
    db.setConfig('acceptRate', '0.8');
    db.setConfig('cooldownSeconds', '60');
    signalDecisionService.resetCooldown('test_player_1');
    signalDecisionService.resetCooldown('test_player_2');
  });

  it('enforces cooldown after a request', async () => {
    const res1 = await signalDecisionService.requestSignal('test_player_1', 'Trader Tập Sự');
    expect(res1).toBeDefined();
    expect(res1.cooldownSeconds).toBe(60);

    // Immediate second call should be blocked by cooldown
    const res2 = await signalDecisionService.requestSignal('test_player_1', 'Trader Tập Sự');
    expect(res2.allowed).toBe(false);
    expect(res2.remainingCooldown).toBeGreaterThan(0);
    expect(res2.npcQuote).toContain('Vội gì thế cháu');
  });

  it('respects configurable acceptRate (0% refuse all, 100% accept all)', async () => {
    // Test 100% accept
    db.setConfig('acceptRate', '1.0');
    signalDecisionService.resetCooldown('p_100');
    const accepted = await signalDecisionService.requestSignal('p_100', 'Cao Thủ Đu Đỉnh');
    expect(accepted.allowed).toBe(true);
    expect(accepted.signal).toBeDefined();
    expect(accepted.signal?.isDemo).toBe(true);

    // Test 0% accept
    db.setConfig('acceptRate', '0.0');
    signalDecisionService.resetCooldown('p_0');
    const rejected = await signalDecisionService.requestSignal('p_0', 'Thợ Săn Kèo');
    expect(rejected.allowed).toBe(false);
    expect(rejected.signal).toBeUndefined();
  });

  it('statistically converges near 80% with large sample when acceptRate is 0.8', async () => {
    db.setConfig('acceptRate', '0.8');
    let acceptedCount = 0;
    const trials = 500;

    for (let i = 0; i < trials; i++) {
      const pid = `stat_player_${i}`;
      signalDecisionService.resetCooldown(pid);
      const res = await signalDecisionService.requestSignal(pid, 'Chiến Thần Bắt Đáy');
      if (res.allowed) {
        acceptedCount++;
      }
    }

    const empiricalRatio = acceptedCount / trials;
    // For 500 samples with p=0.8, standard deviation is ~0.018. 99.7% of runs fall between 0.73 and 0.87.
    expect(empiricalRatio).toBeGreaterThan(0.70);
    expect(empiricalRatio).toBeLessThan(0.90);
  });
});
