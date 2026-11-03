import { io, Socket } from 'socket.io-client';
import type { PlayerData, PlayerRole, AvatarConfig, ChatMessage } from '../types/game';
import type { SignalDecisionResult } from '../types/signal';

export interface MultiplayerCallbacks {
  onRoomState: (data: { self: PlayerData; players: PlayerData[]; onlineCount: number }) => void;
  onPlayerJoined: (player: PlayerData) => void;
  onPlayerMoved: (data: {
    id: string;
    position: { x: number; y: number; z: number };
    rotationY: number;
    isMoving: boolean;
    isRunning: boolean;
    isSitting?: boolean;
  }) => void;
  onPlayerLeft: (data: { playerId: string }) => void;
  onPlayerSat: (data: { id: string; isSitting: boolean; position: { x: number; y: number; z: number } }) => void;
  onPlayerEmoted: (data: { id: string; emote: string }) => void;
  onChatMessage: (message: ChatMessage) => void;
  onSignalResponse: (result: SignalDecisionResult) => void;
  onNpcSpeech: (data: { speaker: string; text: string; allowed: boolean; targetNickname: string }) => void;
  onThayDoSpeech?: (data: { speaker: string; text: string; allowed: boolean; targetNickname: string }) => void;
  onNpcDialogueReply: (data: { speaker: string; text: string; action: string }) => void;
  onOnlineCount: (count: number) => void;
  onErrorJoin: (data: { message: string }) => void;
  onCreditsUpdate?: (data: { playerId?: string; credits: number; teaCount: number; cost: number; action: string; message: string }) => void;
  onGoldUpdate?: (data: {
    price: number;
    change?: number;
    changePercent?: number;
    candles?: { o: number; h: number; l: number; c: number }[];
  }) => void;
  onMarketTickers?: (tickers: Record<string, any>) => void;
  // WebRTC Voice Chat Callbacks
  onVoicePeerJoined?: (data: { peerId: string; socketId: string; nickname: string }) => void;
  onVoiceSignal?: (data: { fromSocketId: string; fromPlayerId: string; signal: any }) => void;
  onVoicePlayerSpeaking?: (data: { playerId: string; isSpeaking: boolean }) => void;
  onVoicePeerLeft?: (data: { peerId: string; socketId: string }) => void;
}

export class MultiplayerService {
  private socket: Socket | null = null;
  private callbacks: Partial<MultiplayerCallbacks> = {};
  private lastMoveSentTime = 0;

  public connect(
    playerInfo: { sessionId: string; nickname: string; role: PlayerRole; avatar: AvatarConfig },
    callbacks: Partial<MultiplayerCallbacks>
  ) {
    this.callbacks = callbacks;

    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      this.socket?.emit('player:join', playerInfo);
    });

    this.socket.on('room:state', (data) => {
      this.callbacks.onRoomState?.(data);
    });

    this.socket.on('player:joined', (player) => {
      this.callbacks.onPlayerJoined?.(player);
    });

    this.socket.on('player:moved', (data) => {
      this.callbacks.onPlayerMoved?.(data);
    });

    this.socket.on('player:left', (data) => {
      this.callbacks.onPlayerLeft?.(data);
    });

    this.socket.on('player:sat', (data) => {
      this.callbacks.onPlayerSat?.(data);
    });

    this.socket.on('player:emoted', (data) => {
      this.callbacks.onPlayerEmoted?.(data);
    });

    this.socket.on('chat:message', (msg) => {
      this.callbacks.onChatMessage?.(msg);
    });

    this.socket.on('signal:response', (result) => {
      this.callbacks.onSignalResponse?.(result);
    });

    this.socket.on('npc:speech', (data) => {
      this.callbacks.onNpcSpeech?.(data);
    });

    this.socket.on('thay_do:speech', (data) => {
      this.callbacks.onThayDoSpeech?.(data);
    });

    this.socket.on('npc:dialogue_reply', (data) => {
      this.callbacks.onNpcDialogueReply?.(data);
    });

    this.socket.on('room:online_count', (data) => {
      this.callbacks.onOnlineCount?.(data.count);
    });

    this.socket.on('error:join', (data) => {
      this.callbacks.onErrorJoin?.(data);
    });

    this.socket.on('player:credits_update', (data) => {
      this.callbacks.onCreditsUpdate?.(data);
    });

    this.socket.on('gold:update', (data) => {
      this.callbacks.onGoldUpdate?.(data);
    });

    this.socket.on('market:tickers', (data) => {
      this.callbacks.onMarketTickers?.(data);
    });

    // WebRTC Voice Chat Listeners
    this.socket.on('voice:peer_joined', (data) => {
      this.callbacks.onVoicePeerJoined?.(data);
    });

    this.socket.on('voice:signal', (data) => {
      this.callbacks.onVoiceSignal?.(data);
    });

    this.socket.on('voice:player_speaking', (data) => {
      this.callbacks.onVoicePlayerSpeaking?.(data);
    });

    this.socket.on('voice:peer_left', (data) => {
      this.callbacks.onVoicePeerLeft?.(data);
    });
  }

  public getSocket(): Socket | null {
    return this.socket;
  }

  public joinVoice() {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('voice:join');
  }

  public sendVoiceSignal(toPlayerId: string, signal: unknown, toSocketId?: string) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('voice:signal', { toPlayerId, toSocketId, signal });
  }

  public sendVoiceSpeaking(isSpeaking: boolean) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('voice:speaking', { isSpeaking });
  }

  public leaveVoice() {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('voice:leave');
  }

  public sendMove(
    position: { x: number; y: number; z: number },
    rotationY: number,
    isMoving: boolean,
    isRunning: boolean,
    isSitting?: boolean
  ) {
    if (!this.socket || !this.socket.connected) return;

    // Rate-limit movement packets to max ~30 updates/sec
    const now = performance.now();
    if (now - this.lastMoveSentTime < 32 && !isMoving) return;
    this.lastMoveSentTime = now;

    this.socket.emit('player:move', {
      x: position.x,
      y: position.y,
      z: position.z,
      rotationY,
      isMoving,
      isRunning,
      isSitting,
    });
  }

  public sendSit(isSitting: boolean, chairPos?: { x: number; y: number; z: number }) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('player:sit', { isSitting, chairPos });
  }

  public sendEmote(emote: 'wave' | 'laugh' | 'sip_tea' | 'shrug' | 'cheer') {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('player:emote', { emote });
  }

  public sendChat(text: string) {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('chat:send', { text });
  }

  public interactNpc(action: 'signal_request' | 'market_status' | 'tea_order' | 'stories' | 'sitting_chill') {
    if (!this.socket || !this.socket.connected) return;
    this.socket.emit('npc:interact', { action });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const multiplayerService = new MultiplayerService();

