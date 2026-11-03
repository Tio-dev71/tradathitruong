import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { multiplayerService } from '../services/multiplayerService';
import { soundEngine } from '../services/soundEngine';

interface Props {
  onEmote?: (emote: 'wave' | 'laugh' | 'sip_tea' | 'shrug' | 'cheer') => void;
  onSendChat?: (text: string) => void;
}

export const ChatBox: React.FC<Props> = ({ onEmote, onSendChat }) => {
  const { chatMessages } = useGameStore();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTop = mobileScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isMobileOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputText.trim();
    if (!text) return;

    soundEngine.playUiClick();
    onSendChat?.(text);
    multiplayerService.sendChat(text);
    setInputText('');
  };

  const handleEmote = (emote: 'wave' | 'laugh' | 'sip_tea' | 'shrug' | 'cheer') => {
    soundEngine.playUiClick();
    if (emote === 'sip_tea') {
      soundEngine.playCupClink();
    }
    onEmote?.(emote);
    multiplayerService.sendEmote(emote);
  };

  return (
    <>
      {/* 1. Desktop Chat Box (Hidden on Mobile) */}
      <div className="hidden sm:block fixed bottom-6 left-6 z-30 w-80 sm:w-96 max-w-[calc(100vw-3rem)] pointer-events-auto select-none">
        <div className="bg-[#1e130a]/85 border border-amber-700/60 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden text-amber-100 flex flex-col">
          {/* Chat Header */}
          <div className="flex items-center justify-between px-3.5 py-2 border-b border-amber-900/40 bg-black/30">
            <div className="flex items-center gap-2">
              <span className="text-sm">💬</span>
              <span className="text-xs font-bold text-amber-300">HỘI QUÁN TRÀ ĐÁ</span>
            </div>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-amber-400/70 hover:text-white text-xs px-2 py-0.5 rounded cursor-pointer"
            >
              {isExpanded ? 'Thu gọn ▼' : 'Mở rộng ▲'}
            </button>
          </div>

          {/* Quick Emote Actions */}
          {isExpanded && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/20 border-b border-amber-950 overflow-x-auto text-xs">
              <button
                onClick={() => handleEmote('wave')}
                className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800/60 text-amber-200 cursor-pointer shrink-0"
                title="Vẫy tay chào bạn"
              >
                👋 Chào
              </button>
              <button
                onClick={() => handleEmote('laugh')}
                className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800/60 text-amber-200 cursor-pointer shrink-0"
                title="Cười lớn"
              >
                😂 Cười
              </button>
              <button
                onClick={() => handleEmote('sip_tea')}
                className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800/60 text-amber-200 cursor-pointer shrink-0"
                title="Nhấp ngụm trà nóng"
              >
                🍵 Uống trà
              </button>
              <button
                onClick={() => handleEmote('shrug')}
                className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800/60 text-amber-200 cursor-pointer shrink-0"
                title="Gãi đầu"
              >
                🤷 Gãi đầu
              </button>
              <button
                onClick={() => handleEmote('cheer')}
                className="px-2 py-1 rounded bg-amber-950/70 hover:bg-amber-900 border border-amber-800/60 text-amber-200 cursor-pointer shrink-0"
                title="Cổ vũ"
              >
                🎉 Cổ vũ
              </button>
            </div>
          )}

          {/* Messages Body */}
          {isExpanded && (
            <div ref={scrollRef} className="h-44 p-3 overflow-y-auto space-y-2 text-xs font-sans">
              {chatMessages.length === 0 ? (
                <p className="text-amber-300/40 italic text-center pt-8">
                  Chưa có cuộc đàm đạo nào. Hãy gửi lời chào đến quán!
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`leading-relaxed break-words rounded-lg p-1.5 ${
                      msg.isSystem
                        ? 'bg-amber-900/30 border border-amber-700/30 text-amber-200 italic'
                        : 'bg-black/20'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-amber-300">{msg.nickname}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/50">
                        {msg.role}
                      </span>
                    </div>
                    <span className="text-stone-100">{msg.text}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-2 border-t border-amber-900/40 bg-black/40 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              placeholder="Nói gì đó với mọi người..."
              maxLength={180}
              className="flex-1 bg-black/60 border border-amber-800/60 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs text-black transition cursor-pointer"
            >
              Gửi
            </button>
          </form>
        </div>
      </div>

      {/* 2. Mobile Floating Chat Toggle Button */}
      {!isMobileOpen && (
        <div className="sm:hidden fixed bottom-36 left-5 z-20 pointer-events-auto">
          <button
            onClick={() => {
              soundEngine.playUiClick();
              setIsMobileOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1e130a]/90 border border-amber-500/80 text-amber-200 text-xs font-bold backdrop-blur-md shadow-xl active:scale-95 cursor-pointer"
          >
            <span>💬</span>
            <span>Chat ({chatMessages.length})</span>
            {chatMessages.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>
        </div>
      )}

      {/* 3. Mobile Slide-Up Chat Drawer */}
      {isMobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="sm:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs pointer-events-auto"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Sheet Drawer */}
          <div className="sm:hidden fixed inset-x-3 bottom-3 z-50 max-h-[72vh] bg-[#1a1109]/98 border-2 border-amber-500 rounded-3xl p-3.5 shadow-2xl backdrop-blur-xl flex flex-col pointer-events-auto text-amber-100 animate-in slide-in-from-bottom duration-200">
            {/* Header with Close */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-amber-900/60">
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span className="text-xs font-black text-amber-300 uppercase tracking-wide">HỘI QUÁN TRÀ ĐÁ</span>
                <span className="text-[10px] text-amber-400/70 font-mono">({chatMessages.length} tin)</span>
              </div>
              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setIsMobileOpen(false);
                }}
                className="px-3 py-1 rounded-xl bg-amber-950 border border-amber-700/80 text-amber-300 text-xs font-bold active:scale-95 cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            {/* Emotes */}
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-amber-950 overflow-x-auto text-xs shrink-0">
              <button
                onClick={() => handleEmote('wave')}
                className="px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-800 text-amber-200 shrink-0 active:scale-95"
              >
                👋 Chào
              </button>
              <button
                onClick={() => handleEmote('laugh')}
                className="px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-800 text-amber-200 shrink-0 active:scale-95"
              >
                😂 Cười
              </button>
              <button
                onClick={() => handleEmote('sip_tea')}
                className="px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-800 text-amber-200 shrink-0 active:scale-95"
              >
                🍵 Uống trà
              </button>
              <button
                onClick={() => handleEmote('shrug')}
                className="px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-800 text-amber-200 shrink-0 active:scale-95"
              >
                🤷 Gãi đầu
              </button>
              <button
                onClick={() => handleEmote('cheer')}
                className="px-2.5 py-1 rounded-lg bg-amber-950/90 border border-amber-800 text-amber-200 shrink-0 active:scale-95"
              >
                🎉 Cổ vũ
              </button>
            </div>

            {/* Message Body */}
            <div ref={mobileScrollRef} className="flex-1 min-h-[160px] max-h-[36vh] overflow-y-auto space-y-2 p-1 text-xs font-sans">
              {chatMessages.length === 0 ? (
                <p className="text-amber-300/40 italic text-center pt-8">
                  Chưa có cuộc đàm đạo nào. Hãy gửi lời chào đến quán!
                </p>
              ) : (
                chatMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`leading-relaxed break-words rounded-xl p-2 ${
                      msg.isSystem
                        ? 'bg-amber-900/30 border border-amber-700/40 text-amber-200 italic'
                        : 'bg-black/35 border border-amber-900/30'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-amber-300 text-[11px]">{msg.nickname}</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/50">
                        {msg.role}
                      </span>
                    </div>
                    <span className="text-stone-100 text-[12px]">{msg.text}</span>
                  </div>
                ))
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="pt-2 mt-1 border-t border-amber-900/50 flex gap-2 shrink-0">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                maxLength={180}
                className="flex-1 bg-black/60 border border-amber-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 font-black text-xs text-black active:scale-95 cursor-pointer shadow"
              >
                Gửi
              </button>
            </form>
          </div>
        </>
      )}
    </>
  );
};

