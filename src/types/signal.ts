export type MarketType = 'CRYPTO' | 'FOREX' | 'VN_STOCK' | 'COMMODITY';
export type SignalDirection = 'LONG' | 'SHORT' | 'WAIT';
export type SignalStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

export interface SignalData {
  id: string;
  symbol: string;
  market: MarketType;
  direction: SignalDirection;
  entry: string;
  stopLoss: string;
  takeProfit: string[];
  timeframe: string;
  note: string;
  source: 'MOCK_ENGINE' | 'WEBHOOK' | 'DISCORD' | string;
  isDemo: boolean;
  createdAt: number;
  expiresAt: number;
  status: SignalStatus;
}

export interface SignalRequestPayload {
  playerId: string;
  role: string;
  nickname: string;
}

export interface SignalDecisionResult {
  allowed: boolean; // 80% true, 20% false
  npcQuote: string;
  signal?: SignalData;
  cooldownSeconds: number;
  remainingCooldown?: number;
  nextAllowedAt: number;
}

export interface WebhookSignalPayload {
  eventId: string;
  timestamp: number;
  symbol: string;
  market: MarketType;
  direction: SignalDirection;
  entry: string;
  stopLoss: string;
  takeProfit: string[];
  timeframe: string;
  note?: string;
  expiresInMinutes?: number;
}

export interface AdminStats {
  onlineCount: number;
  activePlayers: { id: string; nickname: string; role: string; ip?: string; joinedAt: number }[];
  acceptRate: number; // e.g. 0.8
  cooldownSeconds: number;
  totalRequests: number;
  totalAccepted: number;
  totalRejected: number;
  providerMode: 'MOCK' | 'WEBHOOK';
  signals: SignalData[];
  webhookLogs: { eventId: string; status: 'SUCCESS' | 'ERROR'; reason?: string; timestamp: number }[];
}

