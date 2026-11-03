# 🖥️ HƯỚNG DẪN DEPLOY TRÊN MAC MINI M1 LÀM SERVER
### Domain: `tradathitruong.io.vn` | Port: `3888` | Cloudflare Tunnel

Tài liệu hướng dẫn chi tiết cách kết nối domain **`tradathitruong.io.vn`** vào máy tính **Mac mini M1** thông qua **Cloudflare Tunnel (Zero Trust)** - phương pháp tối ưu nhất, không cần mở port modem, không cần IP tĩnh, tự động có SSL HTTPS bảo mật.

---

## CÁCH 1 (KHUYÊN DÙNG NHẤT): Cấu Hình Qua Cloudflare Tunnel Đã Có Sẵn

Vì bạn đã có sẵn Tunnel tên `mac-m1-server` đang chạy rất ổn định trên Mac mini M1 (đang chạy trang `autotrader.fun`), bạn **không cần cài thêm bất kỳ tool nào**, chỉ cần thêm route trên giao diện web của Cloudflare:

### Bước 1: Kích hoạt domain trên Cloudflare
1. Tại trang Cloudflare của domain `tradathitruong.io.vn`, nhấn nút màu xanh **"Continue to activation"**.
2. Thay đổi cặp Nameservers ở nhà đăng ký domain (Tenten, iNet, PA Việt Nam...) trỏ về 2 Nameserver của Cloudflare.
3. Đợi vài phút khi domain chuyển sang trạng thái **Active**.

### Bước 2: Thêm Route trên Cloudflare Tunnel `mac-m1-server`
Vào **Cloudflare Zero Trust** -> **Networks** -> **Tunnels** -> Chọn tunnel **`mac-m1-server`**:
1. Nhìn vào mục **Routes**, bấm nút **`+ Add route`** (hoặc tab **Public Hostname**).
2. **Thêm Route cho Game chính**:
   - **Subdomain**: Để trống (hoặc `@`)
   - **Domain**: Chọn `tradathitruong.io.vn`
   - **Path**: Để trống
   - **Type**: `HTTP`
   - **URL**: `localhost:3888`
   - Bấm **Save route**.
3. **Thêm Route cho Trang Admin riêng**:
   - Bấm **`+ Add route`** tiếp một lần nữa:
   - **Subdomain**: Điền `admin`
   - **Domain**: Chọn `tradathitruong.io.vn`
   - **Path**: Để trống
   - **Type**: `HTTP`
   - **URL**: `localhost:3888`
   - Bấm **Save route**.

*(Cloudflare sẽ tự động tạo bản ghi CNAME trỏ về tunnel và tự động cấp SSL HTTPS!)*

### Bước 3: Kiểm tra bật WebSockets
Vào Cloudflare Dashboard -> domain `tradathitruong.io.vn` -> Menu bên trái chọn **Network** -> Đảm bảo mục **WebSockets** đang bật **ON**.

---

## CÁCH 2: Cấu Hình Truyền Thống Bằng DNS A Record & Caddy

Nếu không dùng Cloudflare Tunnel:
1. Mở Terminal kiểm tra IP công cộng: `curl ifconfig.me`
2. Trỏ bản ghi A Record `@` và `www` về IP đó.
3. Mở port 80 và 443 trên Modem Wi-Fi trỏ về IP nội bộ Mac mini.
4. Chạy `sudo caddy start` với file `Caddyfile` có sẵn trong dự án.

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

