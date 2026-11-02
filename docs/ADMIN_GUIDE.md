# Hướng Dẫn Quản Trị Hệ Thống (Admin Guide)

## 1. Giới Thiệu
Admin Control Panel của **Trà Đá Thị Trường** cho phép người quản trị theo dõi trạng thái realtime của phòng chơi 3D, điều chỉnh tỷ lệ chấp thuận 80/20 của Bà Bán Trà, quản lý thời gian cooldown, chuyển đổi nguồn cung cấp tín hiệu (Mock Engine vs Webhook Feed), và kiểm tra luồng nhận Webhook từ bên ngoài.

---

## 2. Cách Truy Cập
1. **Trên Giao Diện Game:**
   - Bấm vào nút **⚙️ Admin** ở góc trên bên phải màn hình HUD.
   - Nhập `ADMIN_TOKEN` (mặc định là `admin-tra-da-2026` hoặc giá trị trong biến môi trường `.env`).
2. **Qua REST API Trực Tiếp:**
   - Header: `x-admin-token: <ADMIN_TOKEN>` hoặc query parameter `?token=<ADMIN_TOKEN>`.
   - Endpoint: `GET /api/admin/stats`

---

## 3. Các Chức Năng Chính

### 3.1. Giám Sát Người Chơi Realtime
- Hiển thị số lượng người chơi đang có mặt trong quán trà.
- Bảng danh sách chi tiết: Biệt danh, Vai trò (Trader Tập Sự, Cao Thủ Đu Đỉnh,...), và Session ID.

### 3.2. Cấu Hình Xác Suất 80/20 Phía Máy Chủ
- **Tỷ lệ đồng ý (Accept Rate):**
  - Mặc định: `0.80` (80% Bà đồng ý soi kèo, 20% Bà từ chối với lời khuyên hài hước).
  - Có thể kéo thanh trượt từ `0%` (từ chối tất cả) đến `100%` (đồng ý tất cả).
  - Áp dụng ngay lập tức cho các yêu cầu xin kèo tiếp theo của người chơi mà không cần khởi động lại server.
- **Thời gian Cooldown:**
  - Mặc định: `60` giây cho mỗi người chơi.
  - Ngăn chặn người chơi spam yêu cầu xin kèo liên tục.

### 3.3. Chuyển Đổi Nguồn Tín Hiệu (Signal Provider Mode)
- **MOCK (Demo Engine):** Trả về các kịch bản phân tích kỹ thuật mô phỏng gắn nhãn rõ ràng `"DEMO – KHÔNG PHẢI TÍN HIỆU THẬT"`.
- **WEBHOOK (Live Feed):** Lấy tín hiệu thực được đẩy vào hệ thống từ các nền tảng bên ngoài (TradingView Alert, Telegram Bot, Python Bot).

### 3.4. Kiểm Thử Nhanh Webhook
- Bấm nút **"⚡ Gửi Test Webhook Signal"** trên bảng điều khiển.
- Hệ thống sẽ tự động tạo một payload tín hiệu hợp lệ, ký chữ ký HMAC-SHA256 chuẩn và đẩy vào cơ sở dữ liệu để kiểm tra tính năng nhận tín hiệu ngay lập tức.

