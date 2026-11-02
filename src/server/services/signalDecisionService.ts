import crypto from 'crypto';
import { db } from '../db/database';
import { dialogueService } from './dialogueService';
import { signalProviderManager } from './signalProvider';
import type { SignalDecisionResult } from '../../types/signal';
import type { PlayerRole } from '../../types/game';

interface CooldownEntry {
  lastRequestedAt: number;
  nextAllowedAt: number;
}

export class SignalDecisionService {
  private playerCooldowns = new Map<string, CooldownEntry>();

  public getAcceptRate(): number {
    const rateStr = db.getConfig('acceptRate');
    const rate = rateStr ? parseFloat(rateStr) : 0.8;
    return isNaN(rate) ? 0.8 : Math.max(0, Math.min(1, rate));
  }

  public getCooldownSeconds(): number {
    const cdStr = db.getConfig('cooldownSeconds');
    const cd = cdStr ? parseInt(cdStr, 10) : 60;
    return isNaN(cd) ? 60 : Math.max(5, cd);
  }

  public checkCooldown(playerId: string): { onCooldown: boolean; remainingSeconds: number; nextAllowedAt: number } {
    const now = Date.now();
    const entry = this.playerCooldowns.get(playerId);
    if (!entry) {
      return { onCooldown: false, remainingSeconds: 0, nextAllowedAt: now };
    }

    if (now < entry.nextAllowedAt) {
      const remainingSeconds = Math.ceil((entry.nextAllowedAt - now) / 1000);
      return { onCooldown: true, remainingSeconds, nextAllowedAt: entry.nextAllowedAt };
    }

    return { onCooldown: false, remainingSeconds: 0, nextAllowedAt: now };
  }

  public async requestSignal(playerId: string, role: PlayerRole = 'Trader Tập Sự'): Promise<SignalDecisionResult> {
    const now = Date.now();
    const cooldownSec = this.getCooldownSeconds();

    // Check cooldown
    const cooldownCheck = this.checkCooldown(playerId);
    if (cooldownCheck.onCooldown) {
      return {
        allowed: false,
        npcQuote: `Vội gì thế cháu! Uống xong chén trà đã, còn ${cooldownCheck.remainingSeconds} giây nữa cô mới mở lại sổ tay nhé!`,
        cooldownSeconds: cooldownSec,
        remainingCooldown: cooldownCheck.remainingSeconds,
        nextAllowedAt: cooldownCheck.nextAllowedAt,
      };
    }

    // Server-side cryptographically secure random 80/20 decision
    const acceptRate = this.getAcceptRate();
    // Generate an integer between 0 and 9999
    const randomVal = crypto.randomInt(0, 10000);
    const threshold = Math.round(acceptRate * 10000);
    const isAllowed = randomVal < threshold;

    // Set cooldown immediately
    const nextAllowedAt = now + cooldownSec * 1000;
    this.playerCooldowns.set(playerId, {
      lastRequestedAt: now,
      nextAllowedAt,
    });

    if (!isAllowed) {
      const rejectQuote = dialogueService.getSignalRejectQuote();
      db.logSignalRequest(playerId, role, false, rejectQuote);
      return {
        allowed: false,
        npcQuote: rejectQuote,
        cooldownSeconds: cooldownSec,
        remainingCooldown: cooldownSec,
        nextAllowedAt,
      };
    }

    // 80% Case: Bà đồng ý
    const provider = signalProviderManager.getActiveProvider();
    const signal = await provider.getAvailableSignal(role);

    let npcQuote = dialogueService.getSignalAcceptQuote();

    if (!signal) {
      // Bà đồng ý nhưng provider không có tín hiệu (ví dụ Webhook rỗng)
      npcQuote = 'Cô soi rồi mà chưa thấy kèo nào rõ cả, giữ vốn cũng là một kèo đấy cháu!';
      db.logSignalRequest(playerId, role, true, npcQuote, undefined);
      return {
        allowed: true,
        npcQuote,
        cooldownSeconds: cooldownSec,
        remainingCooldown: cooldownSec,
        nextAllowedAt,
      };
    }

    db.logSignalRequest(playerId, role, true, npcQuote, signal.id);

    return {
      allowed: true,
      npcQuote,
      signal,
      cooldownSeconds: cooldownSec,
      remainingCooldown: cooldownSec,
      nextAllowedAt,
    };
  }

  public resetCooldown(playerId: string) {
    this.playerCooldowns.delete(playerId);
  }
}

export const signalDecisionService = new SignalDecisionService();
