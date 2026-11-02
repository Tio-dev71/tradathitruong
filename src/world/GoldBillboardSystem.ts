import * as THREE from 'three';

export interface GoldMarketData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  bid: number;
  ask: number;
  candles: { o: number; h: number; l: number; c: number }[];
}

export class GoldBillboardSystem {
  public mesh: THREE.Group;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private data: GoldMarketData;
  private lastTickTime = 0;
  private tickInterval = 1.5; // Tick every 1.5s
  private targetPrice: number;

  constructor() {
    this.mesh = new THREE.Group();
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d')!;

    // Initial realistic Gold price
    const basePrice = 2748.50;
    this.targetPrice = basePrice;
    this.data = {
      symbol: 'XAU/USD',
      price: basePrice,
      change: 18.60,
      changePercent: 0.68,
      high: 2756.20,
      low: 2729.40,
      bid: basePrice - 0.30,
      ask: basePrice + 0.30,
      candles: this.generateInitialCandles(basePrice),
    };

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;

    this.buildBillboardMesh();
    this.renderCanvas();
  }

  private generateInitialCandles(base: number) {
    const list: { o: number; h: number; l: number; c: number }[] = [];
    let cur = base - 14;
    for (let i = 0; i < 28; i++) {
      const delta = (Math.random() - 0.48) * 3.5;
      const o = cur;
      const c = cur + delta;
      const h = Math.max(o, c) + Math.random() * 2.2;
      const l = Math.min(o, c) - Math.random() * 2.2;
      list.push({ o, h, l, c });
      cur = c;
    }
    return list;
  }

  private buildBillboardMesh() {
    const width = 5.8;
    const height = 3.2;

    // LED Screen plane
    const screenGeo = new THREE.PlaneGeometry(width, height);
    const screenMat = new THREE.MeshBasicMaterial({
      map: this.texture,
      toneMapped: false,
    });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0, 0.08);
    this.mesh.add(screen);

    // Frame bezel
    const frameGeo = new THREE.BoxGeometry(width + 0.3, height + 0.3, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.castShadow = true;
    this.mesh.add(frame);

    // Golden decorative top header bar
    const topBarGeo = new THREE.BoxGeometry(width + 0.4, 0.25, 0.25);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      metalness: 0.85,
      roughness: 0.25,
    });
    const topBar = new THREE.Mesh(topBarGeo, goldMat);
    topBar.position.set(0, height / 2 + 0.2, 0.05);
    this.mesh.add(topBar);

    // Subtle neon glow light in front of the board
    const boardGlow = new THREE.PointLight(0xffd700, 1.2, 12);
    boardGlow.position.set(0, 0, 1.5);
    this.mesh.add(boardGlow);
  }

  public updatePrice(newPrice: number, change?: number, changePercent?: number) {
    this.data.price = newPrice;
    if (change !== undefined) this.data.change = change;
    if (changePercent !== undefined) this.data.changePercent = changePercent;
    this.data.bid = newPrice - 0.30;
    this.data.ask = newPrice + 0.30;
    this.data.high = Math.max(this.data.high, newPrice);
    this.data.low = Math.min(this.data.low, newPrice);

    // Update last candle
    if (this.data.candles.length > 0) {
      const last = this.data.candles[this.data.candles.length - 1];
      last.c = newPrice;
      last.h = Math.max(last.h, newPrice);
      last.l = Math.min(last.l, newPrice);
    }

    this.renderCanvas();
  }

  public update(time: number, delta: number) {
    if (time - this.lastTickTime > this.tickInterval) {
      this.lastTickTime = time;
      // Simulated live micro-tick fluctuation (+/- 0.25 to 0.75 USD)
      const tick = (Math.random() - 0.49) * 0.8;
      const nextPrice = Number((this.data.price + tick).toFixed(2));
      const nextChange = Number((this.data.change + tick).toFixed(2));
      const nextPct = Number(((nextChange / 2730) * 100).toFixed(2));

      this.updatePrice(nextPrice, nextChange, nextPct);

      // Periodically shift candles
      if (Math.random() < 0.25 && this.data.candles.length > 0) {
        const lastC = this.data.candles[this.data.candles.length - 1].c;
        this.data.candles.shift();
        this.data.candles.push({
          o: lastC,
          h: lastC + Math.random() * 1.5,
          l: lastC - Math.random() * 1.5,
          c: lastC + (Math.random() - 0.48) * 1.8,
        });
      }
    }
  }

  public renderCanvas() {
    const ctx = this.ctx;
    const w = 1024;
    const h = 512;

    // Dark high-tech terminal background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0a0d14');
    bgGrad.addColorStop(1, '#05070a');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Top Brand Bar: TIỆM VÀNG DJN
    ctx.fillStyle = '#1c1308';
    ctx.fillRect(0, 0, w, 68);

    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, 60);

    // Gold Shop Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px serif';
    ctx.textAlign = 'left';
    ctx.fillText('🏛️ TIỆM VÀNG DJN', 24, 46);

    ctx.fillStyle = '#f39c12';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('BẢNG GIÁ VÀNG QUỐC TẾ (XAU/USD)', w - 24, 44);

    // Price section (Left)
    const isUp = this.data.change >= 0;
    const themeColor = isUp ? '#00e676' : '#ff5252';

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`$${this.data.price.toFixed(2)}`, 32, 138);

    ctx.fillStyle = themeColor;
    ctx.font = 'bold 24px sans-serif';
    const sign = isUp ? '+' : '';
    ctx.fillText(
      `${sign}${this.data.change.toFixed(2)} USD (${sign}${this.data.changePercent.toFixed(2)}%) ${isUp ? '▲' : '▼'}`,
      32,
      175
    );

    // High / Low / Bid / Ask Stats Box
    ctx.fillStyle = '#141c24';
    ctx.beginPath();
    ctx.roundRect(32, 195, 290, 100, 10);
    ctx.fill();
    ctx.strokeStyle = '#233446';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Cao nhất 24h:', 46, 222);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`$${this.data.high.toFixed(2)}`, 160, 222);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Thấp nhất 24h:', 46, 246);
    ctx.fillStyle = '#f8fafc';
    ctx.fillText(`$${this.data.low.toFixed(2)}`, 160, 246);

    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Bid / Ask:', 46, 272);
    ctx.fillStyle = '#38bdf8';
    ctx.fillText(`${this.data.bid.toFixed(2)} / ${this.data.ask.toFixed(2)}`, 160, 272);

    // Live Badge
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.roundRect(32, 310, 80, 26, 6);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('● LIVE', 72, 328);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Khung: 1H • Nguồn: TradingView XAU/USD', 124, 327);

    // --- Candlestick & Line Chart Area (Right) ---
    const chartX = 350;
    const chartY = 85;
    const chartW = 640;
    const chartH = 340;

    // Grid box
    ctx.fillStyle = '#080d16';
    ctx.fillRect(chartX, chartY, chartW, chartH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(chartX, chartY, chartW, chartH);

    // Horizontal grid lines
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.4)';
    for (let i = 1; i <= 4; i++) {
      const gy = chartY + (chartH / 5) * i;
      ctx.beginPath();
      ctx.moveTo(chartX, gy);
      ctx.lineTo(chartX + chartW, gy);
      ctx.stroke();
    }

    // Draw Candlesticks
    const candles = this.data.candles;
    if (candles.length > 0) {
      let minVal = Infinity;
      let maxVal = -Infinity;
      candles.forEach((c) => {
        if (c.l < minVal) minVal = c.l;
        if (c.h > maxVal) maxVal = c.h;
      });
      const range = Math.max(2, maxVal - minVal);
      const slotW = chartW / candles.length;
      const candleW = Math.max(4, slotW * 0.65);

      const getY = (v: number) => chartY + chartH - 20 - ((v - minVal) / range) * (chartH - 40);

      // Candles
      candles.forEach((c, idx) => {
        const cx = chartX + idx * slotW + slotW / 2;
        const isGreen = c.c >= c.o;
        const color = isGreen ? '#00e676' : '#ff5252';

        // High-low wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx, getY(c.h));
        ctx.lineTo(cx, getY(c.l));
        ctx.stroke();

        // Candle Body
        const topY = getY(Math.max(c.o, c.c));
        const botY = getY(Math.min(c.o, c.c));
        const bHeight = Math.max(3, botY - topY);

        ctx.fillStyle = color;
        ctx.fillRect(cx - candleW / 2, topY, candleW, bHeight);
      });

      // Moving average trend line (Yellow curve)
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      candles.forEach((c, idx) => {
        const cx = chartX + idx * slotW + slotW / 2;
        const avg = (c.o + c.c + c.h + c.l) / 4;
        const cy = getY(avg);
        if (idx === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();
    }

    // Footer Ticker Bar
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, h - 52, w, 52);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(
      '🌟 TIỆM VÀNG DJN: MUA ĐÁY BÁN ĐỈNH • TÍN HIỆU THỊ TRƯỜNG THỜI GIAN THỰC • UỐNG TRÀ ĐÁ NGHE BÀ SOI KÈO 🌟',
      w / 2,
      h - 20
    );

    this.texture.needsUpdate = true;
  }
}
