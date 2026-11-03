import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { WorldScene } from './world/WorldScene';
import { PlayerController } from './player/PlayerController';
import { buildChibiAvatar, type AvatarRig } from './player/AvatarBuilder';
import { multiplayerService } from './services/multiplayerService';
import { soundEngine } from './services/soundEngine';
import { useGameStore } from './store/gameStore';

// UI Overlays
import { CharacterCreationModal } from './components/CharacterCreationModal';
import { HUD } from './components/HUD';
import { ChatBox } from './components/ChatBox';
import { DialoguePanel } from './components/DialoguePanel';
import { SignalCard } from './components/SignalCard';
import { MobileControls } from './components/MobileControls';
import { AdminDashboard } from './components/AdminDashboard';
import { TopupModal } from './components/TopupModal';

import type { AvatarConfig, PlayerData, PlayerRole } from './types/game';
import type { SignalDecisionResult } from './types/signal';

const SESSION_STORAGE_KEY = 'tra_da_session_v1';

export function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldSceneRef = useRef<WorldScene | null>(null);
  const playerControllerRef = useRef<PlayerController | null>(null);
  const localAvatarRigRef = useRef<AvatarRig | null>(null);

  const {
    player,
    setPlayer,
    updateCredits,
    setCreditsNotification,
    setOnlineCount,
    addChatMessage,
    setActiveSignal,
    setCooldown,
    openDialogue,
    setDialogueText,
    isCreateModalOpen,
    setIsCreateModalOpen,
    setMarketTickers,
  } = useGameStore();

  const [isSitting, setIsSitting] = useState(false);
  const [canInteractNpc, setCanInteractNpc] = useState(false);

  // 1. Initialize 3D World Scene
  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new WorldScene(containerRef.current);
    worldSceneRef.current = scene;

    const controller = new PlayerController(
      scene.camera,
      scene.renderer.domElement,
      scene.collisionSystem,
      { x: -5, y: 0, z: 5 }
    );
    playerControllerRef.current = controller;

    // Connect interact key
    controller.onInteract = () => {
      handleInteractTrigger();
    };

    // Main per-frame update loop hooked from WorldScene
    scene.onUpdate = (delta: number) => {
      if (!playerControllerRef.current) return;

      const ctrl = playerControllerRef.current;
      ctrl.update(delta, localAvatarRigRef.current || undefined);
      soundEngine.updateFootsteps(ctrl.isMoving, ctrl.isRunning, ctrl.isSitting);

      // Send local movement to server
      if (localAvatarRigRef.current) {
        multiplayerService.sendMove(
          { x: ctrl.position.x, y: ctrl.position.y, z: ctrl.position.z },
          ctrl.rotationY,
          ctrl.isMoving,
          ctrl.isRunning,
          ctrl.isSitting
        );
      }

      // Check distance to NPC "Trà Đá Thị Trường" at (-1.8, 0, -1.2)
      const npcPos = new THREE.Vector3(-1.8, 0, -1.2);
      const distToNpc = ctrl.position.distanceTo(npcPos);
      const inRangeNpc = distToNpc < 2.8;
      scene.npc.setInteractPromptVisible(inRangeNpc);
      scene.npc.update(performance.now() / 1000, ctrl.position, false);

      // Check distance to NPC "Thầy Đồ Xóc Đĩa" at (4.2, 0, 1.8)
      const thayDoPos = new THREE.Vector3(4.2, 0, 1.8);
      const distToThayDo = ctrl.position.distanceTo(thayDoPos);
      const inRangeThayDo = distToThayDo < 2.8;
      scene.thayDo.setInteractPromptVisible(inRangeThayDo);
      scene.thayDo.update(performance.now() / 1000, ctrl.position, false);

      // Check distance to Cậu Vàng (Dog) at (-4.2, 0, 0.8)
      const distToDog = ctrl.position.distanceTo(scene.dog.position);
      const inRangeDog = distToDog < 2.4;
      scene.dog.update(performance.now() / 1000, ctrl.position);

      setCanInteractNpc(inRangeNpc || inRangeThayDo || inRangeDog);

      // If player moved while sitting, automatically stand up
      if (isSitting && !ctrl.isSitting) {
        setIsSitting(false);
        multiplayerService.sendSit(false);
      }
    };

    // Check saved session in localStorage
    const saved = localStorage.getItem(SESSION_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.nickname && parsed.role && parsed.avatar) {
          handleJoinGame(parsed.nickname, parsed.role, parsed.avatar, parsed.sessionId);
        }
      } catch {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    return () => {
      scene.dispose();
      multiplayerService.disconnect();
      soundEngine.stopAmbience();
    };
  }, []);

  // 2. Cooldown timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      const { cooldownRemaining, setCooldown, nextAllowedAt } = useGameStore.getState();
      if (cooldownRemaining > 0) {
        const nextRem = Math.max(0, Math.ceil((nextAllowedAt - Date.now()) / 1000));
        setCooldown(nextRem, nextAllowedAt);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 3. Trigger interaction with NPC (Bà Bán Trà or Thầy Đồ Xóc Đĩa)
  const handleInteractTrigger = useCallback(() => {
    if (!playerControllerRef.current || !worldSceneRef.current) return;

    const ctrl = playerControllerRef.current;
    const { player } = useGameStore.getState();
    const roleText = player ? player.role : 'Chiến thần';
    const nameText = player ? player.nickname : 'bạn';

    // 1. Check Bà Bán Trà
    const npcPos = new THREE.Vector3(-1.8, 0, -1.2);
    if (ctrl.position.distanceTo(npcPos) < 2.8) {
      soundEngine.playUiClick();
      soundEngine.playCupClink();

      openDialogue(
        `Ơ kìa ${roleText} ${nameText}! Ghé quán cô làm chén trà đá giải nhiệt hay muốn cô soi kèo thị trường nào?`,
        [
          { id: '1', label: 'Cô ơi, cho cháu xin một kèo! (Tỷ lệ 80/20)', action: 'signal_request' },
          { id: '2', label: 'Hôm nay thị trường thế nào cô?', action: 'market_status' },
          { id: '3', label: 'Cho cháu cốc trà đá.', action: 'tea_order' },
          { id: '4', label: 'Cô kể chuyện trader đi!', action: 'stories' },
          { id: '5', label: 'Cháu ngồi hóng thôi.', action: 'sitting_chill' },
          { id: '6', label: 'Tạm biệt cô!', action: 'close' },
        ],
        'Bà Bán Trà'
      );
      return;
    }

    // 2. Check Thầy Đồ Xóc Đĩa
    const thayDoPos = new THREE.Vector3(4.2, 0, 1.8);
    if (ctrl.position.distanceTo(thayDoPos) < 2.8) {
      soundEngine.playUiClick();
      soundEngine.playXocDiaShake();

      openDialogue(
        `A di đà Phật... à nhầm, quẻ này thầy xóc ra vận tiền tài đấy ${roleText} ${nameText}! Vào đây làm một ván hay xin quẻ thị trường?`,
        [
          { id: 't1', label: 'Thầy ơi, xóc cho con một quẻ kèo! (Tỷ lệ 60/40)', action: 'thay_do_signal' as any },
          { id: 't2', label: 'Bát này mở ra Chẵn hay Lẻ hả thầy?', action: 'thay_do_chan_le' as any },
          { id: 't3', label: 'Xem cho con vận hạn đu đỉnh năm nay.', action: 'thay_do_van_han' as any },
          { id: 't4', label: 'Con ngồi xem thầy xóc đĩa thôi.', action: 'sitting_chill' as any },
          { id: 't5', label: 'Tạm biệt thầy!', action: 'close' as any },
        ],
        'Thầy Đồ Xóc Đĩa'
      );
      return;
    }

    // 3. Check Cậu Vàng (Dog)
    const scene = worldSceneRef.current;
    if (scene && ctrl.position.distanceTo(scene.dog.position) < 2.5) {
      soundEngine.playUiClick();
      scene.dog.interact((phrase) => {
        addChatMessage({
          id: 'dog_' + Date.now(),
          playerId: 'dog',
          nickname: 'Cậu Vàng',
          role: 'Ông Chú Ngồi Hóng',
          text: phrase,
          timestamp: Date.now(),
          isSystem: true,
        });
      });
      return;
    }
  }, [openDialogue, addChatMessage]);

  // 4. Handle Join Game
  const handleJoinGame = (
    nickname: string,
    role: PlayerRole,
    avatar: AvatarConfig,
    existingSessionId?: string
  ) => {
    const sessionId = existingSessionId || 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Save locally
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ sessionId, nickname, role, avatar })
    );

    const world = worldSceneRef.current;
    if (!world) return;

    // Remove old local avatar if any
    if (localAvatarRigRef.current) {
      world.scene.remove(localAvatarRigRef.current.root);
    }

    // Spawn local avatar in 3D scene right in front of Cổng Chào
    const spawnX = -15.0;
    const spawnZ = 4.0;
    const rig = buildChibiAvatar(avatar, nickname, role);
    rig.root.position.set(spawnX, 0, spawnZ);
    rig.root.rotation.y = Math.PI / 2; // Facing +X towards the tea stall
    world.scene.add(rig.root);
    localAvatarRigRef.current = rig;

    if (playerControllerRef.current) {
      playerControllerRef.current.position.set(spawnX, 0, spawnZ);
      playerControllerRef.current.rotationY = Math.PI / 2;
      playerControllerRef.current.cameraYaw = -Math.PI / 2; // Position camera behind avatar facing into village
    }

    // Set store state with 100 starting credits
    const pData: PlayerData = {
      id: sessionId,
      nickname,
      role,
      avatar,
      position: { x: spawnX, y: 0, z: spawnZ },
      rotationY: Math.PI / 2,
      isMoving: false,
      isRunning: false,
      isSitting: false,
      joinedAt: Date.now(),
      credits: 100,
      teaCount: 0,
    };
    setPlayer(pData);
    setIsCreateModalOpen(false);

    // Connect Street Drama chat callback
    world.streetDrama.setChatCallback((dramaText) => {
      addChatMessage({
        id: 'drama_' + Date.now(),
        playerId: 'drama',
        nickname: 'Phố Xá',
        role: 'Cao Thủ Đu Đỉnh',
        text: dramaText,
        timestamp: Date.now(),
        isSystem: true,
      });
    });

    // Start background sounds with lively street events
    soundEngine.startAmbience((streetText) => {
      if (streetText.includes('🐕') && world) {
        world.dog.bark();
      }
      addChatMessage({
        id: 'street_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
        playerId: 'street',
        nickname: 'Phố Xá',
        role: 'Ông Chú Ngồi Hóng',
        text: streetText,
        timestamp: Date.now(),
        isSystem: true,
      });
    });

    // Connect to Multiplayer Socket.IO
    multiplayerService.connect(
      { sessionId, nickname, role, avatar },
      {
        onRoomState: (data) => {
          setOnlineCount(data.onlineCount);
          if (data.self) {
            updateCredits(data.self.credits, data.self.teaCount);
          }
          // Spawn all existing players
          data.players.forEach((other) => {
            world.addRemotePlayer(other);
          });
        },
        onCreditsUpdate: (data) => {
          const currentPlayer = useGameStore.getState().player;
          if (data.playerId && currentPlayer && data.playerId !== currentPlayer.id) {
            return;
          }
          updateCredits(data.credits, data.teaCount);
          setCreditsNotification(data.message);
          soundEngine.playCoin();
          setTimeout(() => {
            setCreditsNotification(null);
          }, 4500);
        },
        onGoldUpdate: (data) => {
          world.updateGoldPrice(data.price, data.change, data.changePercent, data.candles);
        },
        onMarketTickers: (tickers) => {
          setMarketTickers(tickers);
        },
        onPlayerJoined: (newPlayer) => {
          world.addRemotePlayer(newPlayer);
          soundEngine.playNotification();
        },
        onPlayerMoved: (data) => {
          world.updateRemotePlayerMove(
            data.id,
            data.position,
            data.rotationY,
            data.isMoving,
            data.isRunning,
            data.isSitting
          );
        },
        onPlayerLeft: (data) => {
          world.removeRemotePlayer(data.playerId);
        },
        onPlayerSat: (data) => {
          world.updateRemotePlayerMove(data.id, data.position, 0, false, false, data.isSitting);
        },
        onPlayerEmoted: (data) => {
          world.updateRemotePlayerEmote(data.id, data.emote);
        },
        onChatMessage: (msg) => {
          addChatMessage(msg);
          soundEngine.playNotification();
        },
        onSignalResponse: (result: SignalDecisionResult) => {
          setCooldown(result.cooldownSeconds, result.nextAllowedAt);
          soundEngine.playNotification();

          if (result.allowed && result.signal) {
            setActiveSignal(result.signal);
            setDialogueText(`[ĐỒNG Ý CẤP TÍN HIỆU] ${result.npcQuote}`);
          } else {
            setDialogueText(`[TỪ CHỐI] ${result.npcQuote}`);
          }
        },
        onNpcSpeech: (data) => {
          world.npc.showSpeech(data.text);
          soundEngine.playNpcVoice(data.text, 'hoaimy');
          setTimeout(() => {
            world.npc.hideSpeech();
          }, 8000);
        },
        onThayDoSpeech: (data) => {
          world.thayDo.showSpeech(data.text);
          soundEngine.playNpcVoice(data.text, 'namminh');
          setTimeout(() => {
            world.thayDo.hideSpeech();
          }, 8000);
        },
        onNpcDialogueReply: (data) => {
          setDialogueText(data.text);
          const voice = data.speaker.includes('Thầy') ? 'namminh' : 'hoaimy';
          soundEngine.playNpcVoice(data.text, voice);
        },
        onOnlineCount: (count) => {
          setOnlineCount(count);
        },
        onErrorJoin: (data) => {
          alert(data.message);
        },
      }
    );
  };

  // Toggle Sit / Stand with clean snap to nearest stool
  const handleToggleSit = () => {
    soundEngine.playUiClick();
    const nextSitting = !isSitting;
    setIsSitting(nextSitting);

    if (playerControllerRef.current && worldSceneRef.current) {
      if (nextSitting) {
        const spots = worldSceneRef.current.stallBuilder.stoolSpots;
        const currentPos = playerControllerRef.current.position;
        let closest = spots[0];
        let minDist = 99999;
        for (const s of spots) {
          const d = Math.hypot(s.x - currentPos.x, s.z - currentPos.z);
          if (d < minDist) {
            minDist = d;
            closest = s;
          }
        }
        playerControllerRef.current.setSitting(true, { x: closest.x, y: 0, z: closest.z }, closest.facingY);
        multiplayerService.sendSit(true, { x: closest.x, y: 0, z: closest.z });
      } else {
        playerControllerRef.current.setSitting(false);
        multiplayerService.sendSit(false);
      }
    }
  };

  // Local emote triggering
  const handleTriggerEmote = (emote: 'wave' | 'laugh' | 'sip_tea' | 'shrug' | 'cheer') => {
    if (playerControllerRef.current) {
      playerControllerRef.current.playEmote(emote);
    }
    multiplayerService.sendEmote(emote);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing" />

      {/* Character Creation Modal on First Visit */}
      {isCreateModalOpen && (
        <CharacterCreationModal
          onComplete={(name, role, avatar) => handleJoinGame(name, role, avatar)}
        />
      )}

      {/* Main Game UI HUD */}
      {!isCreateModalOpen && (
        <>
          <HUD onToggleSit={handleToggleSit} isSitting={isSitting} />
          <ChatBox onEmote={handleTriggerEmote} />
          <DialoguePanel />
          <SignalCard />
          <MobileControls
            onJoystickMove={(vec) => {
              if (playerControllerRef.current) {
                playerControllerRef.current.joystickVector = vec;
              }
            }}
            onInteract={handleInteractTrigger}
            onRunToggle={(run) => {
              if (playerControllerRef.current) {
                playerControllerRef.current.isRunning = run;
              }
            }}
          />
        </>
      )}

      {/* Admin Panel Modal */}
      <AdminDashboard />

      {/* Plisio Xu Topup Modal */}
      <TopupModal />
    </div>
  );
}

export default App;
