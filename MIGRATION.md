# Kế Hoạch Di Chuyển & Đánh Giá Mã Nguồn (Migration Plan)

Tài liệu này đánh giá hiện trạng source code của repository gốc **Đi Chùa Online** và đề ra phương án kế thừa, tái cơ cấu hoặc loại bỏ khi chuyển đổi thành **Trà Đá Thị Trường**.

---

## 1. Đánh Giá Hiện Trạng Repository Gốc

| Thành phần | Đặc điểm trong repo cũ | Đánh giá |
|---|---|---|
| `package.json` | React 19, Three.js 0.186, Vite 8, Express, Tailwind v4 | **REUSE & EXTEND**: Giữ nguyên nền tảng build hiện đại, bổ sung Socket.IO, Zod, Zustand và Vitest. |
| `server.ts` | 533 dòng, chủ yếu phục vụ kết nối TikTok LIVE Studio, SSE và điều khiển stage | **REPLACE**: Thay bằng Express Server module hóa kết hợp Socket.IO server, SignalDecisionService, Webhook API và Admin endpoints. |
| `src/three/templeScene.ts` & `Temple3D.tsx` | Sân khấu 2.5D cố định, camera đơn hướng, đọc FBX Mixamo thắp hương/lạy | **REPLACE**: Thay thế hoàn toàn bằng `World3D` sandbox 3D thực thụ, có ground, cây đa, quán trà, va chạm vật lý và camera orbit tự do. |
| `src/three/retarget.ts` | Tiện ích retarget animation FBX | **ISOLATE / OPTIONAL**: Giữ lại làm utility tham khảo khi tích hợp FBX/GLTF trong tương lai; MVP dùng procedural avatar rig. |
| `src/components/ChanhDienStage.tsx` | Hiển thị sân khấu chánh điện 2D/2.5D | **REMOVE**: Không phù hợp với gameplay 3D sandbox. |
| `src/components/Person.tsx` | Sprite 2D nhân vật quỳ lạy | **REMOVE**: Thay bằng Avatar 3D đa người chơi. |
| `src/components/DevoteeCrowd.tsx`, `LikeRain.tsx`, v.v. | Hiệu ứng mưa tim TikTok, dâng quà | **REMOVE**: Loại bỏ hoàn toàn. |
| `src/services/soundEngine.ts` | Chuông mõ, nhạc phật giáo, TTS đọc tên TikTok | **REFACTOR**: Tái cấu trúc thành Audio Engine cho quán trà đá (tiếng chim hót, tiếng rót trà, tiếng lách cách chén đĩa, âm thanh phản hồi UI). |
| `src/types/temple.ts` | Định nghĩa liên quan đến công đức, lễ chùa | **REPLACE**: Thay bằng `src/types/game.ts` và `src/types/signal.ts`. |
| `public/assets/` | File FBX, ảnh chánh điện, âm thanh chùa chiền | **ISOLATE**: Không sử dụng các tài nguyên chưa rõ bản quyền thương mại theo điều khoản LICENSE MIT. Tạo procedural 3D assets và audio Web Audio API tự tổng hợp hoặc royalty-free. |

---

## 2. Chiến Lược Di Chuyển Từng Bước (Phase-by-Phase Roadmap)

### Phase 0: Source Audit & Baseline Setup (ĐANG THỰC HIỆN)
- Kiểm tra branch mới (`feature/tra-da-thi-truong`).
- Cài đặt thêm các package cần thiết: `socket.io`, `socket.io-client`, `zod`, `zustand`, `vitest`.
- Viết tài liệu `ARCHITECTURE.md` và `MIGRATION.md`.

### Phase 1: Xây Dựng Thế Giới 3D Quán Trà Đá (World3D)
- Tạo module `src/world/`:
  - `WorldScene.ts`: Khởi tạo Three.js scene, renderer, camera, lighting (ánh chiều tà vàng ấm), shadows.
  - `TeaStallEnvironment.ts`: Dựng mặt đất vỉa hè gạch đỏ, cây đa cổ thụ rợp bóng, bàn ghế nhựa/đôn gỗ, ấm chén trà, điếu cày nứa, phích nước Rạng Đông, biển hiệu "TRÀ ĐÁ THỊ TRƯỜNG", bảng đen câu nói vui.
  - `CollisionSystem.ts`: Quản lý bounding boxes các vật cản (gốc cây, bàn trà, tường, NPC).

### Phase 2: Hệ Thống Nhân Vật & Điều Khiển (Avatar & PlayerController)
- Tạo module `src/player/`:
  - `AvatarBuilder.ts`: Procedural Chibi 3D model generator với các tùy biến (tóc, màu tóc, áo, quần, màu áo, vai trò).
  - `PlayerController.ts`: WASD + Shift sprint + Space jump/emote, điều khiển di chuyển mượt mà kèm camera orbit theo sau.
  - `CharacterCreationModal.tsx`: Màn hình "Chào Mừng Đến Quán Trà Đá Thị Trường", nhập biệt danh, chọn 7 vai trò, tùy biến diện mạo với 3D preview xoay được.
  - Lưu thông tin nhân vật vào localStorage và gửi lên server.

### Phase 3: Multiplayer Realtime (Socket.IO Engine)
- Backend:
  - Cấu hình Socket.IO server tích hợp trong `server.ts`.
  - Quản lý danh sách người chơi, validate tốc độ di chuyển, xử lý join/move/chat/leave/reconnect.
- Frontend:
  - `MultiplayerService.ts`: Kết nối socket, gửi vị trí local player và nhận vị trí remote players.
  - Nội suy chuyển động mượt mà (Lerp interpolation) cho các người chơi khác.
  - Hiển thị nametag, vai trò và chat bubble trên đầu nhân vật.

### Phase 4: NPC "Trà Đá Thị Trường" & DialogueEngine
- Tạo module `src/npc/`:
  - `TeaVendorNPC.ts`: Model 3D bà cô bán nước ngồi bên ấm trà, cử chỉ quạt mát, nhấp trà, trò chuyện.
  - `ProximityDetector.ts`: Nhận diện người chơi trong bán kính 2.5m, hiển thị chỉ dẫn tương tác [E].
  - `DialogueEngine.ts`: State machine quản lý hội thoại, 6 nhánh tùy chọn, hơn 40 câu thoại hài hước đời thường về thị trường, hiệu ứng gõ chữ và bubble thoại.

### Phase 5: Cơ Chế Xin Kèo 80/20 & Signal Provider (Demo)
- Backend:
  - `SignalDecisionService.ts`: Thuật toán sinh số ngẫu nhiên mật mã 80% Đồng ý / 20% Từ chối.
  - Cooldown 60 giây / user, chống spam rate limit.
  - `SignalProvider.ts`: Interface trừu tượng + `MockSignalProvider` cung cấp các tín hiệu demo đa dạng thị trường (Crypto, Forex, VN-Index) với nhãn bắt buộc `"DEMO – KHÔNG PHẢI TÍN HIỆU THẬT"`.
- Frontend:
  - Hiển thị phản hồi NPC và thẻ tín hiệu `SignalCard.tsx` đẹp mắt, chi tiết (Entry, Stop Loss, Take Profit, Timeframe, Note).

### Phase 6: Webhook Integration & Admin Dashboard
- Backend:
  - Endpoint `POST /api/webhooks/signals` xác thực HMAC-SHA256 signature, chống replay (timestamp), chống duplicate (`eventId`).
  - Database adapter lưu trữ signals và log yêu cầu.
  - Endpoint `/api/admin/` có bảo mật để điều chỉnh xác suất 80/20, thời gian cooldown, xem log và chuyển đổi provider.
- Frontend:
  - Màn hình `AdminDashboard.tsx`: Thống kê người online, lịch sử tín hiệu, cấu hình hệ thống realtime.
  - Test tool script gửi webhook giả lập để kiểm thử local.

### Phase 7: Hoàn Thiện Âm Thanh, Giao Diện, Kiểm Thử & Bàn Giao
- Tích hợp âm thanh ambient quán trà (tiếng ve chiều, tiếng chim, tiếng rót nước, tiếng gõ chén) qua Web Audio API.
- Tinh chỉnh giao diện HUD phong cách dân dã ấm áp (nâu gỗ, vàng trà, xanh lá).
- Hỗ trợ đầy đủ Desktop & Mobile (Virtual Joystick).
- Viết bài kiểm thử tự động (Unit test với Vitest cho 80/20, Cooldown, Dialogue, Webhook HMAC).
- Hoàn thiện tài liệu README.md và hướng dẫn tích hợp Webhook.

