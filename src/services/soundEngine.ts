/**
 * Web Audio Synthesizer for Trà Đá Thị Trường:
 * Ambient countryside breeze, afternoon cicadas & sparrows,
 * ceramic teacup clinking, tea pouring, and interactive UI feedback sounds.
 * 100% royalty-free, zero-dependency Web Audio API implementation.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private bgmGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private isAmbientRunning: boolean = false;
  private ambientTimer: number | null = null;
  private currentVoiceSource: AudioBufferSourceNode | null = null;

  // Audio files cache & Footstep stream
  private audioCache = new Map<string, AudioBuffer>();
  private footstepSource: AudioBufferSourceNode | null = null;
  private footstepGain: GainNode | null = null;
  private isFootstepPlaying: boolean = false;
  private lastDogBarkTime: number = 0;
  private lastBanterTime: number = 0;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.25;
      this.bgmGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ctx && this.bgmGain && this.sfxGain) {
      this.bgmGain.gain.value = muted ? 0 : 0.25;
      this.sfxGain.gain.value = muted ? 0 : 0.4;
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // --- Audio Buffer Caching & Playback Helper ---
  public async loadAudioBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.audioCache.has(url)) {
      return this.audioCache.get(url)!;
    }
    this.initContext();
    if (!this.ctx) return null;

    try {
      let res = await fetch(url);
      if (!res.ok) {
        // Fallback alternate path between /audio/ and /assets/audio/
        const altUrl = url.startsWith('/audio/')
          ? url.replace('/audio/', '/assets/audio/')
          : url.replace('/assets/audio/', '/audio/');
        res = await fetch(altUrl);
      }
      if (!res.ok) return null;

      const arrayBuffer = await res.arrayBuffer();
      const decoded = await this.ctx.decodeAudioData(arrayBuffer);
      this.audioCache.set(url, decoded);
      return decoded;
    } catch {
      return null;
    }
  }

  public async playSoundFile(
    url: string,
    volume = 0.5,
    playbackRate = 1.0,
    maxDuration?: number
  ): Promise<AudioBufferSourceNode | null> {
    if (this.isMuted) return null;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return null;

    try {
      const buffer = await this.loadAudioBuffer(url);
      if (!buffer) return null;

      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.playbackRate.value = playbackRate;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, this.ctx.currentTime);

      source.connect(gain);
      gain.connect(this.sfxGain);

      source.start(0);

      if (maxDuration && maxDuration > 0) {
        const stopTime = this.ctx.currentTime + maxDuration;
        gain.gain.setValueAtTime(volume, stopTime - 0.4);
        gain.gain.linearRampToValueAtTime(0.001, stopTime);
        source.stop(stopTime);
      }

      return source;
    } catch {
      return null;
    }
  }

  // --- Player Footsteps System (tiengbuocchan.mp3) ---
  public startFootsteps(isRunning: boolean = false) {
    if (this.isMuted) return;

    if (this.isFootstepPlaying) {
      if (this.footstepSource) {
        this.footstepSource.playbackRate.value = isRunning ? 1.35 : 1.0;
      }
      return;
    }

    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    this.isFootstepPlaying = true;
    this.loadAudioBuffer('/assets/audio/tiengbuocchan.mp3').then((buffer) => {
      if (!buffer || !this.isFootstepPlaying || !this.ctx || !this.sfxGain) return;

      try {
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        source.playbackRate.value = isRunning ? 1.35 : 1.0;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.3, this.ctx.currentTime + 0.1);

        source.connect(gain);
        gain.connect(this.sfxGain);

        source.start(0);
        this.footstepSource = source;
        this.footstepGain = gain;
      } catch {
        this.isFootstepPlaying = false;
      }
    });
  }

  public updateFootsteps(isMoving: boolean, isRunning: boolean, isSitting: boolean) {
    if (!isMoving || isSitting || this.isMuted) {
      this.stopFootsteps();
    } else {
      this.startFootsteps(isRunning);
    }
  }

  public stopFootsteps() {
    if (!this.isFootstepPlaying) return;
    this.isFootstepPlaying = false;

    if (this.footstepGain && this.ctx) {
      try {
        this.footstepGain.gain.setValueAtTime(this.footstepGain.gain.value, this.ctx.currentTime);
        this.footstepGain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
      } catch {
        // ignore
      }
    }

    if (this.footstepSource) {
      const src = this.footstepSource;
      this.footstepSource = null;
      setTimeout(() => {
        try {
          src.stop();
          src.disconnect();
        } catch {
          // ignore
        }
      }, 100);
    }
  }

  // Microsoft Edge Vietnamese Neural Voice TTS Playback (Smooth & Natural)
  public async playNpcVoice(text: string, voice: 'hoaimy' | 'namminh' = 'hoaimy') {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx) return;

    // Remove bracket annotations like [ĐỒNG Ý] or [TỪ CHỐI] for natural speech
    const cleanSpeech = text.replace(/\[.*?\]/g, '').trim();
    if (!cleanSpeech) return;

    try {
      if (this.currentVoiceSource) {
        try {
          this.currentVoiceSource.stop();
        } catch {
          // already stopped
        }
        this.currentVoiceSource = null;
      }

      const res = await fetch(`/api/tts?text=${encodeURIComponent(cleanSpeech)}&voice=${voice}`);
      if (!res.ok) return;

      const arrayBuffer = await res.arrayBuffer();
      const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);

      const source = this.ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.sfxGain || this.ctx.destination);
      source.start();
      this.currentVoiceSource = source;
    } catch {
      // Graceful fallback if network is offline
    }
  }

  // Ceramic Teacup Clink SFX (Tiếng cụng chén trà hoa cúc)
  public playCupClink() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2600, now);
    osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);

    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Tea Pouring SFX (Tiếng rót trà đá)
  public playPourTea() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const bufferSize = this.ctx.sampleRate * 0.8;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.4));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
    filter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.8);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start();
  }

  // Notification Ping (Khi nhận kèo hoặc có tin nhắn chat)
  public playNotification() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.08); // A5

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.4);
  }

  // Coin / Xu Spent / Earned SFX (Tiếng đồng xu leng keng)
  public playCoin() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(987.77, now); // B5
    osc1.frequency.setValueAtTime(1318.51, now + 0.08); // E6

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1975.53, now);
    osc2.frequency.setValueAtTime(2637.02, now + 0.08);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.45);
    osc2.stop(now + 0.45);
  }

  // Interactive UI Click
  public playUiClick() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.04);

    osc.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(now);
    osc.stop(now + 0.04);
  }

  // Sparrows & Ambient Countryside chirps
  private playBirdChirp() {
    if (this.isMuted || !this.ctx || !this.bgmGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(2800 + Math.random() * 600, now);
    osc.frequency.exponentialRampToValueAtTime(3800 + Math.random() * 400, now + 0.06);
    osc.frequency.exponentialRampToValueAtTime(2400, now + 0.12);

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(now);
    osc.stop(now + 0.15);
  }

  // Realistic Dog Bark SFX (Uses real recording tiengchosua.mp3 with synth fallback)
  public async playDogBark() {
    if (this.isMuted) return;
    this.initContext();

    const played = await this.playSoundFile('/assets/audio/tiengchosua.mp3', 0.5, 1.0, 3.8);
    if (!played) {
      this.playSynthDogBark();
    }
  }

  public playSynthDogBark() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const barks = [0, 0.22];
    barks.forEach((delay) => {
      const now = this.ctx!.currentTime + delay;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const filter = this.ctx!.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.14);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(650, now);
      filter.Q.setValueAtTime(2.5, now);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now);
      osc.stop(now + 0.16);
    });
  }

  // Vehicle Horn ("Bíp bíp!")
  public playCarHorn() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    [440, 554].forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.setValueAtTime(0.18, now + 0.12);
      gain.gain.setValueAtTime(0.0, now + 0.15);
      gain.gain.setValueAtTime(0.18, now + 0.18);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(now);
      osc.stop(now + 0.35);
    });
  }

  // Xóc Đĩa Clatter SFX (Tiếng bát xóc đĩa "Cạch cạch cạch!")
  public playXocDiaShake() {
    if (this.isMuted) return;
    this.initContext();
    if (!this.ctx || !this.sfxGain) return;

    const now = this.ctx.currentTime;
    for (let i = 0; i < 7; i++) {
      const t = now + i * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800 + Math.random() * 800, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.04);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + 0.05);
    }
  }

  // Funny Vietnamese Street Banter Callouts (Uses Edge Neural TTS)
  public playStreetBanter(): string {
    const BANTER_PHRASES = [
      'Này này, có dắt cái xe máy gọn vào vỉa hè không thì bảo?!',
      'Bán buôn kiểu gì đấy, chắn hết lối người ta đi chợ!',
      'Ê ê! Đi đứng kiểu gì đấy, mắt để dưới gót chân à?!',
      'Đua xe à thằng ôn con kia, vỉa hè chứ có phải đường đua F1 đâu!',
      'Thôi thôi các bác bớt mồm đi, ngồi xuống làm chén trà đá cho hạ hỏa!',
      'Bát này Chẵn nhé các bác! Ai Lẻ thì bước sang một bên kẻo mất tiền!',
    ];

    const phrase = BANTER_PHRASES[Math.floor(Math.random() * BANTER_PHRASES.length)];

    // Play using Microsoft Edge Vietnamese Neural Voice (NamMinh)
    if (!this.isMuted) {
      this.playNpcVoice(phrase, 'namminh');
    }

    return phrase;
  }

  // Play real argument audio chuinhau1.mp3 or chuinhau2.mp3
  public async playStreetArgument(): Promise<{
    audioFile: string;
    duration: number;
    textA: string;
    textB: string;
    summary: string;
  }> {
    const isClip1 = Math.random() < 0.5;
    const audioFile = isClip1 ? '/assets/audio/chuinhau1.mp3' : '/assets/audio/chuinhau2.mp3';
    const duration = isClip1 ? 5.4 : 2.4;

    await this.playSoundFile(audioFile, 0.7);

    return isClip1
      ? {
          audioFile,
          duration,
          textA: 'Mày bảo ai đu đỉnh?! Có tin tao vả cho lệch sóng không hả?!',
          textB: 'Thích bắt dao rơi không?! Ngon thì bước vào đây xem nào!',
          summary: 'Hai thanh niên tranh cãi nảy lửa vì đu đỉnh và bắt dao rơi!',
        }
      : {
          audioFile,
          duration,
          textA: 'Đi đứng kiểu gì đấy?! Vừa đi vừa dán mắt vào chart rồi đâm vào người ta à?!',
          textB: 'Đường chung chứ của riêng nhà mày à mà đứng nghênh ngang chắn lối?!',
          summary: 'Hai thanh niên va chạm xe máy quát tháo nhau om sòm ngoài phố!',
        };
  }

  public startAmbience(onStreetEvent?: (text: string) => void) {
    if (this.isAmbientRunning) return;
    this.isAmbientRunning = true;
    this.initContext();

    // Gentle ambient countryside loop with significantly reduced dog & banter frequencies
    const loop = () => {
      if (!this.isAmbientRunning) return;

      const now = Date.now();
      const rand = Math.random();

      // Rare dog bark: only if at least 120s passed since last bark
      if (rand < 0.18 && now - this.lastDogBarkTime > 120000) {
        this.lastDogBarkTime = now;
        this.playDogBark();
        onStreetEvent?.('🐕 Chó Mực: Gâu! Gâu gâu!');
      } else if (rand < 0.28 && now - this.lastBanterTime > 180000) {
        // Rare street banter: only if at least 180s passed since last banter
        this.lastBanterTime = now;
        const shout = this.playStreetBanter();
        onStreetEvent?.(`🗣️ Phố Xá: "${shout}"`);
      } else if (rand < 0.45) {
        this.playCarHorn();
      } else {
        // Most common: peaceful sparrows & breeze
        this.playBirdChirp();
      }

      // Much calmer ambient tick interval: 12 - 28 seconds
      const nextDelay = 12000 + Math.random() * 16000;
      this.ambientTimer = window.setTimeout(loop, nextDelay);
    };

    loop();
  }

  public stopAmbience() {
    this.isAmbientRunning = false;
    if (this.ambientTimer) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }
}

export const soundEngine = new SoundEngine();
