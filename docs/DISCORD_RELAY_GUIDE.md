# HƯỚNG DẪN KẾT NỐI TÍN HIỆU TỪ DISCORD BOT & TRADINGVIEW
### Dự án: TRÀ ĐÁ THỊ TRƯỜNG ("Ngồi xuống uống chén trà, nghe bà soi thị trường")

---

## 1. TỔNG QUAN VỀ LUỒNG TÍN HIỆU
Trong máy chủ Discord của bạn (như trong ảnh chụp: nhóm VIP, bot `Trading-Bot_TLS1`), bot đang bắn các thông báo lệnh dạng:
- **Tiêu đề:** `Lệnh nhóm VIP - Bot Liquidation`
- **Side:** `SHORT 🔴` / `LONG 🟢`
- **Coin:** `XRP/USD`, `XAU/USD` (Vàng), `BTC/USD`, `ETH/USD`...
- **Timeframe:** `m1`, `m5`, `1h`...
- **TP (Take Profit):** `$1.24`
- **Entry 1 & Entry 2:** `$1.25 (1%)` / `$1.25 (2%)`
- **SL (Stop Loss):** `$1.26`
- **Event:** `Entry` / `2/3 TP` / `Full TP`

Hệ thống **Trà Đá Thị Trường** đã xây dựng sẵn bộ parser chuyên dụng `DiscordSignalRelayService` (`src/server/services/discordSignalRelay.ts`) để bóc tách chính xác từng trường dữ liệu này và đẩy thẳng vào game trong thời gian thực!

---

## 2. CÁC PHƯƠNG ÁN KẾT NỐI (CHỌN 1 TRONG 2)

### 👉 PHƯƠNG ÁN A: GỬI TRỰC TIẾP TỪ TRADINGVIEW VÀO SERVER (KHUYÊN DÙNG NHẤT)
Vì bot Discord của bạn vốn dĩ nhận tín hiệu từ Webhook của TradingView, bạn hoàn toàn có thể:
1. Thêm webhook endpoint của game vào TradingView Alert Message:
   ```
   POST https://your-domain.com/api/webhooks/signals
   Header: x-signature-sha256: <HMAC_SHA256>
   ```
2. Ưu điểm: Tốc độ gần như tức thì (< 50ms), không phụ thuộc vào Discord API hay tình trạng mạng của bot Discord.

---

### 👉 PHƯƠNG ÁN B: CHUYỂN TIẾP TỪ DISCORD VÀO TRÀ ĐÁ THỊ TRƯỜNG (THEO ĐÚNG YÊU CẦU CỦA BẠN)
Nếu bạn muốn giữ nguyên luồng bot đang chạy trong các channel Discord (`#bot-m1`, `#bot-XAU`, `#bot-BTC`...) và lấy tín hiệu trực tiếp từ đó, có 2 cách cực kỳ đơn giản:

#### Cách B.1: Dùng Webhook Forwarder (n8n, Make.com, hoặc Webhook Relay Bot)
Bạn tạo một trigger khi có tin nhắn mới từ bot `Trading-Bot_TLS1` trong Discord và bắn HTTP POST payload sang:
```http
POST https://your-domain.com/api/webhooks/discord
Content-Type: application/json
```
**Payload mẫu:**
```json
{
  "id": "1302847291029384",
  "channel_id": "1300000000000001",
  "author": {
    "username": "Trading-Bot_TLS1",
    "bot": true
  },
  "embeds": [
    {
      "title": "Lệnh nhóm VIP - Bot Liquidation",
      "fields": [
        { "name": "Side:", "value": "SHORT 🔴" },
        { "name": "Coin:", "value": "XRP/USD" },
        { "name": "Timeframe:", "value": "m1" },
        { "name": "TP:", "value": "$1.24" },
        { "name": "Entry 1:", "value": "$1.25 (1%)" },
        { "name": "Entry 2:", "value": "$1.25 (2%)" },
        { "name": "SL:", "value": "$1.26" },
        { "name": "Event:", "value": "Entry" }
      ],
      "footer": { "text": "Nội dung chỉ có mục đích thông tin, không phải lời khuyên đầu tư | https://tradertuanloc.io.vn" }
    }
  ]
}
```

#### Test thử bằng cURL:
```bash
curl -X POST http://localhost:3000/api/webhooks/discord \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_curl_001",
    "embeds": [
      {
        "title": "Lệnh nhóm VIP - Bot Liquidation",
        "fields": [
          { "name": "Side:", "value": "SHORT 🔴" },
          { "name": "Coin:", "value": "XRP/USD" },
          { "name": "Timeframe:", "value": "m1" },
          { "name": "TP:", "value": "$1.24" },
          { "name": "Entry 1:", "value": "$1.25 (1%)" },
          { "name": "SL:", "value": "$1.26" }
        ]
      }
    ]
  }'
```

---

## 3. HIỆU ỨNG TỨC THÌ KHI CÓ TÍN HIỆU ĐƯỢC TIẾP NHẬN
1. **Lưu trữ & Phục vụ:** Tín hiệu được lưu ngay vào SQLite database với trạng thái `ACTIVE`.
2. **Bà Bán Trà & Thầy Đồ:** Khi user tương tác xin kèo, NPC sẽ ưu tiên lấy ngay tín hiệu thật này để trao cho người chơi kèm câu thoại hài hước!
3. **Thông báo toàn phòng (3D Chat & Loa Phường):**
   - Socket.IO tự động broadcast thông báo nổi trên khung chat của toàn bộ người chơi:
     `⚡ KÈO VIP MỚI TỪ BOT TRADING: [SHORT] XRP/USD (Entry: $1.25 | TP: $1.24 | SL: $1.26)! Ra xin bà hoặc thầy để nhận chi tiết!`
4. **Cập nhật Bảng Giá Vàng DJN:**
   - Nếu coin là `XAU/USD` hoặc `GOLD`, hệ thống sẽ tự động cập nhật ngay giá khớp lệnh lên màn hình LED khổng lồ của **Tiệm Vàng DJN** bên kia đường!
