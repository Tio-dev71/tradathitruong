import React from 'react';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../services/soundEngine';
import { multiplayerService } from '../services/multiplayerService';

interface Props {
  onToggleSit: () => void;
  isSitting: boolean;
  cameraMode?: 'third' | 'first';
  onToggleCameraMode?: () => void;
  onToggleMic?: () => void;
  autoFollowCamera?: boolean;
  onToggleAutoFollow?: () => void;
}

export const HUD: React.FC<Props> = ({
  onToggleSit,
  isSitting,
  cameraMode = 'third',
  onToggleCameraMode,
  onToggleMic,
  autoFollowCamera = true,
  onToggleAutoFollow,
}) => {
  const {
    player,
    onlineCount,
    settings,
    toggleSound,
    setIsTopupOpen,
    cooldownRemaining,
    creditsNotification,
    marketTickers,
    isMicOn,
    isLocalSpeaking,
  } = useGameStore();

  const handleSoundToggle = () => {
    soundEngine.playUiClick();
    toggleSound();
    soundEngine.toggleMute();
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6 select-none">
      {/* Floating Credits / Event Notification */}
      {creditsNotification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300">
          <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-500 text-stone-950 font-black text-xs sm:text-sm shadow-2xl border-2 border-yellow-200 flex items-center gap-2.5 animate-pulse">
            <span className="text-xl">✨</span>
            <span>{creditsNotification}</span>
          </div>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-start justify-between w-full">
        {/* Top-Left: Logo & Tagline */}
        <div className="pointer-events-auto bg-[#1f140c]/85 border border-amber-600/60 rounded-xl sm:rounded-2xl p-2 sm:p-3 shadow-lg backdrop-blur-md shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            <span className="text-lg sm:text-2xl">🍵</span>
            <div>
              <h1 className="text-xs sm:text-base font-black text-amber-300 tracking-wide uppercase whitespace-nowrap">
                TRÀ ĐÁ THỊ TRƯỜNG
              </h1>
              <p className="hidden sm:block text-[11px] text-amber-200/80 italic font-serif">
                "Ngồi xuống uống chén trà, nghe bà soi thị trường."
              </p>
            </div>
          </div>
        </div>

        {/* Top-Center: Live Binance Market Tickers Ribbon */}
        {Object.keys(marketTickers).length > 0 && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#1a120c]/85 border border-amber-700/50 shadow-xl backdrop-blur-md pointer-events-auto">
            {Object.values(marketTickers).map((ticker) => {
              const isUp = ticker.change >= 0;
              return (
                <div
                  key={ticker.symbol}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-stone-900/90 border border-stone-800 text-[11px] font-mono shadow-inner"
                  title={`${ticker.symbol}: Giá $${ticker.price.toLocaleString()} (${isUp ? '+' : ''}${ticker.changePercent.toFixed(2)}%)`}
                >
                  <span className="font-bold text-amber-300">
                    {ticker.symbol === 'XAU/USD' ? '🥇 VÀNG' : ticker.symbol.replace('/USDT', '')}
                  </span>
                  <span className="text-white font-semibold">
                    ${ticker.price >= 100 ? ticker.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ticker.price.toFixed(3)}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isUp ? 'text-emerald-400 bg-emerald-950/80' : 'text-rose-400 bg-rose-950/80'}`}>
                    {isUp ? '▲ +' : '▼ '}{ticker.changePercent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Top-Right: Player Info, Online Counter & Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-2 pointer-events-auto shrink-0 flex-wrap justify-end">
          {/* Online Counter */}
          <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-black/60 border border-emerald-600/60 text-[11px] sm:text-xs font-bold text-emerald-300 backdrop-blur-sm shadow">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>{onlineCount}<span className="hidden sm:inline"> Online</span></span>
          </div>

          {/* Credits Badge (Số Xu) */}
          <div
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-950/90 to-yellow-950/90 border border-amber-500/80 text-[11px] sm:text-xs font-black text-amber-300 shadow backdrop-blur-sm"
            title="Số Xu của bạn (Dùng để uống trà đá và xem quẻ Thầy Đồ)"
          >
            <span className="text-xs sm:text-sm">🪙</span>
            <span>{player ? player.credits : 100} <span className="hidden sm:inline">Xu</span></span>
          </div>

          {/* Nút Nạp Xu qua Plisio (5u = 100 Xu) */}
          <button
            onClick={() => {
              soundEngine.playUiClick();
              setIsTopupOpen(true);
            }}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-500 hover:from-amber-400 to-yellow-500 hover:to-yellow-400 text-stone-950 text-[11px] sm:text-xs font-black shadow-lg transition active:scale-95 cursor-pointer pointer-events-auto border border-yellow-300"
            title="Nạp Xu qua ví Plisio (Tỷ lệ: 5 USDT = 100 Xu)"
          >
            <span className="text-xs sm:text-sm">⚡</span>
            <span>Nạp<span className="hidden sm:inline"> Xu</span></span>
          </button>

          {/* Sit / Stand button */}
          <button
            onClick={onToggleSit}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-bold transition shadow cursor-pointer flex items-center gap-1 ${
              isSitting
                ? 'bg-amber-500 text-black border-amber-300'
                : 'bg-black/60 text-amber-200 border-amber-800 hover:bg-black/80'
            }`}
            title="Ngồi / Đứng dậy"
          >
            <span>{isSitting ? '🧍' : '🪑'}</span>
            <span className="hidden sm:inline">{isSitting ? 'Đứng lên' : 'Ngồi ghế'}</span>
          </button>

          {/* First-person / Third-person View Toggle */}
          {onToggleCameraMode && (
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onToggleCameraMode();
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-bold transition shadow cursor-pointer ${
                cameraMode === 'first'
                  ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-amber-500/30'
                  : 'bg-black/60 text-amber-200 border-amber-800 hover:bg-black/80'
              }`}
              title="Đổi góc nhìn thứ 1 / thứ 3 (Phím [V] hoặc cuộn chuột)"
            >
              <span>{cameraMode === 'first' ? '👁️' : '🎥'}</span>
              <span className="hidden sm:inline">{cameraMode === 'first' ? 'Góc nhìn 1' : 'Góc nhìn 3'}</span>
              <span className="sm:hidden font-bold">{cameraMode === 'first' ? '1' : '3'}</span>
            </button>
          )}

          {/* Third-person: Auto-Follow vs Free Mouse Camera Toggle */}
          {cameraMode === 'third' && onToggleAutoFollow && (
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onToggleAutoFollow();
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-bold transition shadow cursor-pointer ${
                autoFollowCamera
                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/80 hover:bg-amber-900/90'
                  : 'bg-indigo-950/80 text-indigo-300 border-indigo-500/80 hover:bg-indigo-900/90'
              }`}
              title="Chế độ camera: Tự động bám sau lưng / Tự do điều chỉnh chuột (Phím [C])"
            >
              <span>{autoFollowCamera ? '🔄' : '🖱️'}</span>
              <span className="hidden sm:inline">{autoFollowCamera ? 'Cam Bám' : 'Cam Chuột'}</span>
            </button>
          )}

          {/* Live Voice Chat Mic Toggle */}
          {onToggleMic && (
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onToggleMic();
              }}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border text-[11px] sm:text-xs font-bold transition shadow cursor-pointer ${
                isMicOn
                  ? isLocalSpeaking
                    ? 'bg-emerald-600 text-white border-emerald-300 animate-pulse ring-2 ring-emerald-400/80 shadow-emerald-500/50 shadow-lg'
                    : 'bg-emerald-950/90 text-emerald-300 border-emerald-500/80 hover:bg-emerald-900'
                  : 'bg-black/60 text-stone-400 border-stone-800 hover:text-white hover:border-amber-800'
              }`}
              title={
                isMicOn
                  ? isLocalSpeaking
                    ? 'Đang nói vào mic (Click để tắt)'
                    : 'Mic đang bật (Click để tắt mic)'
                  : 'Bật Micro đàm thoại trực tiếp với mọi người'
              }
            >
              <span>{isMicOn ? (isLocalSpeaking ? '🗣️' : '🎙️') : '🔇'}</span>
              <span className="hidden sm:inline">
                {isMicOn ? (isLocalSpeaking ? 'Đang nói...' : 'Mic Bật') : 'Mic Tắt'}
              </span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            className="p-1 sm:p-2 rounded-lg sm:rounded-xl bg-black/60 hover:bg-black/80 border border-amber-800 text-amber-300 transition shadow cursor-pointer text-xs sm:text-sm"
            title={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {settings.soundEnabled ? '🔊' : '🔇'}
          </button>
        </div>
      </div>

      {/* Bottom Center: Keyboard / Control Guide */}
      <div className="flex justify-center w-full">
        <div className="hidden md:flex items-center gap-3 px-4 py-2 rounded-full bg-black/50 border border-amber-800/40 text-amber-200/80 text-xs backdrop-blur-sm pointer-events-auto">
          <span><b className="text-amber-400">WASD</b> Di chuyển</span>
          <span>•</span>
          <span><b className="text-amber-400">Space</b> Nhảy</span>
          <span>•</span>
          <span><b className="text-amber-400">Shift</b> Chạy nhanh</span>
          <span>•</span>
          <span><b className="text-amber-400">[V]</b> Góc nhìn 1/3</span>
          <span>•</span>
          <span><b className="text-amber-400">[C]</b> Cam bám/chuột</span>
          <span>•</span>
          <span><b className="text-amber-400">Chuột</b> Xoay camera & cuộn zoom</span>
          <span>•</span>
          <span><b className="text-amber-400">[E]</b> Tương tác</span>
        </div>
      </div>
    </div>
  );
};

