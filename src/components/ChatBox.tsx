import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { multiplayerService } from '../services/multiplayerService';
import { soundEngine } from '../services/soundEngine';

export const ChatBox: React.FC = () => {
  const { chatMessages } = useGameStore();
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    soundEngine.playUiClick();
    multiplayerService.sendChat(inputText.trim());
    setInputText('');
  };

  const handleEmote = (emote: 'wave' | 'laugh' | 'sip_tea' | 'shrug' | 'cheer') => {
    soundEngine.playUiClick();
    if (emote === 'sip_tea') {
      soundEngine.playCupClink();
    }
    multiplayerService.sendEmote(emote);
  };

  return (
    <div className="fixed bottom-6 left-6 z-30 w-80 sm:w-96 max-w-[calc(100vw-3rem)] pointer-events-auto select-none">
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
  );
};
