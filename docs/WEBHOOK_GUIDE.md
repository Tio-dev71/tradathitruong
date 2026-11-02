# Hướng Dẫn Tích Hợp Webhook Tín Hiệu (Webhook Integration Guide)

Endpoint này cho phép các hệ thống giao dịch, chỉ báo TradingView Alert, hoặc hệ thống phân tích bên ngoài gửi tín hiệu vào hệ thống **Trà Đá Thị Trường**.

---

## 1. Thông Tin Endpoint

- **URL:** `POST /api/webhooks/signals`
- **Content-Type:** `application/json`
- **Authentication:** Chữ ký số HMAC-SHA256 truyền qua header `x-signature-sha256`.

---

## 2. Tiêu Chuẩn Bảo Mật (Security Requirements)

1. **HMAC-SHA256 Signature:**
   - Chữ ký được tính từ `raw body` (dạng chuỗi JSON) kết hợp với `WEBHOOK_SECRET`.
   - Thuật toán: `HMAC_SHA256(rawBody, WEBHOOK_SECRET).hex()`.
   - Header bắt buộc: `x-signature-sha256: <hex_digest>`.
2. **Chống Tấn Công Phát Lại (Replay Attack Prevention):**
   - Trường `timestamp` (Unix epoch milliseconds) bắt buộc phải nằm trong khoảng sai lệch tối đa **5 phút** so với đồng hồ của server.
3. **Chống Trùng Lặp (Idempotency):**
   - Mỗi tín hiệu có một `eventId` duy nhất. Server sẽ từ chối với mã lỗi `409 Conflict` nếu `eventId` đã từng được xử lý.

---

## 3. Cấu Trúc Payload (JSON Schema)

```json
{
  "eventId": "tv_alert_20261103_001",
  "timestamp": 1793640966631,
  "symbol": "BTC/USDT",
  "market": "CRYPTO",
  "direction": "LONG",
  "entry": "88,500 - 88,900",
  "stopLoss": "87,200",
  "takeProfit": ["90,500", "92,000", "95,000"],
  "timeframe": "4H",
  "note": "Phân kỳ tăng RSI tại hỗ trợ EMA 200",
  "expiresInMinutes": 180
}
```

### Chi tiết các trường:
- `eventId` *(string, bắt buộc)*: Mã định danh duy nhất của sự kiện.
- `timestamp` *(number, bắt buộc)*: Thời gian tạo sự kiện (miligiây).
- `symbol` *(string, bắt buộc)*: Mã tài sản (ví dụ: `BTC/USDT`, `VNINDEX`, `XAU/USD`).
- `market` *(enum, bắt buộc)*: Một trong các giá trị: `"CRYPTO"` | `"FOREX"` | `"VN_STOCK"` | `"COMMODITY"`.
- `direction` *(enum, bắt buộc)*: `"LONG"` | `"SHORT"` | `"WAIT"`.
- `entry` *(string, bắt buộc)*: Vùng giá vào lệnh.
- `stopLoss` *(string, bắt buộc)*: Mức giá cắt lỗ (SL).
- `takeProfit` *(array of string, bắt buộc)*: Danh sách các mức giá chốt lời (TP).
- `timeframe` *(string, bắt buộc)*: Khung thời gian (ví dụ: `"15m"`, `"1H"`, `"4H"`, `"1D"`).
- `note` *(string, tùy chọn)*: Ghi chú nhận định kỹ thuật từ hệ thống.
- `expiresInMinutes` *(number, tùy chọn)*: Thời gian hiệu lực của tín hiệu tính bằng phút (mặc định 120 phút).

---

## 4. Code Mẫu Gửi Webhook

### Node.js / JavaScript
```javascript
import crypto from 'crypto';

const WEBHOOK_SECRET = 'tra-da-thi-truong-secret-key-2026';
const url = 'http://localhost:3000/api/webhooks/signals';

const payload = {
  eventId: 'node_alert_' + Date.now(),
  timestamp: Date.now(),
  symbol: 'ETH/USDT',
  market: 'CRYPTO',
  direction: 'LONG',
  entry: '2,650 - 2,670',
  stopLoss: '2,580',
  takeProfit: ['2,750', '2,880'],
  timeframe: '1H',
  note: 'Mô hình 2 đáy hoàn tất trên khung 1H',
  expiresInMinutes: 120
};

const rawBody = JSON.stringify(payload);
const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-signature-sha256': signature
  },
  body: rawBody
});

const result = await response.json();
console.log(result);
```

### Python
```python
import time
import json
import hmac
import hashlib
import requests

WEBHOOK_SECRET = "tra-da-thi-truong-secret-key-2026"
url = "http://localhost:3000/api/webhooks/signals"

payload = {
    "eventId": f"py_alert_{int(time.time() * 1000)}",
    "timestamp": int(time.time() * 1000),
    "symbol": "BTC/USDT",
    "market": "CRYPTO",
    "direction": "LONG",
    "entry": "89,000",
    "stopLoss": "87,500",
    "takeProfit": ["91,000", "93,000"],
    "timeframe": "4H",
    "note": "Breakout trendline",
    "expiresInMinutes": 180
}

raw_body = json.dumps(payload, separators=(',', ':'))
signature = hmac.new(
    WEBHOOK_SECRET.encode('utf-8'),
    raw_body.encode('utf-8'),
    hashlib.sha256
).hexdigest()

headers = {
    "Content-Type": "application/json",
    "x-signature-sha256": signature
}

res = requests.post(url, data=raw_body, headers=headers)
print(res.json())
```
