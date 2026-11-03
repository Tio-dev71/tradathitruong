# 🖥️ HƯỚNG DẪN DEPLOY TRÊN MAC MINI M1 LÀM SERVER
### Domain: `tradathitruong.io.vn` | Port: `3888`

Tài liệu hướng dẫn chi tiết cách biến máy tính **Mac mini M1 (Apple Silicon)** thành một máy chủ sản xuất (production server) chạy game 3D Web "Trà Đá Thị Trường" hoạt động 24/7.

---

## BƯỚC 1: Cấu hình DNS Tên Miền `tradathitruong.io.vn`

1. Truy cập trang quản lý tên miền (nhà cung cấp domain của bạn, e.g., Cloudflare, Namecheap, PA Việt Nam, Mắt Bão).
2. Tạo 2 bản ghi **A Record**:
   - **Type**: `A` | **Name**: `@` (hoặc `tradathitruong.io.vn`) | **Value**: `<IP_Công_Cộng_Của_Mac_Mini>` | **TTL**: Auto
   - **Type**: `A` | **Name**: `www` | **Value**: `<IP_Công_Cộng_Của_Mac_Mini>` | **TTL**: Auto
*(Để biết IP công cộng của Mac mini, mở Terminal gõ: `curl ifconfig.me`)*

---

## BƯỚC 2: Mở Cổng (Port Forwarding) Trên Router / Modem Wi-Fi

Vào trang quản trị Modem Wi-Fi nhà bạn (thường là `192.168.1.1`):
1. Tìm mục **Port Forwarding** (hoặc **Virtual Server**).
2. Thêm rule chuyển tiếp các cổng sau về IP nội bộ của Mac mini (ví dụ `192.168.1.28`):
   - **Cổng 80** (HTTP) -> `192.168.1.28:80`
   - **Cổng 443** (HTTPS) -> `192.168.1.28:443`
   - **Cổng 3888** (Node.js Port) -> `192.168.1.28:3888` (hoặc chỉ cần mở 80 & 443 nếu dùng Caddy/Nginx).

---

## BƯỚC 3: Chạy Script Tự Động Deploy

Mở Terminal trên Mac mini M1, truy cập vào thư mục dự án và chạy:
```bash
chmod +x deploy.sh
./deploy.sh
```

**Script `deploy.sh` sẽ tự động thực hiện**:
1. Nhận diện chip Apple Silicon M1 (`arm64`).
2. Tự động kiểm tra và cấu hình `PORT=3888` và `NODE_ENV=production`.
3. Tải các gói thư viện tối ưu (`npm install`).
4. Build bundle frontend production (`npm run build`).
5. Khởi chạy máy chủ ngầm (daemon) hoặc qua PM2.
6. Ghi log hoạt động tại thư mục `logs/out.log` và `logs/err.log`.

---

## BƯỚC 4: Bật Tự Động Cấp SSL HTTPS Bằng Caddy (Khuyên Dùng Trên Mac)

Caddy là web server tối ưu và dễ dùng nhất trên macOS M1. Nó tự động tạo chứng chỉ SSL HTTPS miễn phí (Let's Encrypt) và hỗ trợ hoàn hảo WebSocket Socket.IO.

1. **Cài đặt Caddy trên Mac mini**:
   ```bash
   brew install caddy
   ```
2. **Khởi chạy Caddy với file `Caddyfile` có sẵn trong dự án**:
   ```bash
   sudo caddy start
   ```
*(Lúc này domain `https://tradathitruong.io.vn` sẽ tự động có ổ khóa xanh HTTPS bảo mật và trỏ về game chạy tại port 3888).*

---

## BƯỚC 5: Cấu Hình Tự Khởi Động Khi Bật Máy (Auto-start on Boot)

Nếu bạn muốn khi Mac mini khởi động lại hoặc mất điện có lại, game tự động chạy lên:
1. **Cài PM2**:
   ```bash
   npm install -g pm2
   ```
2. **Lưu tiến trình vào startup**:
   ```bash
   pm2 startup
   ```
   *(Làm theo 1 dòng lệnh sudo mà terminal hiển thị)*
3. **Lưu danh sách app hiện tại**:
   ```bash
   pm2 save
   ```

---

## BƯỚC 6: Kiểm Tra Trạng Thái & Xem Logs

- **Xem log thời gian thực**:
  ```bash
  tail -f logs/out.log
  ```
- **Nếu dùng PM2**:
  ```bash
  pm2 status
  pm2 logs tradathitruong
  ```
- **Dừng server**:
  ```bash
  kill $(cat app.pid) # hoặc: pm2 stop tradathitruong
  ```
- **Deploy lại khi có code mới**:
  ```bash
  git pull
  ./deploy.sh
  ```

