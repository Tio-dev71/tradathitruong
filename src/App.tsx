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
    setOnlineCount,
    addChatMessage,
    setActiveSignal,
    setCooldown,
    openDialogue,
    setDialogueText,
    isCreateModalOpen,
    setIsCreateModalOpen,
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
      const inRange = distToNpc < 2.8;
      setCanInteractNpc(inRange);
      scene.npc.setInteractPromptVisible(inRange);

      // Animate NPC
      scene.npc.update(performance.now() / 1000, ctrl.position, false);
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

  // 3. Trigger interaction with NPC
  const handleInteractTrigger = useCallback(() => {
    if (!playerControllerRef.current || !worldSceneRef.current) return;

    const npcPos = new THREE.Vector3(-1.8, 0, -1.2);
    const distToNpc = playerControllerRef.current.position.distanceTo(npcPos);

    if (distToNpc < 2.8) {
      soundEngine.playUiClick();
      soundEngine.playCupClink();

      const { player } = useGameStore.getState();
      const roleText = player ? player.role : 'Chiến thần';
      const nameText = player ? player.nickname : 'bạn';

      openDialogue(
        `Ơ kìa ${roleText} ${nameText}! Ghé quán cô làm chén trà đá giải nhiệt hay muốn cô soi kèo thị trường nào?`
      );
    }
  }, [openDialogue]);

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

    // Spawn local avatar in 3D scene
    const rig = buildChibiAvatar(avatar, nickname, role);
    rig.root.position.set(-5, 0, 5);
    world.scene.add(rig.root);
    localAvatarRigRef.current = rig;

    if (playerControllerRef.current) {
      playerControllerRef.current.position.set(-5, 0, 5);
    }

    // Set store state
    const pData: PlayerData = {
      id: sessionId,
      nickname,
      role,
      avatar,
      position: { x: -5, y: 0, z: 5 },
      rotationY: 0,
      isMoving: false,
      isRunning: false,
      isSitting: false,
      joinedAt: Date.now(),
    };
    setPlayer(pData);
    setIsCreateModalOpen(false);

    // Start background sounds
    soundEngine.startAmbience();

    // Connect to Multiplayer Socket.IO
    multiplayerService.connect(
      { sessionId, nickname, role, avatar },
      {
        onRoomState: (data) => {
          setOnlineCount(data.onlineCount);
          // Spawn all existing players
          data.players.forEach((other) => {
            world.addRemotePlayer(other);
          });
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
            setDialogueText(`[ĐỒNG Ý SOI KÈO] ${result.npcQuote}`);
          } else {
            setDialogueText(`[TỪ CHỐI] ${result.npcQuote}`);
          }
        },
        onNpcSpeech: (data) => {
          // Show speech bubble above bà cô bán trà in 3D
          world.npc.showSpeech(data.text);
          setTimeout(() => {
            world.npc.hideSpeech();
          }, 8000);
        },
        onNpcDialogueReply: (data) => {
          setDialogueText(data.text);
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

  // Toggle Sit / Stand
  const handleToggleSit = () => {
    soundEngine.playUiClick();
    const nextSitting = !isSitting;
    setIsSitting(nextSitting);

    if (playerControllerRef.current) {
      // If sitting down, sit on the stool near table
      playerControllerRef.current.setSitting(
        nextSitting,
        nextSitting ? { x: -1.2, y: 0, z: 0.2 } : undefined
      );
      multiplayerService.sendSit(
        nextSitting,
        nextSitting ? { x: -1.2, y: 0, z: 0.2 } : undefined
      );
    }
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
          <ChatBox />
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
    </div>
  );
}

export default App;
