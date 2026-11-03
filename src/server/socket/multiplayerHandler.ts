import { Server as SocketIOServer, Socket } from 'socket.io';
import { db } from '../db/database';
import {
  PlayerJoinSchema,
  PlayerMoveSchema,
  ChatSendSchema,
  EmoteSendSchema,
} from '../validators/schemas';
import { signalDecisionService } from '../services/signalDecisionService';
import { dialogueService } from '../services/dialogueService';
import type { PlayerData, ChatMessage } from '../../types/game';

class ActivePlayersStore {
  private players = new Map<string, PlayerData>(); // socketId -> PlayerData
  private socketToSession = new Map<string, string>(); // socketId -> sessionId
  private lastMoveTimes = new Map<string, number>();

  public addPlayer(socketId: string, player: PlayerData) {
    this.players.set(socketId, player);
    this.socketToSession.set(socketId, player.id);
  }

  public removePlayer(socketId: string): PlayerData | undefined {
    const p = this.players.get(socketId);
    this.players.delete(socketId);
    this.socketToSession.delete(socketId);
    this.lastMoveTimes.delete(socketId);
    return p;
  }

  public getPlayerBySocket(socketId: string): PlayerData | undefined {
    return this.players.get(socketId);
  }

  public getOnlinePlayers(): PlayerData[] {
    return Array.from(this.players.values());
  }

  public updatePlayerMove(
    socketId: string,
    move: { x: number; y: number; z: number; rotationY: number; isMoving: boolean; isRunning: boolean; isSitting?: boolean }
  ): boolean {
    const player = this.players.get(socketId);
    if (!player) return false;

    const now = Date.now();
    const lastTime = this.lastMoveTimes.get(socketId) || now;
    const dt = Math.max(0.016, (now - lastTime) / 1000);
    this.lastMoveTimes.set(socketId, now);

    // Speed check (Max running speed is ~8 units/sec; allow up to 14 units/sec for network lag compensation)
    const dx = move.x - player.position.x;
    const dz = move.z - player.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    const speed = dist / dt;

    if (dist > 0.1 && speed > 20) {
      // Suspected teleport or speed hack; clamp or reject
      return false;
    }

    player.position = { x: move.x, y: move.y, z: move.z };
    player.rotationY = move.rotationY;
    player.isMoving = move.isMoving;
    player.isRunning = move.isRunning;
    if (move.isSitting !== undefined) {
      player.isSitting = move.isSitting;
    }

    return true;
  }
}

export const activePlayersStore = new ActivePlayersStore();

let ioInstance: SocketIOServer | null = null;

export function broadcastCreditUpdate(sessionId: string, newCredits: number, creditsAdded: number) {
  const online = activePlayersStore.getOnlinePlayers();
  const player = online.find((p) => p.id === sessionId);
  if (player) {
    player.credits = newCredits;
  }

  if (ioInstance) {
    ioInstance.emit('player:credits_update', {
      playerId: sessionId,
      credits: newCredits,
      teaCount: player?.teaCount ?? 0,
      cost: 0,
      action: 'topup',
      message: `🎉 Nạp thành công +${creditsAdded} Xu! Số dư hiện tại: ${newCredits} Xu.`,
    });

    ioInstance.emit('chat:received', {
      id: `topup_${Date.now()}`,
      senderId: 'SYSTEM',
      senderName: 'Hội Quán Trà Đá',
      senderRole: 'Trà Quán',
      content: `🎉 ${player ? player.nickname : 'Đại gia'} vừa nạp thành công ${creditsAdded} Xu! Tha hồ gọi trà đá và xin quẻ!`,
      timestamp: Date.now(),
      type: 'system',
    });
  }
}

export function setupMultiplayerSocket(io: SocketIOServer) {
  ioInstance = io;
  io.on('connection', (socket: Socket) => {
    // 1. Join game room
    socket.on('player:join', (rawData: unknown) => {
      const parseResult = PlayerJoinSchema.safeParse(rawData);
      if (!parseResult.success) {
        socket.emit('error:join', { message: 'Dữ liệu nhân vật không hợp lệ', errors: parseResult.error.format() });
        return;
      }

      const { sessionId, nickname, role, avatar } = parseResult.data;

      // Check max players
      const maxPlayers = parseInt(db.getConfig('maxPlayers') || '30', 10);
      if (activePlayersStore.getOnlinePlayers().length >= maxPlayers) {
        socket.emit('error:join', { message: 'Quán trà hôm nay đông quá, đã hết chỗ ngồi! Vui lòng thử lại sau.' });
        return;
      }

      // Check if session already in room (reconnect case): clean up old socket
      const existingPlayers = activePlayersStore.getOnlinePlayers();
      for (const p of existingPlayers) {
        if (p.id === sessionId) {
          // Player already connected on another tab or reconnecting
          io.emit('player:left', { playerId: p.id });
        }
      }

      // Check if session exists in DB to restore credits & tea stats
      const existingSession = db.getSession(sessionId);
      const credits = existingSession ? existingSession.credits : 100;
      const teaCount = existingSession ? existingSession.tea_count : 0;

      // Save session to SQLite
      db.saveSession(sessionId, nickname, role, JSON.stringify(avatar), credits, teaCount);

      // Initial spawn position: Right in front of the Vietnamese Welcome Arch (Cổng Chào)
      const spawnX = -15 + (Math.random() * 1.2 - 0.6);
      const spawnZ = 4 + (Math.random() * 1.4 - 0.7);

      const playerData: PlayerData = {
        id: sessionId,
        nickname,
        role,
        avatar,
        position: { x: spawnX, y: 0, z: spawnZ },
        rotationY: Math.PI / 2, // Facing along +X down the sidewalk towards the tea stall
        isMoving: false,
        isRunning: false,
        isSitting: false,
        joinedAt: Date.now(),
        credits,
        teaCount,
      };

      activePlayersStore.addPlayer(socket.id, playerData);

      // Send existing players to new player
      const otherPlayers = activePlayersStore.getOnlinePlayers().filter((p) => p.id !== sessionId);
      socket.emit('room:state', {
        self: playerData,
        players: otherPlayers,
        onlineCount: activePlayersStore.getOnlinePlayers().length,
      });

      // Broadcast to others that new player joined
      socket.broadcast.emit('player:joined', playerData);
      io.emit('room:online_count', { count: activePlayersStore.getOnlinePlayers().length });

      // Send system welcome chat
      const welcomeChat: ChatMessage = {
        id: 'msg_' + Date.now(),
        playerId: 'system',
        nickname: 'Quán Trà Đá',
        role: 'Ông Chú Ngồi Hóng',
        text: `${nickname} (${role}) vừa ghé quán làm chén trà!`,
        timestamp: Date.now(),
        isSystem: true,
      };
      io.emit('chat:message', welcomeChat);
    });

    // 2. Player movement
    socket.on('player:move', (rawMove: unknown) => {
      const parseResult = PlayerMoveSchema.safeParse(rawMove);
      if (!parseResult.success) return;

      const player = activePlayersStore.getPlayerBySocket(socket.id);
      if (!player) return;

      const valid = activePlayersStore.updatePlayerMove(socket.id, parseResult.data);
      if (valid) {
        socket.broadcast.emit('player:moved', {
          id: player.id,
          position: player.position,
          rotationY: player.rotationY,
          isMoving: player.isMoving,
          isRunning: player.isRunning,
          isSitting: player.isSitting,
        });
      }
    });

    // 3. Player sit toggle
    socket.on('player:sit', (data: { isSitting: boolean; chairPos?: { x: number; y: number; z: number } }) => {
      const player = activePlayersStore.getPlayerBySocket(socket.id);
      if (!player) return;

      player.isSitting = data.isSitting;
      if (data.isSitting && data.chairPos) {
        player.position = { x: data.chairPos.x, y: data.chairPos.y, z: data.chairPos.z };
      }

      io.emit('player:sat', {
        id: player.id,
        isSitting: player.isSitting,
        position: player.position,
      });
    });

    // 4. Emote
    socket.on('player:emote', (rawEmote: unknown) => {
      const parseResult = EmoteSendSchema.safeParse(rawEmote);
      if (!parseResult.success) return;

      const player = activePlayersStore.getPlayerBySocket(socket.id);
      if (!player) return;

      player.currentEmote = parseResult.data.emote;
      io.emit('player:emoted', {
        id: player.id,
        emote: player.currentEmote,
      });
    });

    // 5. Chat send
    socket.on('chat:send', (rawChat: unknown) => {
      const parseResult = ChatSendSchema.safeParse(rawChat);
      if (!parseResult.success) return;

      const player = activePlayersStore.getPlayerBySocket(socket.id);
      if (!player) return;

      // Sanitize simple tags
      const cleanText = parseResult.data.text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const chatMsg: ChatMessage = {
        id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        playerId: player.id,
        nickname: player.nickname,
        role: player.role,
        text: cleanText,
        timestamp: Date.now(),
      };

      io.emit('chat:message', chatMsg);
    });

    // 6. NPC Interaction (Dialogue & Signal 80/20 request & Economy Actions)
    socket.on('npc:interact', async (data: { action: string }) => {
      const player = activePlayersStore.getPlayerBySocket(socket.id);
      if (!player) return;

      if (data.action === 'signal_request') {
        // Pass player.teaCount: Drinking more tea boosts luck!
        const result = await signalDecisionService.requestSignal(player.id, player.role, player.teaCount);
        // Reply privately with signal decision
        socket.emit('signal:response', result);

        // Broadcast bà's answer bubble in the 3D scene
        io.emit('npc:speech', {
          speaker: 'Bà Bán Trà',
          text: result.npcQuote,
          targetPlayerId: player.id,
          targetNickname: player.nickname,
          allowed: result.allowed,
        });
      } else if (data.action === 'market_status') {
        const comment = dialogueService.getMarketComment();
        socket.emit('npc:dialogue_reply', {
          action: data.action,
          speaker: 'Bà Bán Trà',
          text: comment,
        });
      } else if (data.action === 'tea_order') {
        // 1 Cốc Trà Đá giá 10 credits
        const teaCost = 10;
        if (player.credits < teaCost) {
          const refuseQuote = `Hết xèng rồi con ơi! 10 xu một cốc trà đá mát lạnh, mà trong túi con chỉ còn ${player.credits} xu thôi! Ra ghế ngồi hóng chuyện thị trường đi hoặc nạp thêm xu nhé!`;
          socket.emit('npc:dialogue_reply', {
            action: data.action,
            speaker: 'Bà Bán Trà',
            text: refuseQuote,
            options: [
              { id: '1', label: '⚡ Nạp Thêm Xu (5u = 100 Xu)', action: 'open_topup' },
              { id: '2', label: 'Con ra ghế ngồi hóng vậy...', action: 'leave' },
            ],
          });
          io.emit('npc:speech', {
            speaker: 'Bà Bán Trà',
            text: refuseQuote,
            targetPlayerId: player.id,
            targetNickname: player.nickname,
            allowed: false,
          });
          return;
        }

        // Deduct 10 credits & increase tea count
        player.credits -= teaCost;
        player.teaCount += 1;
        db.updateSessionCredits(player.id, player.credits, player.teaCount);

        // Notify client of credits update
        socket.emit('player:credits_update', {
          credits: player.credits,
          teaCount: player.teaCount,
          cost: teaCost,
          action: 'tea_order',
          message: `Đã uống 1 cốc trà đá (-10 Xu) • Tỉ lệ được Bà cho kèo tăng vọt!`,
        });

        // Trigger player drinking emote
        player.currentEmote = 'sip_tea';
        io.emit('player:emoted', {
          id: player.id,
          emote: 'sip_tea',
        });

        const luckPct = Math.min(98, Math.round((0.8 + player.teaCount * 0.05) * 100));
        const praiseQuote = `Trà đá ngon mát lạnh! Chén thứ ${player.teaCount} rồi đấy, tinh thần sảng khoái, mắt sáng như đèn pha! Tỉ lệ được bà soi kèo chuẩn đã tăng lên ${luckPct}%! Ngồi thưởng trà đi con.`;

        socket.emit('npc:dialogue_reply', {
          action: data.action,
          speaker: 'Bà Bán Trà',
          text: praiseQuote,
        });

        io.emit('npc:speech', {
          speaker: 'Bà Bán Trà',
          text: praiseQuote,
          targetPlayerId: player.id,
          targetNickname: player.nickname,
          allowed: true,
        });
      } else if (data.action === 'stories') {
        const comment = dialogueService.getTraderStory();
        socket.emit('npc:dialogue_reply', {
          action: data.action,
          speaker: 'Bà Bán Trà',
          text: comment,
        });
      } else if (data.action === 'sitting_chill') {
        const comment = dialogueService.getChillComment();
        socket.emit('npc:dialogue_reply', {
          action: data.action,
          speaker: 'Bà Bán Trà',
          text: comment,
        });
      } else if (data.action === 'thay_do_signal') {
        // Xin quẻ Thầy Đồ Xóc Đĩa tốn 15 credits
        const queCost = 15;
        if (player.credits < queCost) {
          const refuseQuote = `Quẻ thánh linh nghiệm vô cùng, thiên cơ bất khả lộ miễn phí con ơi! Xin một quẻ xóc đĩa tốn 15 xu, mà con còn có ${player.credits} xu thôi, mau nạp thêm lộc vào hầu bao đi!`;
          socket.emit('npc:dialogue_reply', {
            action: data.action,
            speaker: 'Thầy Đồ Xóc Đĩa',
            text: refuseQuote,
            options: [
              { id: '1', label: '⚡ Nạp Thêm Xu (5u = 100 Xu)', action: 'open_topup' },
              { id: '2', label: 'Con lùi lại xem người khác xóc...', action: 'leave' },
            ],
          });
          io.emit('thay_do:speech', {
            speaker: 'Thầy Đồ Xóc Đĩa',
            text: refuseQuote,
            targetPlayerId: player.id,
            targetNickname: player.nickname,
            allowed: false,
          });
          return;
        }

        // Deduct 15 credits
        player.credits -= queCost;
        db.updateSessionCredits(player.id, player.credits);

        socket.emit('player:credits_update', {
          credits: player.credits,
          teaCount: player.teaCount,
          cost: queCost,
          action: 'thay_do_signal',
          message: `Gieo quẻ xóc đĩa (-15 Xu) • Thầy Đồ đang mở bát xem vận hạn!`,
        });

        const result = await signalDecisionService.requestThayDoSignal(player.id, player.role);
        socket.emit('signal:response', { ...result, sourceNpc: 'thay_do' });

        io.emit('thay_do:speech', {
          speaker: 'Thầy Đồ Xóc Đĩa',
          text: result.npcQuote,
          targetPlayerId: player.id,
          targetNickname: player.nickname,
          allowed: result.allowed,
        });
      } else if (data.action === 'thay_do_chan_le') {
        const comment = dialogueService.getThayDoChanLe();
        socket.emit('npc:dialogue_reply', {
          action: data.action,
          speaker: 'Thầy Đồ Xóc Đĩa',
          text: comment,
        });
      } else if (data.action === 'thay_do_van_han') {
        const comment = dialogueService.getThayDoVanHan();
        socket.emit('npc:dialogue_reply', {
          action: data.action,
          speaker: 'Thầy Đồ Xóc Đĩa',
          text: comment,
        });
      }
    });

    // 7. Disconnection
    socket.on('disconnect', () => {
      const removed = activePlayersStore.removePlayer(socket.id);
      if (removed) {
        socket.broadcast.emit('player:left', { playerId: removed.id });
        io.emit('room:online_count', { count: activePlayersStore.getOnlinePlayers().length });
      }
    });
  });
}

