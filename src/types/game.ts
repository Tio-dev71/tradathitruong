export type PlayerRole =
  | 'Trader Tập Sự'
  | 'Thợ Săn Kèo'
  | 'Cao Thủ Đu Đỉnh'
  | 'Chiến Thần Bắt Đáy'
  | 'Nhà Tiên Tri Nến'
  | 'Ông Chú Ngồi Hóng'
  | 'Cá Mập Giả Nghèo';

export interface AvatarConfig {
  gender: 'male' | 'female' | 'neutral';
  hairStyle: 'short' | 'spiky' | 'bob' | 'bun' | 'ponytail';
  hairColor: string;
  outfitColor: string;
  pantsColor: string;
  skinTone: string;
  accessory?: 'glasses' | 'cap' | 'none';
}

export interface PlayerData {
  id: string; // guest session id or socket id
  nickname: string;
  role: PlayerRole;
  avatar: AvatarConfig;
  position: { x: number; y: number; z: number };
  rotationY: number;
  isMoving: boolean;
  isRunning: boolean;
  isSitting: boolean;
  currentEmote?: string;
  joinedAt: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  nickname: string;
  role: PlayerRole;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  bgmVolume: number;
  sfxVolume: number;
  viewMode: 'third-person' | 'first-person' | 'top-down';
}

