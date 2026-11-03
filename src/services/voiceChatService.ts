import { multiplayerService } from './multiplayerService';
import { useGameStore } from '../store/gameStore';

interface PeerConnectionData {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
  socketId?: string;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export class VoiceChatService {
  private localStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private peers = new Map<string, PeerConnectionData>(); // playerId -> PeerConnectionData
  private isMicEnabled = false;
  private isSpeaking = false;
  private volumeCheckInterval: number | null = null;
  private silenceTimer: number | null = null;
  private isInitialized = false;

  public init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Listen to multiplayer socket voice events
    const socket = multiplayerService.getSocket();
    if (!socket) return;

    socket.on('voice:peer_joined', async (data: { peerId: string; socketId: string; nickname: string }) => {
      // If we are currently in voice chat, initiate an offer to the new peer
      if (this.isMicEnabled && !this.peers.has(data.peerId)) {
        await this.createPeerAndOffer(data.peerId, data.socketId);
      }
    });

    socket.on('voice:signal', async (data: { fromPlayerId: string; fromSocketId: string; signal: any }) => {
      await this.handleIncomingSignal(data.fromPlayerId, data.fromSocketId, data.signal);
    });

    socket.on('voice:player_speaking', (data: { playerId: string; isSpeaking: boolean }) => {
      useGameStore.getState().setPlayerSpeaking(data.playerId, data.isSpeaking);
    });

    socket.on('voice:peer_left', (data: { peerId: string; socketId: string }) => {
      this.closePeer(data.peerId);
      useGameStore.getState().setPlayerSpeaking(data.peerId, false);
    });
  }

  public getIsMicEnabled(): boolean {
    return this.isMicEnabled;
  }

  public async toggleMic(): Promise<boolean> {
    if (this.isMicEnabled) {
      this.disableMic();
      return false;
    } else {
      return await this.enableMic();
    }
  }

  public async enableMic(): Promise<boolean> {
    try {
      this.init();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Trình duyệt của bạn không hỗ trợ truy cập Micro (cần dùng HTTPS hoặc localhost).');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.localStream = stream;
      this.isMicEnabled = true;
      useGameStore.getState().setMicOn(true);

      // Start voice volume monitor
      this.startVoiceVolumeMonitor(stream);

      // Broadcast voice join to room
      multiplayerService.joinVoice();

      // Add local track to all existing peers if any
      const track = stream.getAudioTracks()[0];
      if (track) {
        for (const peerData of this.peers.values()) {
          const senders = peerData.pc.getSenders();
          const hasTrack = senders.some((s) => s.track && s.track.kind === 'audio');
          if (!hasTrack) {
            peerData.pc.addTrack(track, stream);
          }
        }
      }

      return true;
    } catch (err: any) {
      console.warn('[VoiceChat] Failed to access microphone:', err);
      let errMsg = 'Không thể mở Micro. Vui lòng kiểm tra quyền truy cập micro trong trình duyệt!';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Quyền truy cập micro đã bị từ chối. Vui lòng cho phép Micro trên thanh địa chỉ trình duyệt!';
      }
      alert(errMsg);
      this.disableMic();
      return false;
    }
  }

  public disableMic() {
    this.isMicEnabled = false;
    useGameStore.getState().setMicOn(false);
    useGameStore.getState().setLocalSpeaking(false);

    // Stop speaking signal
    if (this.isSpeaking) {
      this.isSpeaking = false;
      multiplayerService.sendVoiceSpeaking(false);
    }

    // Stop all local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }

    // Stop volume analyser
    if (this.volumeCheckInterval) {
      window.clearInterval(this.volumeCheckInterval);
      this.volumeCheckInterval = null;
    }
    if (this.silenceTimer) {
      window.clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    // Notify peers that we left voice
    multiplayerService.leaveVoice();

    // Close all peer connections
    for (const peerId of Array.from(this.peers.keys())) {
      this.closePeer(peerId);
    }
  }

  private startVoiceVolumeMonitor(stream: MediaStream) {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      this.audioContext = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      this.analyser = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      this.volumeCheckInterval = window.setInterval(() => {
        if (!this.analyser || !this.isMicEnabled) return;

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const volumeThreshold = 14; // Sensitivity threshold for human voice

        if (average > volumeThreshold) {
          if (this.silenceTimer) {
            window.clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }

          if (!this.isSpeaking) {
            this.isSpeaking = true;
            useGameStore.getState().setLocalSpeaking(true);
            multiplayerService.sendVoiceSpeaking(true);
          }
        } else if (this.isSpeaking && !this.silenceTimer) {
          // Keep speaking true for 400ms after volume drops to prevent jitter
          this.silenceTimer = window.setTimeout(() => {
            this.isSpeaking = false;
            useGameStore.getState().setLocalSpeaking(false);
            multiplayerService.sendVoiceSpeaking(false);
            this.silenceTimer = null;
          }, 400);
        }
      }, 70);
    } catch (e) {
      console.warn('[VoiceChat] Could not init AudioContext volume monitor:', e);
    }
  }

  private createPeerConnection(peerId: string, socketId?: string): PeerConnectionData {
    const pc = new RTCPeerConnection(RTC_CONFIG);

    const audio = new Audio();
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');

    const peerData: PeerConnectionData = { pc, audio, socketId };
    this.peers.set(peerId, peerData);

    // Send ICE candidates to remote peer via socket
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        multiplayerService.sendVoiceSignal(
          peerId,
          { candidate: event.candidate.toJSON() },
          socketId
        );
      }
    };

    // Receive remote audio stream
    pc.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        audio.srcObject = event.streams[0];
        audio.play().catch((err) => {
          console.warn('[VoiceChat] Remote audio autoplay blocked:', err);
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closePeer(peerId);
      }
    };

    // Add local tracks if available
    if (this.localStream) {
      const track = this.localStream.getAudioTracks()[0];
      if (track) {
        pc.addTrack(track, this.localStream);
      }
    }

    return peerData;
  }

  private async createPeerAndOffer(peerId: string, socketId?: string) {
    try {
      const peerData = this.createPeerConnection(peerId, socketId);
      const offer = await peerData.pc.createOffer({
        offerToReceiveAudio: true,
      });
      await peerData.pc.setLocalDescription(offer);

      multiplayerService.sendVoiceSignal(peerId, offer, socketId);
    } catch (err) {
      console.warn('[VoiceChat] Error creating offer for peer:', peerId, err);
      this.closePeer(peerId);
    }
  }

  private async handleIncomingSignal(peerId: string, socketId: string, signal: any) {
    try {
      let peerData = this.peers.get(peerId);

      if (signal.type === 'offer') {
        if (!peerData) {
          peerData = this.createPeerConnection(peerId, socketId);
        }
        await peerData.pc.setRemoteDescription(new RTCSessionDescription(signal));
        const answer = await peerData.pc.createAnswer();
        await peerData.pc.setLocalDescription(answer);

        multiplayerService.sendVoiceSignal(peerId, answer, socketId);
      } else if (signal.type === 'answer') {
        if (peerData) {
          await peerData.pc.setRemoteDescription(new RTCSessionDescription(signal));
        }
      } else if (signal.candidate) {
        if (peerData) {
          try {
            await peerData.pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } catch (e) {
            console.warn('[VoiceChat] Error adding candidate:', e);
          }
        }
      }
    } catch (err) {
      console.warn('[VoiceChat] Error handling signal from peer:', peerId, err);
    }
  }

  private closePeer(peerId: string) {
    const peerData = this.peers.get(peerId);
    if (!peerData) return;

    try {
      peerData.audio.pause();
      peerData.audio.srcObject = null;
      peerData.pc.close();
    } catch {}

    this.peers.delete(peerId);
  }

  /**
   * Adjust remote peer audio volume based on 3D distance to local character (Proximity Audio)
   */
  public updateProximityVolumes(
    localPos: { x: number; y: number; z: number },
    remotePositions: Map<string, { x: number; y: number; z: number }>
  ) {
    if (this.peers.size === 0) return;

    for (const [peerId, peerData] of this.peers.entries()) {
      const pos = remotePositions.get(peerId);
      if (!pos) continue;

      const dx = localPos.x - pos.x;
      const dz = localPos.z - pos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      // Closer than 6m (at tea table): 100% volume
      // 6m to 24m: smooth linear attenuation
      // Beyond 24m: silenced
      let volume = 1.0;
      if (dist <= 6) {
        volume = 1.0;
      } else if (dist < 24) {
        volume = Math.max(0.05, 1 - (dist - 6) / 18);
      } else {
        volume = 0;
      }

      peerData.audio.volume = volume;
    }
  }
}

export const voiceChatService = new VoiceChatService();
