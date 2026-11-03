import React, { useRef, useState } from 'react';

interface Props {
  onJoystickMove: (vector: { x: number; y: number }) => void;
  onInteract: () => void;
  onRunToggle: (isRunning: boolean) => void;
  onToggleSit?: () => void;
  isSitting?: boolean;
  onToggleCameraMode?: () => void;
  cameraMode?: 'third' | 'first';
  canInteract?: boolean;
  onToggleMic?: () => void;
  isMicOn?: boolean;
  isSpeaking?: boolean;
}

export const MobileControls: React.FC<Props> = ({
  onJoystickMove,
  onInteract,
  onRunToggle,
  onToggleSit,
  isSitting = false,
  onToggleCameraMode,
  cameraMode = 'third',
  canInteract = false,
  onToggleMic,
  isMicOn = false,
  isSpeaking = false,
}) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const activeTouchIdRef = useRef<number | null>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isRunning, setIsRunning] = useState(false);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (activeTouchIdRef.current !== null) return;
    const touch = e.changedTouches[0];
    activeTouchIdRef.current = touch.identifier;
    updateKnob(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (activeTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
        updateKnob(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
        break;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (activeTouchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeTouchIdRef.current) {
        activeTouchIdRef.current = null;
        setKnobPos({ x: 0, y: 0 });
        onJoystickMove({ x: 0, y: 0 });
        break;
      }
    }
  };

  const updateKnob = (clientX: number, clientY: number) => {
    if (!joystickBaseRef.current) return;
    const rect = joystickBaseRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    setKnobPos({ x: dx, y: dy });
    onJoystickMove({ x: dx / maxRadius, y: dy / maxRadius });
  };

  const toggleRun = (e: React.TouchEvent | React.MouseEvent) => {
    e.stopPropagation();
    const nextState = !isRunning;
    setIsRunning(nextState);
    onRunToggle(nextState);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 sm:hidden flex flex-col justify-end p-4 pb-6 select-none touch-none">
      <div className="flex items-end justify-between w-full">
        {/* Left: Virtual Joystick */}
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          className="relative w-26 h-26 rounded-full bg-black/45 border-2 border-amber-600/70 backdrop-blur-md pointer-events-auto flex items-center justify-center shadow-2xl touch-none active:border-amber-400"
        >
          {/* Inner Guideline Cross */}
          <div className="absolute w-16 h-[1px] bg-amber-500/20 pointer-events-none" />
          <div className="absolute h-16 w-[1px] bg-amber-500/20 pointer-events-none" />

          {/* Draggable Knob */}
          <div
            className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-2 border-white shadow-xl pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          />
        </div>

        {/* Right: Action Buttons Cluster */}
        <div className="flex flex-col items-end gap-2.5 pointer-events-auto">
          {/* Secondary helper buttons row */}
          <div className="flex items-center gap-2">
            {/* Live Voice Chat Mic Toggle */}
            {onToggleMic && (
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onToggleMic();
                }}
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-lg transition active:scale-95 ${
                  isMicOn
                    ? isSpeaking
                      ? 'bg-emerald-600 text-white border-emerald-300 animate-pulse ring-2 ring-emerald-400'
                      : 'bg-emerald-950/90 text-emerald-300 border-emerald-500'
                    : 'bg-black/60 text-stone-400 border-amber-700/80'
                }`}
                title="Bật / Tắt Mic"
              >
                <span>{isMicOn ? (isSpeaking ? '🗣️' : '🎙️') : '🔇'}</span>
              </button>
            )}

            {/* View Mode Toggle */}
            {onToggleCameraMode && (
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onToggleCameraMode();
                }}
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-lg transition active:scale-95 ${
                  cameraMode === 'first'
                    ? 'bg-amber-500 text-black border-yellow-200'
                    : 'bg-black/60 text-amber-200 border-amber-700/80'
                }`}
                title="Góc nhìn 1 / 3"
              >
                <span>{cameraMode === 'first' ? '👁️' : '🎥'}</span>
              </button>
            )}

            {/* Sit / Stand Toggle */}
            {onToggleSit && (
              <button
                onTouchStart={(e) => {
                  e.stopPropagation();
                  onToggleSit();
                }}
                className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-lg transition active:scale-95 ${
                  isSitting
                    ? 'bg-amber-500 text-black border-yellow-200'
                    : 'bg-black/60 text-amber-200 border-amber-700/80'
                }`}
                title="Ngồi / Đứng"
              >
                <span>{isSitting ? '🧍' : '🪑'}</span>
              </button>
            )}

            {/* Run Toggle */}
            <button
              onTouchStart={toggleRun}
              className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-lg transition active:scale-95 ${
                isRunning
                  ? 'bg-amber-500 text-black border-yellow-200'
                  : 'bg-black/60 text-amber-300 border-amber-700/80'
              }`}
              title="Chạy nhanh"
            >
              <span>🏃</span>
            </button>
          </div>

          {/* Primary Action Button: [E] Interact */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onInteract();
            }}
            className={`w-18 h-18 rounded-full border-2 flex flex-col items-center justify-center shadow-2xl transition active:scale-90 ${
              canInteract
                ? 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-300 border-white text-stone-950 animate-pulse ring-4 ring-amber-400/60'
                : 'bg-gradient-to-tr from-amber-700 to-amber-500 border-amber-200 text-stone-950 opacity-90'
            }`}
          >
            <span className="font-black text-base leading-none">[E]</span>
            <span className="text-[10px] font-bold leading-tight mt-0.5">
              {canInteract ? 'Nói chuyện' : 'Tương tác'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

