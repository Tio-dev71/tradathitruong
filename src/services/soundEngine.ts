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

  // Realistic Dog Bark SFX ("Gâu! Gâu!")
  public playDogBark() {
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

  // Funny Vietnamese Street Banter Callouts (Tiếng chửi / quát nhau vui tai)
  public playStreetBanter(): string {
    const BANTER_PHRASES = [
      'Này này, có dắt cái xe máy gọn vào vỉa hè không thì bảo?!',
      'Bán buôn kiểu gì đấy, chắn hết lối người ta đi chợ!',
      'Ê ê! Đi đứng kiểu gì đấy, mắt để dưới gót chân à?!',
      'Đua xe à thằng ôn con kia, vỉa hè chứ có phải đường đua F1 đâu!',
      'Thôi thôi các bác bớt mồm đi, ngồi xuống làm chén trà đá cho hạ hỏa!',
      'Bát này Chẵn nhé các bác! Ai Lẻ thì bước sang một bên kẻo mất tiền!',
      'Gâu gâu! (Tiếng chó mực bên hiên nhà sủa theo)',
    ];

    const phrase = BANTER_PHRASES[Math.floor(Math.random() * BANTER_PHRASES.length)];

    // If browser supports SpeechSynthesis, speak it in Vietnamese
    if ('speechSynthesis' in window && !this.isMuted) {
      try {
        const u = new SpeechSynthesisUtterance(phrase);
        u.lang = 'vi-VN';
        u.rate = 1.15;
        u.pitch = 1.1;
        u.volume = 0.45;
        window.speechSynthesis.speak(u);
      } catch {
        // speech synthesis fallback
      }
    }

    return phrase;
  }

  public startAmbience(onStreetEvent?: (text: string) => void) {
    if (this.isAmbientRunning) return;
    this.isAmbientRunning = true;
    this.initContext();

    // Periodically play gentle sparrow chirps and occasional street banter / dog bark
    const loop = () => {
      if (!this.isAmbientRunning) return;

      const rand = Math.random();
      if (rand < 0.6) {
        this.playBirdChirp();
      } else if (rand < 0.8) {
        this.playDogBark();
        onStreetEvent?.('🐕 Chó Mực: Gâu! Gâu gâu!');
      } else if (rand < 0.92) {
        this.playCarHorn();
      } else {
        const shout = this.playStreetBanter();
        onStreetEvent?.(`🗣️ Phố Xá: "${shout}"`);
      }

      const nextDelay = 3500 + Math.random() * 5000;
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
