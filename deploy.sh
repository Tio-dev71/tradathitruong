#!/usr/bin/env bash
# ==============================================================================
# 🍵 TRÀ ĐÁ THỊ TRƯỜNG - AUTOMATIC DEPLOYMENT SCRIPT (MAC MINI M1 / MACOS)
# Domain: tradathitruong.io.vn | Port: 3888
# ==============================================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

PORT=3888
APP_NAME="tradathitruong"
PID_FILE="$APP_DIR/app.pid"
LOG_DIR="$APP_DIR/logs"
OUT_LOG="$LOG_DIR/out.log"
ERR_LOG="$LOG_DIR/err.log"

mkdir -p "$LOG_DIR"

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}================================================================${NC}"
echo -e "${GREEN}  🍵 TRÀ ĐÁ THỊ TRƯỜNG - HỆ THỐNG DEPLOY TỰ ĐỘNG (MAC MINI M1)  ${NC}"
echo -e "${CYAN}  Domain: tradathitruong.io.vn  |  Port: ${PORT}                ${NC}"
echo -e "${CYAN}================================================================${NC}"

# 1. Kiểm tra môi trường Node.js & Architecture
echo -e "\n${BLUE}🔍 [1/5] Kiểm tra môi trường hệ thống...${NC}"
ARCH=$(uname -m)
OS=$(uname -s)
echo -e "   - Hệ điều hành: ${YELLOW}${OS} (${ARCH})${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Lỗi: Chưa tìm thấy Node.js! Vui lòng cài đặt Node.js qua brew:${NC}"
    echo -e "   brew install node"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "   - Node.js phiên bản: ${GREEN}${NODE_VERSION}${NC}"

# 2. Cấu hình file .env
echo -e "\n${BLUE}⚙️  [2/5] Kiểm tra cấu hình .env...${NC}"
if [ ! -f .env ]; then
    echo -e "   - Chưa có file .env, đang khởi tạo từ .env.example..."
    cp .env.example .env
fi

# Đảm bảo PORT=3888 và NODE_ENV=production
if grep -q "^PORT=" .env; then
    sed -i '' "s/^PORT=.*/PORT=${PORT}/" .env
else
    echo "PORT=${PORT}" >> .env
fi

if grep -q "^NODE_ENV=" .env; then
    sed -i '' "s/^NODE_ENV=.*/NODE_ENV=production/" .env
else
    echo "NODE_ENV=production" >> .env
fi

echo -e "   - Cổng hoạt động: ${GREEN}${PORT}${NC}"
echo -e "   - Môi trường: ${GREEN}production${NC}"

# 3. Cài đặt dependencies
echo -e "\n${BLUE}📦 [3/5] Cài đặt dependencies (npm install)...${NC}"
npm install --silent

# 4. Build sản phẩm production
echo -e "\n${BLUE}🏗️  [4/5] Build ứng dụng tối ưu production (npm run build)...${NC}"
npm run build

# 5. Khởi chạy server
echo -e "\n${BLUE}🚀 [5/5] Khởi động máy chủ ứng dụng...${NC}"

# Kiểm tra nếu đang có tiến trình chiếm port 3888
OCCUPIED_PID=$(lsof -ti :${PORT} || true)
if [ -n "$OCCUPIED_PID" ]; then
    echo -e "   - Đang tắt tiến trình cũ chiếm port ${PORT} (PID: ${OCCUPIED_PID})..."
    kill -9 "$OCCUPIED_PID" 2>/dev/null || true
    sleep 1
fi

# Khởi chạy bằng PM2 nếu có sẵn, hoặc bằng tiến trình nền nohup
if command -v pm2 &> /dev/null; then
    echo -e "   - Khởi động qua PM2 Process Manager..."
    pm2 delete "$APP_NAME" 2>/dev/null || true
    NODE_ENV=production PORT=${PORT} pm2 start "npx tsx server.ts" --name "$APP_NAME"
    pm2 save
else
    echo -e "   - Khởi động qua background daemon..."
    NODE_ENV=production PORT=${PORT} nohup npx tsx server.ts > "$OUT_LOG" 2> "$ERR_LOG" &
    NEW_PID=$!
    echo $NEW_PID > "$PID_FILE"
    echo -e "   - Tiến trình PID: ${GREEN}${NEW_PID}${NC}"
fi

sleep 2

# Kiểm tra xem server đã lắng nghe trên port 3888 chưa
if lsof -ti :${PORT} &> /dev/null; then
    echo -e "\n${GREEN}================================================================${NC}"
    echo -e "${GREEN}  🎉 DEPLOY THÀNH CÔNG RỰC RỠ!                                   ${NC}"
    echo -e "${CYAN}  Local URL : ${YELLOW}http://localhost:${PORT}${NC}"
    echo -e "${CYAN}  Domain URL: ${YELLOW}https://tradathitruong.io.vn${NC}"
    echo -e "${CYAN}  Log File  : ${YELLOW}${OUT_LOG}${NC}"
    echo -e "${GREEN}================================================================${NC}"
else
    echo -e "\n${RED}⚠️  Cảnh báo: Chưa phát hiện server lắng nghe trên port ${PORT}.${NC}"
    echo -e "Kiểm tra log lỗi tại: ${YELLOW}cat ${ERR_LOG}${NC}"
fi
