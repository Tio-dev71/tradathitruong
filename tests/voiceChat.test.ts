import { describe, it, expect } from 'vitest';
import { activePlayersStore } from '../src/server/socket/multiplayerHandler';
import type { PlayerData } from '../src/types/game';

describe('WebRTC Proximity Voice Chat Backend Signaling', () => {
  it('correctly maps and retrieves socketId by playerId for WebRTC signaling', () => {
    const socketId = 'sock_test_voice_1';
    const testPlayer: PlayerData = {
      id: 'session_voice_user_1',
      nickname: 'Trader Trà Đá',
      role: 'Cao Thủ Đu Đỉnh',
      avatar: { hair: 'short', skinTone: '#fcd5b5', outfitColor: '#2e86de', pantsColor: '#2c3e50', hairColor: '#1a1a1a' },
      position: { x: 0, y: 0, z: 0 },
      rotationY: 0,
      isMoving: false,
      isRunning: false,
      isSitting: false,
      joinedAt: Date.now(),
      credits: 100,
      teaCount: 0,
    };

    activePlayersStore.addPlayer(socketId, testPlayer);

    const retrievedSocket = activePlayersStore.getSocketIdByPlayerId('session_voice_user_1');
    expect(retrievedSocket).toBe(socketId);

    const nonExistent = activePlayersStore.getSocketIdByPlayerId('non_existent_id');
    expect(nonExistent).toBeUndefined();

    // Clean up
    activePlayersStore.removePlayer(socketId);
    expect(activePlayersStore.getSocketIdByPlayerId('session_voice_user_1')).toBeUndefined();
  });
});
