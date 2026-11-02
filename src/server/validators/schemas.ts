import { z } from 'zod';

export const PlayerRoleSchema = z.enum([
  'Trader Tập Sự',
  'Thợ Săn Kèo',
  'Cao Thủ Đu Đỉnh',
  'Chiến Thần Bắt Đáy',
  'Nhà Tiên Tri Nến',
  'Ông Chú Ngồi Hóng',
  'Cá Mập Giả Nghèo',
]);

export const AvatarConfigSchema = z.object({
  gender: z.enum(['male', 'female', 'neutral']),
  hairStyle: z.enum(['short', 'spiky', 'bob', 'bun', 'ponytail']),
  hairColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  outfitColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pantsColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  skinTone: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  accessory: z.enum(['glasses', 'cap', 'none']).optional(),
});

export const PlayerJoinSchema = z.object({
  sessionId: z.string().min(6).max(64),
  nickname: z.string().trim().min(1).max(20),
  role: PlayerRoleSchema,
  avatar: AvatarConfigSchema,
});

export const PlayerMoveSchema = z.object({
  x: z.number().min(-100).max(100),
  y: z.number().min(-10).max(20),
  z: z.number().min(-100).max(100),
  rotationY: z.number(),
  isMoving: z.boolean(),
  isRunning: z.boolean(),
  isSitting: z.boolean().optional(),
});

export const ChatSendSchema = z.object({
  text: z.string().trim().min(1).max(200),
});

export const EmoteSendSchema = z.object({
  emote: z.enum(['wave', 'laugh', 'sip_tea', 'shrug', 'cheer']),
});

export const SignalRequestSchema = z.object({
  role: PlayerRoleSchema.optional(),
});

export const WebhookSignalInputSchema = z.object({
  eventId: z.string().min(5).max(128),
  timestamp: z.number().int().positive(),
  symbol: z.string().min(2).max(30),
  market: z.enum(['CRYPTO', 'FOREX', 'VN_STOCK', 'COMMODITY']),
  direction: z.enum(['LONG', 'SHORT', 'WAIT']),
  entry: z.string().min(1).max(50),
  stopLoss: z.string().min(1).max(50),
  takeProfit: z.array(z.string().min(1).max(50)).min(1),
  timeframe: z.string().min(1).max(20),
  note: z.string().max(500).optional(),
  expiresInMinutes: z.number().int().positive().max(10080).optional(),
});

export const AdminConfigUpdateSchema = z.object({
  acceptRate: z.number().min(0).max(1).optional(),
  cooldownSeconds: z.number().int().min(5).max(3600).optional(),
  providerMode: z.enum(['MOCK', 'WEBHOOK']).optional(),
  maxPlayers: z.number().int().min(5).max(100).optional(),
});

