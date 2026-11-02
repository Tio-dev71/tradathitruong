import React, { useRef, useState, useEffect } from 'react';

interface Props {
  onJoystickMove: (vector: { x: number; y: number }) => void;
  onInteract: () => void;
  onRunToggle: (isRunning: boolean) => void;
}

export const MobileControls: React.FC<Props> = ({ onJoystickMove, onInteract, onRunToggle }) => {
  const joystickBaseRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const maxRadius = 45;

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    updateKnob(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    updateKnob(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setKnobPos({ x: 0, y: 0 });
    onJoystickMove({ x: 0, y: 0 });
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

  const toggleRun = () => {
    const nextState = !isRunning;
    setIsRunning(nextState);
    onRunToggle(nextState);
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-30 sm:hidden flex flex-col justify-end p-6 select-none">
      <div className="flex items-end justify-between w-full">
        {/* Left: Virtual Joystick */}
        <div
          ref={joystickBaseRef}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="relative w-28 h-28 rounded-full bg-black/40 border-2 border-amber-600/60 backdrop-blur-sm pointer-events-auto flex items-center justify-center shadow-lg"
        >
          <div
            className="w-12 h-12 rounded-full bg-amber-500/80 border border-amber-300 shadow transition-transform duration-75"
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            }}
          />
        </div>

        {/* Right: Action Buttons */}
        <div className="flex flex-col gap-3 pointer-events-auto">
          {/* Run Toggle */}
          <button
            onTouchStart={toggleRun}
            className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-xs shadow-lg transition active:scale-95 ${
              isRunning
                ? 'bg-amber-500 text-black border-amber-200'
                : 'bg-black/50 text-amber-300 border-amber-700/70'
            }`}
          >
            🏃 Chạy
          </button>

          {/* Interact (E) */}
          <button
            onTouchStart={onInteract}
            className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 border-2 border-white text-stone-950 font-black text-sm flex items-center justify-center shadow-xl active:scale-95"
          >
            [E]
          </button>
        </div>
      </div>
    </div>
  );
};

