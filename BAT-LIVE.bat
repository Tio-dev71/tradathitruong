@echo off
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Chua cai Node.js. Tai ban LTS o https://nodejs.org roi chay lai file nay.
  pause
  exit /b 1
)
rem Install (or repair a half-finished install) when the app's runner is missing
if not exist "node_modules\.bin\tsx.cmd" (
  echo Dang cai thu vien, doi 1-2 phut...
  call npm install
  if not exist "node_modules\.bin\tsx.cmd" (
    echo Cai thu vien bi loi. Chup man hinh cua so nay gui nguoi ho tro.
    pause
    exit /b 1
  )
)
echo Dang bat Di Chua Online... Dong cua so nay la tat app.
echo Link cho TikTok LIVE Studio: http://lvh.me:3000/?view=stage
rem Live mode: the stage page never reloads by itself while streaming
set LIVE_MODE=1
start "" cmd /c "timeout /t 8 >nul & start http://localhost:3000"
npm run dev
pause
