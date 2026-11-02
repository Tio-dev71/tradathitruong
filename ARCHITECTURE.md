# Kiến Trúc Hệ Thống: Trà Đá Thị Trường

**Tagline:** *"Ngồi xuống uống chén trà, nghe bà soi thị trường."*

---

## 1. Tổng Quan Hệ Thống

"Trà Đá Thị Trường" là một ứng dụng Web 3D Multiplayer Social Sandbox kết hợp tương tác NPC và hệ thống cung cấp tín hiệu thị trường ở chế độ demo. Hệ thống cho phép 20–30 người chơi cùng lúc tham gia một không gian 3D quán trà đá vỉa hè Việt Nam dưới gốc cây đa, giao lưu qua chat realtime, điều khiển nhân vật góc nhìn thứ 3 và tương tác với NPC "Trà Đá Thị Trường" để nhận lời khuyên hoặc tín hiệu thị trường thông qua thuật toán 80/20 phía máy chủ.

```
+-----------------------------------------------------------------------------------------+
|                                    CLIENT (Browser)                                     |
|                                                                                         |
|  +------------------------+  +------------------------+  +---------------------------+  |
|  |     World3D Engine     |  |   PlayerController     |  |       AvatarSystem        |  |
|  |  (Three.js/WebGL Scene)|  | (WASD, Mouse, Mobile)  |  |  (Chibi Customization)    |  |
|  +------------------------+  +------------------------+  +---------------------------+  |
|              ^                           ^                             ^                |
|              |                           |                             |                |
|  +------------------------+  +------------------------+  +---------------------------+  |
|  |     NPCInteraction     |  |     DialogueEngine     |  |    UI HUD & Admin Dash    |  |
|  | (Proximity, Focus Cam) |  | (State Machine, Audio) |  |   (Zustand + Tailwind)    |  |
|  +------------------------+  +------------------------+  +---------------------------+  |
|                                          ^                                              |
|                                          |                                              |
|                           +-------------------------------+                             |
|                           |  MultiplayerService (Client)  |                             |
|                           +-------------------------------+                             |
+------------------------------------------|----------------------------------------------+
                                           | WebSocket (Socket.IO) & REST API
+------------------------------------------v----------------------------------------------+
|                                  SERVER (Node.js/Express)                               |
|                                                                                         |
|  +-----------------------------------------------------------------------------------+  |
|  |                            Socket.IO Multiplayer Hub                              |  |
|  |  - Session Validation   - Room Manager   - Movement Rate Limit   - Chat Filtering |  |
|  +-----------------------------------------------------------------------------------+  |
|            |                                |                               |           |
|            v                                v                               v           |
|  +--------------------+         +------------------------+      +--------------------+  |
|  |  Guest Session     |         | SignalDecisionService  |      |   WebhookAdapter   |  |
|  |  Identity Provider |         |  (80/20 Random Engine) |      | (HMAC Verification)|  |
|  +--------------------+         +------------------------+      +--------------------+  |
|            |                                |                               |           |
|            +--------------------------------v-------------------------------+           |
|                                             |                                           |
|                               +---------------------------+                             |
|                               |      SignalProvider       |                             |
|                               | - MockSignalProvider      |                             |
|                               | - WebhookSignalProvider   |                             |
|                               +---------------------------+                             |
|                                             |                                           |
|                               +---------------------------+                             |
|                               | Database Adapter (SQLite) |                             |
|                               |  (node:sqlite / Postgres) |                             |
|                               +---------------------------+                             |
+-----------------------------------------------------------------------------------------+
```

---

## 2. Các Phân Hệ Cốt Lõi (Core Subsystems)

### 2.1. World3D
- **Công nghệ:** Three.js, WebGL.
- **Bối cảnh:** Quán trà đá vỉa hè Việt Nam đặc trưng dưới bóng mát cây đa cổ thụ.
- **Thành phần:**
  - `GroundMesh`: Mặt sân gạch vỉa hè hoa văn/đất son đặc trưng.
  - `BanyanTree`: Cây đa tán rộng tỏa bóng mát, rễ phụ buông rủ.
  - `TeaStall`: Bàn trà gỗ mộc, gánh nước tre, ấm tích bọc ủ rơm, phích nước Rạng Đông đỏ, chén hoa cúc, điếu cày nứa, rổ lạc rang, đĩa hạt hướng dương.
  - `Seating`: Cụm ghế nhựa Song Long màu đỏ/xanh, đôn gỗ mộc mạc bố trí tự nhiên.
  - `Environment`: Biển hiệu gỗ "TRÀ ĐÁ THỊ TRƯỜNG", bảng đen ghi châm ngôn trader vui nhộn, tường vàng rêu phong ("Khoan cắt bê tông"), hàng rào tre, đèn lồng ấm.
  - `Atmosphere`: Ánh nắng chiều tà vàng ấm (directional light + soft shadow), đom đóm lập lòe, lá vàng bay nhẹ, khói bay từ chén trà nóng.
  - `CollisionEngine`: Hệ thống bounding boxes/cylinders ngăn người chơi xuyên tường, va chạm gốc cây, bàn nước và NPC.

### 2.2. PlayerController & AvatarSystem
- **Camera:** Third-person orbit camera mượt mà, hỗ trợ zoom chuột, bám sát nhân vật, kiểm soát góc nhìn không xuyên vật cản.
- **Điều khiển:**
  - Desktop: WASD / Phím mũi tên di chuyển, Shift chạy nhanh, Space emote/nhảy nhẹ, Phím E tương tác với NPC hoặc ghế ngồi.
  - Mobile: Virtual Joystick nổi góc trái, nút tương tác [Tương Tác] & [Chạy] nổi góc phải.
- **Hệ thống tạo nhân vật:**
  - Tên/Biệt danh (tối đa 20 ký tự).
  - 7 vai trò khởi tạo:
    1. *Trader Tập Sự*
    2. *Thợ Săn Kèo*
    3. *Cao Thủ Đu Đỉnh*
    4. *Chiến Thần Bắt Đáy*
    5. *Nhà Tiên Tri Nến*
    6. *Ông Chú Ngồi Hóng*
    7. *Cá Mập Giả Nghèo*
  - Tùy biến ngoại hình Chibi: Kiểu tóc, màu tóc, trang phục áo/quần, bảng màu áo.
  - Xem trước 3D tương tác ngay tại màn hình tạo nhân vật.
  - Guest Session được đồng bộ về backend và lưu localStorage để tự động khôi phục khi refresh.

### 2.3. MultiplayerService
- **Công nghệ:** Socket.IO với Zod validation trên từng gói tin.
- **Giao thức sự kiện:**
  - `player:join`: Gửi thông tin guest session, nhận danh sách người chơi hiện tại trong phòng.
  - `player:move`: Gửi vị trí `(x, y, z)` và góc quay `rotationY`. Client sử dụng Dead Reckoning / Linear Interpolation (`lerp`) để hiển thị mượt mà.
  - `player:emote`: Gửi hành động emote (chào, cười, gãi đầu, nhấp trà).
  - `player:sit`: Ngồi vào ghế nhựa/đôn gỗ quanh quán trà.
  - `player:leave`: Xóa nhân vật khi ngắt kết nối.
  - `chat:send` / `chat:message`: Chat realtime với bubble nổi trên đầu nhân vật và danh sách tin nhắn HUD.
  - Server xác thực tốc độ di chuyển chống hack speed, giới hạn tần suất gửi tin (rate limiting) và lọc nội dung vi phạm.

### 2.4. NPC "Trà Đá Thị Trường" & DialogueEngine
- **Hình tượng:** Bà cô bán nước Việt Nam ngồi quạt mát bên ấm trà, thân thiện, hóm hỉnh, thấu hiểu tâm lý trader.
- **Tương tác bán kính (Proximity Detection):** Khi người chơi đến gần trong phạm vi 2.5m, hiện gợi ý `Nhấn [E] để trò chuyện`. NPC quay đầu nhìn người chơi.
- **Dialogue State Machine:**
  - Menu hội thoại 6 tùy chọn:
    1. "Cô ơi, cho cháu xin một kèo!"
    2. "Hôm nay thị trường thế nào cô?"
    3. "Cho cháu cốc trà đá."
    4. "Cô kể chuyện trader đi!"
    5. "Cháu ngồi hóng thôi."
    6. "Tạm biệt cô!"
  - Hơn 40 câu thoại phong phú, dí dỏm, hỗ trợ hiệu ứng gõ chữ (typewriter effect), gắn liền với văn hóa trà đá vỉa hè và ngôn ngữ tài chính đời thường.

### 2.5. SignalDecisionService (Cơ Chế 80/20)
- **Thuật toán phía Server:**
  - 80% xác suất bà đồng ý soi kèo.
  - 20% xác suất bà từ chối (khuyên bảo dí dỏm: giữ vốn, uống nước hạ hoả, không FOMO).
  - Bộ sinh số ngẫu nhiên mật mã phía máy chủ (`crypto.randomInt` hoặc PRNG an toàn).
  - Tỷ lệ có thể điều chỉnh qua cấu hình (`DEFAULT_ACCEPT_RATE = 0.80`).
  - Cooldown mặc định 60 giây cho mỗi người chơi (lưu server state, chống spam API).

### 2.6. SignalProvider & WebhookAdapter
- **Interface trừu tượng:**
  ```typescript
  interface ISignalProvider {
    getAvailableSignal(role?: string): Promise<SignalData | null>;
    getSignalById(id: string): Promise<SignalData | null>;
    validateSignal(signal: unknown): boolean;
    getProviderStatus(): ProviderStatus;
  }
  ```
- **MockSignalProvider:** Dữ liệu mock sinh động gắn nhãn bắt buộc: `"DEMO – KHÔNG PHẢI TÍN HIỆU THẬT"`.
- **WebhookSignalProvider & Webhook Endpoint:**
  - Endpoint `POST /api/webhooks/signals`.
  - Xác thực chữ ký HMAC-SHA256 (`x-signature-sha256`) với `WEBHOOK_SECRET`.
  - Chống replay attack bằng timestamp header (giới hạn sai lệch 5 phút).
  - Chống trùng lặp (Idempotency) dựa trên `eventId`.
  - Schema validation bằng Zod.

### 2.7. Admin Dashboard
- Route `/admin` với xác thực Token/Credentials.
- Hiển thị trực quan:
  - Số lượng người chơi online realtime, danh sách người chơi.
  - Lịch sử xin kèo và thống kê tỷ lệ đồng ý/từ chối thực tế.
  - Tùy chỉnh tỷ lệ 80/20 và thời gian cooldown trực tiếp.
  - Chuyển đổi giữa chế độ Mock Provider và Webhook Provider.
  - Kiểm tra trạng thái và lịch sử nhận webhook signals.

---

## 3. Kiến Trúc Dữ Liệu (Data Models & Schemas)

```typescript
// Signal Schema
interface SignalData {
  id: string;
  symbol: string;         // e.g. "BTC/USDT (DEMO)", "VNINDEX (DEMO)"
  market: 'CRYPTO' | 'FOREX' | 'VN_STOCK' | 'COMMODITY';
  direction: 'LONG' | 'SHORT' | 'WAIT';
  entry: string;
  stopLoss: string;
  takeProfit: string[];
  timeframe: string;      // "15m", "1h", "4h", "1D"
  note: string;
  source: 'MOCK_ENGINE' | 'WEBHOOK';
  isDemo: true;
  createdAt: number;
  expiresAt: number;
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
}
```

---

## 4. Bảo Mật & Hiệu Năng
1. **Bảo mật:**
   - Server là Single Source of Truth cho session, vị trí hợp lệ, cooldown, và kết quả 80/20.
   - Tránh XSS: Mọi nickname và nội dung chat được sanitize nghiêm ngặt.
   - Webhook được bảo vệ bằng secret HMAC và kiểm tra timestamp.
2. **Hiệu năng Three.js:**
   - Sử dụng chung geometry/material (Instancing & Shared Materials).
   - Frustum culling tự động.
   - Bật shadow maps vừa phải (PCFSoftShadowMap, 1024x1024).
   - Giới hạn Pixel Ratio trên thiết bị di động (`Math.min(window.devicePixelRatio, 2)`).
   - Dọn dẹp tài nguyên (`dispose`) khi unmount scene.
