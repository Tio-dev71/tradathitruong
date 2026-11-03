# 🪙 HƯỚNG DẪN KẾT NỐI VÍ PLISIO & NẠP XU (5u / 100 Xu)

Tài liệu kỹ thuật và hướng dẫn vận hành hệ thống nạp Xu tự động qua cổng thanh toán tiền mã hóa **Plisio (plisio.net)** cho "Trà Đá Thị Trường".

---

## 1. Cơ Chế Quy Đổi & Tiêu Dùng Xu

- **Tỷ giá quy ước**: **5 USDT = 100 Xu** (Tương đương 1 Xu = 0.05 USD / 5u cho 100 Xu).
- **Hạn mức nạp tối thiểu**: **5 USD** (100 Xu).
- **Chi phí trong game**:
  - 🍵 **1 Cốc Trà Đá**: `10 Xu` (Uống càng nhiều tăng tỷ lệ nhận kèo thơm từ Bà Bán Trà).
  - 🎲 **1 Quẻ Xóc Đĩa Thầy Đồ**: `15 Xu` (Tỷ lệ 60/40 phát tín hiệu hoặc từ chối).
- **Khi hết Xu**:
  - Tự động xuất hiện cảnh báo kèm nút **[⚡ Nạp Thêm Xu (5u = 100 Xu)]**.
  - Người chơi cũng có thể bấm nút **`[+ Nạp Xu]`** trên thanh HUD ở góc trên bên phải màn hình bất kỳ lúc nào.

---

## 2. Cách Lấy API Key Từ Tài Khoản Plisio

Dựa theo giao diện ví Plisio của bạn:
1. Đăng nhập vào [https://plisio.net](https://plisio.net).
2. Bấm vào tab **`API`** (nằm ở thanh menu trên cùng, cạnh tab Transactions và Solutions).
3. Copy mã **`Secret Key`** của bạn.
4. Mở file `.env` trong thư mục dự án và thêm dòng:
   ```env
   PLISIO_API_KEY=ma_secret_key_cua_ban_o_day
   ```
*(Lưu ý: Nếu chưa nhập key, hệ thống tự động chạy ở chế độ **Test Demo** và có nút **[Giả lập thanh toán]** để kiểm tra trọn vẹn luồng cộng xu mà không mất tiền thật).*

---

## 3. Các API Endpoints Thanh Toán Đã Xây Dựng

### 3.1. Tạo Hóa Đơn Nạp Xu
- **Method**: `POST`
- **Endpoint**: `/api/payments/plisio/create-invoice`
- **Body**:
  ```json
  {
    "sessionId": "session_guest_xyz",
    "amountUsd": 5,
    "currency": "USDT_TRX"
  }
  ```
- **Hỗ trợ các loại coin**:
  - `USDT_TRX` (Tether TRC-20, phí rẻ)
  - `USDT_BSC` (Tether BEP-20, BNB Smart Chain)
  - `BTC` (Bitcoin)
  - `ETH` (Ethereum)
  - `SOL` (Solana)
  - `TRX` (Tron)
  - `BNB` (BNB Chain)
- **Response**: Trả về `orderNumber`, `invoiceUrl`, `walletHash` (địa chỉ ví), `qrCode`, `cryptoAmount`.

---

### 3.2. API Kiểm Tra Xem Đã Nhận Được Tiền Chưa (Check Status)
- **Method**: `GET`
- **Endpoint**: `/api/payments/plisio/check/:orderNumber`
- **Ví dụ gọi**:
  ```bash
  curl http://localhost:3000/api/payments/plisio/check/ORD_1741123456_ABC12
  ```
- **Cách thức hoạt động**:
  1. Kiểm tra đơn hàng trong cơ sở dữ liệu SQLite.
  2. Nếu chưa thanh toán, tự động kết nối API của Plisio (`/api/v1/operations/...`) để kiểm tra trạng thái trên blockchain.
  3. Nếu Plisio xác nhận `completed`:
     - Tự động cộng Xu vào tài khoản (`credits = credits + 100`).
     - Bắn socket realtime `player:credits_update` cập nhật số Xu trên màn hình của người chơi ngay lập tức mà không cần F5.
     - Phát âm thanh leng keng nhận xu và thông báo lên kênh chat toàn quán trà.
- **Response khi thành công**:
  ```json
  {
    "success": true,
    "orderNumber": "ORD_1741123456_ABC12",
    "status": "completed",
    "paid": true,
    "credits": 100,
    "currentCredits": 190,
    "message": "Xác nhận thanh toán thành công từ ví Plisio! Đã cộng +100 Xu vào tài khoản."
  }
  ```

---

### 3.3. Webhook Tự Động Từ Plisio (IPN Callback)
- **Method**: `POST`
- **Endpoint**: `/api/payments/plisio/callback`
- **Cấu hình trên Plisio**: Plisio tự động bắn về endpoint này khi giao dịch trên mạng lưới blockchain được xác nhận (confirmations).

---

### 3.4. API Giả Lập Thanh Toán Thành Công (Dành Cho Test/Dev)
- **Method**: `POST`
- **Endpoint**: `/api/payments/plisio/simulate-success/:orderNumber`
- Cho phép đội ngũ dev hoặc tester kiểm tra trực tiếp hiệu ứng cộng xu trong game mà không cần chuyển coin thật.

---

## 4. Kiểm Thử Hệ Thống (Automated Tests)
Hệ thống đi kèm test suite tự động kiểm tra toàn bộ tỷ giá 5u/100xu, lưu trữ database, kiểm tra trạng thái và chống cộng đúp:
```bash
npm test
```
Toàn bộ 23 bài test tự động đều vượt qua thành công!
