import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { db } from './src/server/db/database';
import { webhookRouter } from './src/server/routes/webhookRoutes';
import { adminRouter } from './src/server/routes/adminRoutes';
import { setupMultiplayerSocket } from './src/server/socket/multiplayerHandler';
import { discordSignalRelay } from './src/server/services/discordSignalRelay';
import { marketPriceService } from './src/server/services/marketPriceService';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'public', 'assets')));

// Setup Socket.IO Server
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

setupMultiplayerSocket(io);
discordSignalRelay.setSocketServer(io);
marketPriceService.setSocketServer(io);
marketPriceService.startPolling(6000);

// API Routes
app.use('/api/webhooks', webhookRouter);
app.use('/api/admin', adminRouter);

// Market Price Endpoints (Free Binance Public API & Tiệm Vàng DJN Live Feeds)
app.get('/api/market-prices', (_req, res) => {
  res.json({
    success: true,
    data: marketPriceService.getAllTickers(),
  });
});

app.get('/api/gold-price', (_req, res) => {
  const gold = marketPriceService.getTicker('XAU/USD');
  res.json({
    symbol: 'XAU/USD',
    price: gold?.price ?? 2748.50,
    change: gold?.change ?? 18.60,
    changePercent: gold?.changePercent ?? 0.68,
    currency: 'USD',
    unit: 'oz',
    updatedAt: gold?.updatedAt ?? Date.now(),
  });
});

app.post('/api/gold-price', (req, res) => {
  const { price, change, changePercent } = req.body;
  if (typeof price === 'number') {
    marketPriceService.updatePrice('XAU/USD', price, change, changePercent);
    return res.json({ success: true, price });
  }
  return res.status(400).json({ success: false, error: 'Price must be a number' });
});

// Session check route
app.get('/api/session/:id', (req, res) => {
  const session = db.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found' });
  }
  return res.json({
    success: true,
    data: {
      id: session.id,
      nickname: session.nickname,
      role: session.role,
      avatar: JSON.parse(session.avatar_json),
    },
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: 'Trà Đá Thị Trường',
    timestamp: Date.now(),
  });
});

// Audio / TTS endpoint (Vietnamese voice for NPC: Bà Bán Trà & Thầy Đồ)
const ttsCache = new Map<string, Buffer>();

async function getVoiceTts(text: string, voiceName = 'vi-VN-HoaiMyNeural'): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    audioStream.on('data', (d: Buffer) => chunks.push(d));
    audioStream.on('end', () => resolve(Buffer.concat(chunks)));
    audioStream.on('error', reject);
  });
}

app.get('/api/tts', async (req, res) => {
  try {
    const text = String(req.query.text || '').trim();
    if (!text) {
      return res.status(400).send('Missing text parameter');
    }
    const voiceQuery = String(req.query.voice || '').toLowerCase();
    // 'thay_do' / 'namminh' -> vi-VN-NamMinhNeural; 'ba_ban_tra' / default -> vi-VN-HoaiMyNeural
    const voiceName = (voiceQuery === 'thay_do' || voiceQuery === 'namminh')
      ? 'vi-VN-NamMinhNeural'
      : 'vi-VN-HoaiMyNeural';

    const cleanText = text.slice(0, 300);
    const cacheKey = `${voiceName}:${cleanText}`;

    let audio = ttsCache.get(cacheKey);
    if (!audio) {
      try {
        audio = await getVoiceTts(cleanText, voiceName);
        ttsCache.set(cacheKey, audio);
      } catch (err) {
        console.warn('Edge TTS unavailable, skipping audio stream:', err);
        return res.status(503).json({ error: 'TTS temporarily unavailable' });
      }
    }
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(audio);
  } catch (err) {
    return res.status(500).json({ error: 'TTS processing failed' });
  }
});

// Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🍵 Trà Đá Thị Trường server running on http://localhost:${PORT}`);
  });
}

startServer();
