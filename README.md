# 🍵 TRÀ ĐÁ THỊ TRƯỜNG

> **"Ngồi xuống uống chén trà, nghe bà soi thị trường."**

Web 3D Multiplayer Social Sandbox kết hợp tương tác NPC và hệ thống cung cấp tín hiệu thị trường ở chế độ demo. Lấy cảm hứng từ nét văn hóa quán trà đá vỉa hè Việt Nam dưới gốc cây đa cổ thụ, sản phẩm mang đến một không gian giải trí, giao lưu trader và nhận lời khuyên đầu tư hóm hỉnh từ Bà Bán Trà.

---

## 🌟 Tính Năng Nổi Bật

1. **Thế Giới 3D Phong Cách Vỉa Hè Việt Nam (Genuine 3D World):**
   - Dựng hoàn chỉnh bằng Three.js / WebGL: gạch lát vỉa hè truyền thống hoa văn tròn, gốc cây đa cổ thụ rợp bóng mát, tường vàng rêu phong với biển số "Khoan cắt bê tông", gánh nước, bàn trà mộc, phích nước Rạng Đông đỏ, ấm tích ủ rơm, chén trà hoa cúc, điếu cày nứa, rổ lạc rang, đĩa hạt hướng dương.
   - Ghế nhựa Song Long xanh đỏ và đôn gỗ mộc mạc cho người chơi ngồi hóng chuyện.
   - Hiệu ứng ánh sáng chiều tà vàng ấm (golden hour), bóng đổ mượt mà (PCFSoftShadowMap), đom đóm lập lòe và lá vàng rơi.
   - Hệ thống phát hiện và ngăn cản va chạm vật lý (Collision Resolution) chống đi xuyên vật thể.

2. **Hệ Thống Nhân Vật Chibi Tùy Biến (Customizable 3D Avatars):**
   - Màn hình tạo nhân vật với **3D Preview xoay 360° realtime**.
   - Nhập biệt danh (tối đa 20 ký tự).
   - 7 Vai trò khởi tạo:
     - *Trader Tập Sự*
     - *Thợ Săn Kèo*
     - *Cao Thủ Đu Đỉnh*
     - *Chiến Thần Bắt Đáy*
     - *Nhà Tiên Tri Nến*
     - *Ông Chú Ngồi Hóng*
     - *Cá Mập Giả Nghèo*
   - Tùy chỉnh kiểu tóc (short, spiky, bob, bun, ponytail), màu tóc, màu áo, màu quần, kính râm.
   - Nametag 3D và huy hiệu vai trò nổi trên đầu nhân vật.
   - Lưu trữ Guest Session gắn với localStorage và SQLite server, tự động khôi phục khi tải lại trang.

3. **Multiplayer Realtime Đa Người Chơi (Socket.IO):**
   - Hỗ trợ phòng chơi 20–30 người đồng thời.
   - Đồng bộ chuyển động mượt mà với thuật toán nội suy Lerp.
   - Kiểm tra tốc độ di chuyển trên server chống hack speed.
   - Hệ thống chat thời gian thực và thanh Emote nhanh (Vẫy tay, Cười lớn, Uống trà, Gãi đầu, Cổ vũ).

4. **NPC "Trà Đá Thị Trường" & Dialogue Engine:**
   - Bà cô bán nước người Việt ngồi quạt mát bên ấm trà, thân thiện và dí dỏm.
   - Nhận diện phạm vi người chơi trong bán kính 2.8m hiển thị biểu tượng `[E] Trò chuyện`. Bà tự động quay đầu nhìn người chơi khi tới gần.
   - Hộp thoại RPG với hiệu ứng gõ chữ (typewriter) và 6 tùy chọn hội thoại phong phú:
     1. *"Cô ơi, cho cháu xin một kèo!"*
     2. *"Hôm nay thị trường thế nào cô?"*
     3. *"Cho cháu cốc trà đá."*
     4. *"Cô kể chuyện trader đi!"*
     5. *"Cháu ngồi hóng thôi."*
     6. *"Tạm biệt cô!"*
   - Hơn 40 câu thoại hài hước, phản ánh tâm lý và văn hóa trader đời thường.

5. **Cơ Chế Xin Kèo 80/20 Phía Máy Chủ (Signal Decision Engine):**
   - 80% xác suất Bà đồng ý soi kèo và mở sổ tay cung cấp tín hiệu demo.
   - 20% xác suất Bà từ chối với lời khuyên bảo vệ vốn, giải tỏa tâm lý FOMO.
   - Sử dụng bộ sinh số ngẫu nhiên mật mã phía máy chủ (`crypto.randomInt`), có thể điều chỉnh tỷ lệ qua Admin Panel.
   - Cơ chế Cooldown 60 giây chống spam yêu cầu.

6. **Tín Hiệu Demo & Webhook Ingestion Sẵn Sàng (Live Feed Integration):**
   - Thẻ tín hiệu chi tiết: Symbol, Thị trường, Hướng lệnh (LONG/SHORT/WAIT), Vùng Entry, Stop Loss, Take Profit 1-2-3, Khung thời gian và Lời dặn dò của Bà.
   - Gắn nhãn bắt buộc: **`DEMO – KHÔNG PHẢI TÍN HIỆU THẬT`**.
   - Hỗ trợ nhận tín hiệu từ bên ngoài qua `POST /api/webhooks/signals` với bảo mật chữ ký HMAC-SHA256, chống replay attack và chống trùng lặp sự kiện (idempotency).

7. **Admin Dashboard Toàn Diện:**
   - Theo dõi số lượng online, danh sách người chơi, lịch sử yêu cầu xin kèo.
   - Điều chỉnh tỷ lệ chấp thuận 80/20 và thời gian cooldown tức thì.
   - Chuyển đổi giữa chế độ Mock Provider và Webhook Provider.
   - Nút kiểm thử nhanh Webhook trực tiếp từ giao diện.

8. **Âm Thanh Quê Hương Thư Giãn (Web Audio API Synthesizer):**
   - Tiếng chim sẻ ríu rít ban chiều, tiếng ve kêu êm dịu.
   - Tiếng rót trà đá róc rách, tiếng chén hoa cúc chạm nhau vui tai.
   - 100% không phụ thuộc file âm thanh bên ngoài, không lo vấn đề bản quyền.

---

## 🚀 Cài Đặt & Khởi Chạy

### Yêu Cầu Hệ Thống
- [Node.js](https://nodejs.org) phiên bản 20 trở lên (khuyên dùng Node 22+).
- Trình duyệt hiện đại hỗ trợ WebGL (Chrome, Edge, Safari, Firefox).

### 1. Cài Đặt Thư Viện
```bash
npm install
```

### 2. Chạy Môi Trường Phát Triển (Development)
```bash
npm run dev
```
Mở trình duyệt tại: [http://localhost:3000](http://localhost:3000)

### 3. Chạy Kiểm Thử Tự Động (Tests)
```bash
npm test
```

### 4. Build Bản Production
```bash
npm run build
npm start
```

---

## 🎮 Hướng Dẫn Điều Khiển

- **WASD / Phím Mũi Tên:** Di chuyển nhân vật.
- **Giữ Shift:** Chạy nhanh.
- **Rê Chuột:** Xoay camera 360° quanh nhân vật.
- **Cuộn Chuột:** Phóng to / Thu nhỏ khoảng cách camera.
- **Phím [E]:** Tương tác với Bà Bán Trà hoặc ngồi xuống ghế.
- **Thiết Bị Di Động:** Sử dụng cần điều khiển Joystick ảo ở góc trái và các nút cảm ứng nổi ở góc phải.

---

## 📁 Cấu Trúc Dự Án

```
├── ARCHITECTURE.md          # Tài liệu kiến trúc toàn diện
├── MIGRATION.md             # Kế hoạch và đánh giá di chuyển từ repo gốc
├── docs/
│   ├── ADMIN_GUIDE.md       # Hướng dẫn sử dụng Admin Dashboard
│   ├── WEBHOOK_GUIDE.md     # Hướng dẫn format payload và ký HMAC cho Webhook
│   └── TEST_RESULTS.md      # Báo cáo kết quả kiểm thử tự động
├── src/
│   ├── components/          # Giao diện React UI (HUD, Chat, Dialogue, Admin, Modal, Mobile)
│   ├── npc/                 # Model 3D & logic NPC Trà Đá Thị Trường
│   ├── player/              # Procedural Chibi Avatar Builder & PlayerController
│   ├── server/              # Backend Express, SQLite DB, Socket.IO, Webhook & Admin APIs
│   │   ├── db/              # SQLite Database Adapter (node:sqlite)
│   │   ├── routes/          # Webhook & Admin routes
│   │   ├── services/        # 80/20 Decision, Dialogue Engine, Signal Providers
│   │   ├── socket/          # Socket.IO Multiplayer Hub
│   │   └── validators/      # Zod validation schemas
│   ├── services/            # Client Multiplayer Service & Web Audio Sound Engine
│   ├── store/               # Zustand Game Store
│   ├── types/               # TypeScript data definitions
│   └── world/               # Three.js 3D Tea Stall World & Collision System
├── tests/                   # Automated Vitest test suite (80/20 math, Webhook HMAC, Dialogue)
├── server.ts                # Express + Socket.IO main server entrypoint
└── vite.config.ts           # Vite bundler configuration
```

---

## 📜 Bản Quyền & Giấy Phép (License)

Dự án phát triển dựa trên nền tảng mã nguồn mở dưới giấy phép **MIT License**. Mọi tài nguyên đồ họa 3D và âm thanh trong phiên bản "Trà Đá Thị Trường" được tạo hoàn toàn bằng procedural geometry và Web Audio synthesizer, đảm bảo tính trong sạch về bản quyền thương mại.
