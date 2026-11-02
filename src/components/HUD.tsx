import React from 'react';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../services/soundEngine';
import { multiplayerService } from '../services/multiplayerService';

interface Props {
  onToggleSit: () => void;
  isSitting: boolean;
}

export const HUD: React.FC<Props> = ({ onToggleSit, isSitting }) => {
  const {
    player,
    onlineCount,
    settings,
    toggleSound,
    setIsAdminOpen,
    cooldownRemaining,
    creditsNotification,
    marketTickers,
  } = useGameStore();

  const handleSoundToggle = () => {
    soundEngine.playUiClick();
    toggleSound();
    soundEngine.toggleMute();
  };

  const handleAdminToggle = () => {
    soundEngine.playUiClick();
    setIsAdminOpen(true);
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
        <div className="pointer-events-auto bg-[#1f140c]/85 border border-amber-600/60 rounded-2xl p-3 shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🍵</span>
            <div>
              <h1 className="text-sm sm:text-base font-black text-amber-300 tracking-wide uppercase">
                TRÀ ĐÁ THỊ TRƯỜNG
              </h1>
              <p className="text-[11px] text-amber-200/80 italic font-serif">
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
        <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
          {/* Online Counter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/60 border border-emerald-600/60 text-xs font-bold text-emerald-300 backdrop-blur-sm shadow">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{onlineCount} Online</span>
          </div>

          {/* Credits Badge (Số Xu) */}
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-950/90 to-yellow-950/90 border border-amber-500/80 text-xs font-black text-amber-300 shadow-md backdrop-blur-sm"
            title="Số Xu của bạn (Dùng để uống trà đá và xem quẻ Thầy Đồ)"
          >
            <span className="text-sm">🪙</span>
            <span>{player ? player.credits : 100} Xu</span>
          </div>

          {/* Tea Consumed & Luck Boost Badge */}
          <div
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/60 text-xs font-bold text-emerald-300 shadow backdrop-blur-sm"
            title={`Đã uống ${player ? player.teaCount : 0} cốc. Mỗi cốc tăng +5% xác suất được Bà Bán Trà phán kèo VIP!`}
          >
            <span className="text-sm">🍵</span>
            <span>{player ? player.teaCount : 0} Ly (+{Math.min(18, (player ? player.teaCount : 0) * 5)}% Lộc)</span>
          </div>

          {/* Player Badge */}
          {player && (
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#2b1b11]/90 border border-amber-700/60 text-xs shadow">
              <span className="font-bold text-white">{player.nickname}</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-600 text-stone-950 font-extrabold text-[10px]">
                {player.role}
              </span>
            </div>
          )}

          {/* Cooldown Status Badge */}
          {cooldownRemaining > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/90 border border-red-600/80 text-xs text-red-200 font-mono shadow">
              <span>⏳ Chờ kèo:</span>
              <span className="font-bold text-red-400">{cooldownRemaining}s</span>
            </div>
          )}

          {/* Sit / Stand button */}
          <button
            onClick={onToggleSit}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow cursor-pointer ${
              isSitting
                ? 'bg-amber-500 text-black border-amber-300'
                : 'bg-black/60 text-amber-200 border-amber-800 hover:bg-black/80'
            }`}
            title="Ngồi / Đứng dậy"
          >
            {isSitting ? '🧍 Đứng lên' : '🪑 Ngồi ghế'}
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 border border-amber-800 text-amber-300 transition shadow cursor-pointer text-sm"
            title={settings.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
          >
            {settings.soundEnabled ? '🔊' : '🔇'}
          </button>

          {/* Admin Dashboard */}
          <button
            onClick={handleAdminToggle}
            className="px-2.5 py-1.5 rounded-xl bg-amber-950 hover:bg-amber-900 border border-amber-600 text-amber-300 text-xs font-bold transition shadow cursor-pointer"
            title="Quản trị hệ thống"
          >
            ⚙️ Admin
          </button>
        </div>
      </div>

      {/* Bottom Center: Keyboard / Control Guide */}
      <div className="flex justify-center w-full">
        <div className="hidden md:flex items-center gap-4 px-4 py-2 rounded-full bg-black/50 border border-amber-800/40 text-amber-200/80 text-xs backdrop-blur-sm pointer-events-auto">
          <span><b className="text-amber-400">WASD</b> Di chuyển</span>
          <span>•</span>
          <span><b className="text-amber-400">Shift</b> Chạy nhanh</span>
          <span>•</span>
          <span><b className="text-amber-400">Chuột</b> Xoay camera & cuộn zoom</span>
          <span>•</span>
          <span><b className="text-amber-400">[E]</b> Trò chuyện với Bà Bán Trà</span>
        </div>
      </div>
    </div>
  );
};

