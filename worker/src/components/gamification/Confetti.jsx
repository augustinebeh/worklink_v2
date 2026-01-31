import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

const COLORS = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];

function ConfettiPiece({ color, left, delay }) {
  return (
    <div
      className="absolute w-3 h-3 opacity-0"
      style={{
        left: `${left}%`,
        top: '-10px',
        backgroundColor: color,
        animation: `confetti-fall 3s ease-out ${delay}s forwards`,
        transform: `rotate(${Math.random() * 360}deg)`,
      }}
    />
  );
}

export function Confetti({ trigger, duration = 3000 }) {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (trigger) {
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        left: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setPieces(newPieces);

      const timer = setTimeout(() => setPieces([]), duration);
      return () => clearTimeout(timer);
    }
  }, [trigger, duration]);

  if (pieces.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      <style>{`
        @keyframes confetti-fall {
          0% {
            opacity: 1;
            transform: translateY(0) rotate(0deg);
          }
          100% {
            opacity: 0;
            transform: translateY(100vh) rotate(720deg);
          }
        }
      `}</style>
      {pieces.map((piece) => (
        <ConfettiPiece key={piece.id} {...piece} />
      ))}
    </div>,
    document.body
  );
}

export function LevelUpCelebration({ show, level, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show && !isVisible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center">
      <Confetti trigger={show} />
      <div
        className={`text-center transition-all duration-500 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <div className="text-6xl mb-4 animate-bounce">🎉</div>
        <h2 className="text-4xl font-bold text-gold-400 mb-2 drop-shadow-lg">
          LEVEL UP!
        </h2>
        <div className="text-7xl font-black text-white drop-shadow-2xl mb-2">
          {level}
        </div>
        <p className="text-xl text-dark-300">Keep up the great work!</p>
      </div>
    </div>,
    document.body
  );
}

export function FloatingXP({ amount, trigger }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (trigger && amount) {
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [trigger, amount]);

  if (!visible) return null;

  return createPortal(
    <div className="fixed top-1/3 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
      <div
        className="text-3xl font-bold text-accent-400 animate-float-up"
        style={{
          animation: 'float-up 1.5s ease-out forwards',
          textShadow: '0 2px 10px rgba(0,0,0,0.5)',
        }}
      >
        +{amount} XP
      </div>
      <style>{`
        @keyframes float-up {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          50% {
            opacity: 1;
            transform: translateY(-30px) scale(1.2);
          }
          100% {
            opacity: 0;
            transform: translateY(-60px) scale(0.8);
          }
        }
      `}</style>
    </div>,
    document.body
  );
}

export function AchievementUnlock({ achievement, show, onClose }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show && !isVisible) return null;

  return createPortal(
    <div className="fixed inset-x-4 top-20 z-[150] flex justify-center pointer-events-none">
      <div
        className={`bg-gradient-to-r from-gold-900/95 to-amber-900/95 backdrop-blur-md border border-gold-500/50 rounded-2xl p-4 flex items-center gap-4 shadow-2xl max-w-sm transition-all duration-500 ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-8 opacity-0'
        }`}
      >
        <div className="text-4xl animate-pulse">{achievement?.icon || '🏆'}</div>
        <div>
          <p className="text-gold-300 text-xs font-semibold uppercase tracking-wider">
            Achievement Unlocked!
          </p>
          <p className="text-white font-bold text-lg">{achievement?.name}</p>
          <p className="text-gold-200/70 text-sm">{achievement?.description}</p>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default Confetti;
