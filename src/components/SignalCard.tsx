import React from 'react';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../services/soundEngine';

export const SignalCard: React.FC = () => {
  const { activeSignal, setActiveSignal } = useGameStore();

  if (!activeSignal) return null;

  const isLong = activeSignal.direction === 'LONG';
  const isShort = activeSignal.direction === 'SHORT';

  return (
    <div className="fixed top-20 right-6 z-40 w-full max-w-sm px-2 animate-in fade-in slide-in-from-right duration-300">
      <div className="relative bg-[#1c140d]/95 border-2 border-amber-500 rounded-2xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-md text-amber-100">
        {/* DEMO NOTICE BANNER (BẮT BUỘC) */}
        <div className="mb-3 px-3 py-1.5 rounded-lg bg-red-950/90 border border-red-600/80 text-center">
          <span className="text-[11px] font-extrabold tracking-wider text-red-200 uppercase">
            ⚠️ DEMO – KHÔNG PHẢI TÍN HIỆU THẬT
          </span>
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-amber-900/60">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-xl text-white">{activeSignal.symbol}</h3>
              <span
                className={`text-xs font-black px-2.5 py-0.5 rounded-md ${
                  isLong
                    ? 'bg-emerald-600 text-white'
                    : isShort
                    ? 'bg-rose-600 text-white'
                    : 'bg-amber-600 text-black'
                }`}
              >
                {activeSignal.direction}
              </span>
            </div>
            <p className="text-xs text-amber-400/80 font-mono mt-0.5">
              Khung: {activeSignal.timeframe} • Thị trường: {activeSignal.market}
            </p>
          </div>

          <button
            onClick={() => {
              soundEngine.playUiClick();
              setActiveSignal(null);
            }}
            className="text-amber-400/70 hover:text-white p-1 rounded-lg text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Signal Key Levels */}
        <div className="grid grid-cols-2 gap-2.5 my-3.5 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-black/40 border border-amber-950">
            <span className="text-stone-400 block mb-0.5">VÙNG ENTRY</span>
            <span className="font-bold text-amber-300 text-sm">{activeSignal.entry}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/40 border border-amber-950">
            <span className="text-stone-400 block mb-0.5">CẮT LỖ (SL)</span>
            <span className="font-bold text-rose-400 text-sm">{activeSignal.stopLoss}</span>
          </div>
        </div>

        {/* Take Profit Targets */}
        <div className="mb-3 p-2.5 rounded-xl bg-black/40 border border-amber-950 text-xs">
          <span className="text-stone-400 block mb-1 font-mono">MỤC TIÊU CHỐT LỜI (TP):</span>
          <div className="flex gap-2 flex-wrap">
            {activeSignal.takeProfit.map((tp, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 font-mono font-bold"
              >
                TP{idx + 1}: {tp}
              </span>
            ))}
          </div>
        </div>

        {/* NPC Analysis Note */}
        <div className="text-xs text-amber-200/90 italic bg-amber-950/40 p-2.5 rounded-xl border border-amber-900/40 mb-3">
          "{activeSignal.note}"
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-[10px] text-amber-400/60 font-mono">
          <span>Nguồn: {activeSignal.source}</span>
          <span>Bà Bán Trà Soi Kèo</span>
        </div>
      </div>
    </div>
  );
};
