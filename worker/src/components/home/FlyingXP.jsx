import { useState, useEffect } from 'react';
import { ZapIcon } from 'lucide-react';

export default function FlyingXP({ amount, startPos, targetRef, onComplete }) {
  const [position, setPosition] = useState(startPos);
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!startPos || !targetRef?.current) return;

    const rect = targetRef.current.getBoundingClientRect();
    const target = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    const timeout = setTimeout(() => {
      setPosition(target);
      setScale(0.3);
    }, 50);

    const fadeTimeout = setTimeout(() => {
      setOpacity(0);
    }, 600);

    const completeTimeout = setTimeout(() => {
      onComplete?.();
    }, 800);

    return () => {
      clearTimeout(timeout);
      clearTimeout(fadeTimeout);
      clearTimeout(completeTimeout);
    };
  }, [startPos, targetRef, onComplete]);

  if (!startPos) return null;

  return (
    <div
      className="fixed z-[100] pointer-events-none flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 text-white font-bold shadow-lg shadow-violet-500/50"
      style={{
        left: position.x,
        top: position.y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        transition: 'all 0.7s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      <ZapIcon className="h-4 w-4" />
      <span>+{amount}</span>
    </div>
  );
}
