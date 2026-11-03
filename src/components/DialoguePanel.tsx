import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { multiplayerService } from '../services/multiplayerService';
import { soundEngine } from '../services/soundEngine';

export const DialoguePanel: React.FC = () => {
  const { dialogue, closeDialogue, cooldownRemaining, setIsTopupOpen } = useGameStore();
  const [displayedText, setDisplayedText] = useState('');

  // Typewriter effect
  useEffect(() => {
    if (!dialogue.isOpen) {
      setDisplayedText('');
      return;
    }

    let i = 0;
    setDisplayedText('');
    const fullText = dialogue.text;
    const timer = setInterval(() => {
      if (i < fullText.length) {
        setDisplayedText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
      }
    }, 20);

    return () => clearInterval(timer);
  }, [dialogue.text, dialogue.isOpen]);

  if (!dialogue.isOpen) return null;

  const handleOptionClick = (action: string) => {
    soundEngine.playUiClick();

    if (action === 'close' || action === 'leave') {
      closeDialogue();
      return;
    }

    if (action === 'open_topup') {
      closeDialogue();
      setIsTopupOpen(true);
      return;
    }

    if (action === 'thay_do_signal') {
      soundEngine.playXocDiaShake();
    } else if (action === 'tea_order') {
      soundEngine.playPourTea();
      soundEngine.playCupClink();
    }

    multiplayerService.interactNpc(action as any);
  };

  const isThayDo = dialogue.speaker === 'Thầy Đồ Xóc Đĩa';

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-3xl px-4 pointer-events-auto">
      <div className={`relative bg-gradient-to-b ${isThayDo ? 'from-[#23172e]/95 to-[#120a1c]/95 border-purple-500/80' : 'from-[#2a1c12]/95 to-[#160d08]/95 border-amber-600/80'} border-2 rounded-3xl p-5 sm:p-6 shadow-[0_10px_35px_rgba(0,0,0,0.8)] backdrop-blur-md text-amber-100`}>
        {/* Top Header: NPC Persona Badge */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-amber-900/60">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-full ${isThayDo ? 'bg-gradient-to-tr from-purple-800 to-red-600 border-red-300' : 'bg-gradient-to-tr from-amber-700 to-amber-500 border-amber-300'} border flex items-center justify-center text-xl shadow`}>
              {isThayDo ? '🎲' : '👵'}
            </div>
            <div>
              <h2 className={`font-bold text-lg leading-tight ${isThayDo ? 'text-purple-300' : 'text-amber-300'}`}>
                {isThayDo ? 'THẦY ĐỒ XÓC ĐĨA' : 'TRÀ ĐÁ THỊ TRƯỜNG'}
              </h2>
              <p className="text-xs text-amber-200/70">
                {isThayDo ? 'Xóc đĩa tâm linh • Soi quẻ nến tỷ lệ 60/40' : 'Chuyên gia soi nến vỉa hè • Kinh nghiệm 20 năm cắt lỗ'}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              soundEngine.playUiClick();
              closeDialogue();
            }}
            className="text-amber-400 hover:text-white px-3 py-1 rounded-xl bg-amber-950/80 border border-amber-800 text-xs font-semibold cursor-pointer transition"
          >
            Đóng [ESC]
          </button>
        </div>

        {/* NPC Speech Box */}
        <div className="min-h-[64px] mb-5 bg-black/40 border border-amber-900/40 rounded-2xl p-4 text-base sm:text-lg leading-relaxed text-amber-100 font-medium">
          <p>{displayedText}</p>
        </div>

        {/* Dialogue Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {dialogue.options.map((opt) => {
            const isSignalReq = opt.action === 'signal_request';
            const isOnCooldown = isSignalReq && cooldownRemaining > 0;

            return (
              <button
                key={opt.id}
                disabled={isOnCooldown}
                onClick={() => handleOptionClick(opt.action)}
                className={`py-2.5 px-4 rounded-xl text-left font-medium text-sm transition flex items-center justify-between border cursor-pointer ${
                  isOnCooldown
                    ? 'bg-stone-900/60 text-stone-500 border-stone-800 cursor-not-allowed'
                    : isSignalReq
                    ? 'bg-gradient-to-r from-amber-600/90 to-amber-700/90 hover:from-amber-500 hover:to-amber-600 text-white font-bold border-amber-400 shadow-[0_0_15px_rgba(217,119,6,0.3)]'
                    : 'bg-amber-950/60 hover:bg-amber-900/70 text-amber-200 border-amber-800/60 hover:border-amber-600'
                }`}
              >
                <span>{opt.label}</span>
                {isOnCooldown ? (
                  <span className="text-xs bg-red-950 text-red-300 px-2 py-0.5 rounded-full border border-red-800">
                    Chờ {cooldownRemaining}s
                  </span>
                ) : isSignalReq ? (
                  <span className="text-xs bg-amber-950 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500">
                    Tỷ lệ 80/20
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

