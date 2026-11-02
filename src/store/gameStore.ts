import { create } from 'zustand';
import type { PlayerData, ChatMessage, GameSettings } from '../types/game';
import type { SignalData } from '../types/signal';

export interface DialogueOption {
  id: string;
  label: string;
  action: 'signal_request' | 'market_status' | 'tea_order' | 'stories' | 'sitting_chill' | 'close';
}

interface DialogueState {
  isOpen: boolean;
  speaker: string;
  text: string;
  options: DialogueOption[];
  isTyping: boolean;
}

interface GameState {
  // Player & Session
  player: PlayerData | null;
  onlineCount: number;
  onlinePlayers: PlayerData[];

  // Chat
  chatMessages: ChatMessage[];

  // Market Signal
  activeSignal: SignalData | null;
  cooldownRemaining: number;
  nextAllowedAt: number;

  // Dialogue
  dialogue: DialogueState;

  // UI Modals
  isAdminOpen: boolean;
  isCreateModalOpen: boolean;

  // Settings
  settings: GameSettings;

  // Actions
  setPlayer: (player: PlayerData | null) => void;
  setOnlineCount: (count: number) => void;
  setOnlinePlayers: (players: PlayerData[]) => void;
  addRemotePlayer: (player: PlayerData) => void;
  removeRemotePlayer: (playerId: string) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setActiveSignal: (signal: SignalData | null) => void;
  setCooldown: (remaining: number, nextAllowedAt: number) => void;
  openDialogue: (text: string, options?: DialogueOption[]) => void;
  closeDialogue: () => void;
  setDialogueText: (text: string, isTyping?: boolean) => void;
  setIsAdminOpen: (open: boolean) => void;
  setIsCreateModalOpen: (open: boolean) => void;
  toggleSound: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  player: null,
  onlineCount: 1,
  onlinePlayers: [],
  chatMessages: [],
  activeSignal: null,
  cooldownRemaining: 0,
  nextAllowedAt: 0,
  isAdminOpen: false,
  isCreateModalOpen: true,

  dialogue: {
    isOpen: false,
    speaker: 'Bà Bán Trà',
    text: '',
    options: [],
    isTyping: false,
  },

  settings: {
    soundEnabled: true,
    bgmVolume: 0.5,
    sfxVolume: 0.7,
    viewMode: 'third-person',
  },

  setPlayer: (player) => set({ player, isCreateModalOpen: !player }),
  setOnlineCount: (onlineCount) => set({ onlineCount }),
  setOnlinePlayers: (onlinePlayers) => set({ onlinePlayers }),
  addRemotePlayer: (newPlayer) =>
    set((state) => ({
      onlinePlayers: [...state.onlinePlayers.filter((p) => p.id !== newPlayer.id), newPlayer],
    })),
  removeRemotePlayer: (playerId) =>
    set((state) => ({
      onlinePlayers: state.onlinePlayers.filter((p) => p.id !== playerId),
    })),
  addChatMessage: (msg) =>
    set((state) => ({
      chatMessages: [...state.chatMessages.slice(-50), msg],
    })),
  setActiveSignal: (activeSignal) => set({ activeSignal }),
  setCooldown: (cooldownRemaining, nextAllowedAt) => set({ cooldownRemaining, nextAllowedAt }),

  openDialogue: (text, options) =>
    set({
      dialogue: {
        isOpen: true,
        speaker: 'Bà Bán Trà',
        text,
        options: options || [
          { id: '1', label: 'Cô ơi, cho cháu xin một kèo!', action: 'signal_request' },
          { id: '2', label: 'Hôm nay thị trường thế nào cô?', action: 'market_status' },
          { id: '3', label: 'Cho cháu cốc trà đá.', action: 'tea_order' },
          { id: '4', label: 'Cô kể chuyện trader đi!', action: 'stories' },
          { id: '5', label: 'Cháu ngồi hóng thôi.', action: 'sitting_chill' },
          { id: '6', label: 'Tạm biệt cô!', action: 'close' },
        ],
        isTyping: false,
      },
    }),

  closeDialogue: () =>
    set((state) => ({
      dialogue: { ...state.dialogue, isOpen: false },
    })),

  setDialogueText: (text, isTyping = false) =>
    set((state) => ({
      dialogue: { ...state.dialogue, text, isTyping },
    })),

  setIsAdminOpen: (isAdminOpen) => set({ isAdminOpen }),
  setIsCreateModalOpen: (isCreateModalOpen) => set({ isCreateModalOpen }),

  toggleSound: () =>
    set((state) => ({
      settings: { ...state.settings, soundEnabled: !state.settings.soundEnabled },
    })),
}));
