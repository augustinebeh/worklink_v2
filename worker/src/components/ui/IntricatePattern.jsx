/**
 * IntricatePattern - SVG decorative patterns for avatar borders
 *
 * Renders intricate SVG overlays based on pattern type:
 * flame, celtic, crown, circuit, prism, cosmic, leaves, stars, waves, dragon, pioneer
 */
export default function IntricatePattern({ type, size }) {
  switch (type) {
    case 'flame':
      return (
        <svg className="absolute inset-0 w-full h-full animate-pulse-slow" viewBox="0 0 100 100">
          <defs>
            <filter id="glow-flame">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <path
              key={i}
              d={`M50,50 L${50 + 40 * Math.cos(angle * Math.PI / 180)},${50 + 40 * Math.sin(angle * Math.PI / 180)}`}
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="text-orange-400/60"
              filter="url(#glow-flame)"
              style={{ animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </svg>
      );

    case 'celtic':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-300/40" strokeDasharray="4 4" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="1" className="text-slate-400/30" strokeDasharray="2 6" />
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <circle
              key={i}
              cx={50 + 38 * Math.cos(angle * Math.PI / 180)}
              cy={50 + 38 * Math.sin(angle * Math.PI / 180)}
              r="3"
              className="fill-slate-300/50"
            />
          ))}
        </svg>
      );

    case 'crown':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <g key={i}>
              <polygon
                points={`${50 + 44 * Math.cos((angle - 10) * Math.PI / 180)},${50 + 44 * Math.sin((angle - 10) * Math.PI / 180)} ${50 + 48 * Math.cos(angle * Math.PI / 180)},${50 + 48 * Math.sin(angle * Math.PI / 180)} ${50 + 44 * Math.cos((angle + 10) * Math.PI / 180)},${50 + 44 * Math.sin((angle + 10) * Math.PI / 180)}`}
                className="fill-yellow-300/70"
              />
              <circle
                cx={50 + 46 * Math.cos(angle * Math.PI / 180)}
                cy={50 + 46 * Math.sin(angle * Math.PI / 180)}
                r="2"
                className="fill-amber-200 animate-pulse"
              />
            </g>
          ))}
        </svg>
      );

    case 'circuit':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-cyan-400/30" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i}>
              <line
                x1={50 + 35 * Math.cos(angle * Math.PI / 180)}
                y1={50 + 35 * Math.sin(angle * Math.PI / 180)}
                x2={50 + 45 * Math.cos(angle * Math.PI / 180)}
                y2={50 + 45 * Math.sin(angle * Math.PI / 180)}
                stroke="currentColor"
                strokeWidth="2"
                className="text-cyan-300/60"
              />
              <rect
                x={50 + 44 * Math.cos(angle * Math.PI / 180) - 2}
                y={50 + 44 * Math.sin(angle * Math.PI / 180) - 2}
                width="4"
                height="4"
                className="fill-teal-300/80"
              />
            </g>
          ))}
        </svg>
      );

    case 'prism':
      return (
        <svg className="absolute inset-0 w-full h-full animate-spin-slow" viewBox="0 0 100 100" style={{ animationDuration: '20s' }}>
          {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
            <polygon
              key={i}
              points={`50,50 ${50 + 42 * Math.cos((angle - 15) * Math.PI / 180)},${50 + 42 * Math.sin((angle - 15) * Math.PI / 180)} ${50 + 48 * Math.cos(angle * Math.PI / 180)},${50 + 48 * Math.sin(angle * Math.PI / 180)} ${50 + 42 * Math.cos((angle + 15) * Math.PI / 180)},${50 + 42 * Math.sin((angle + 15) * Math.PI / 180)}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              className={i % 2 === 0 ? 'text-violet-300/50' : 'text-fuchsia-300/50'}
            />
          ))}
        </svg>
      );

    case 'cosmic':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Orbiting particles */}
          <circle cx="50" cy="50" r="44" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-rose-300/30 animate-spin-slow" style={{ animationDuration: '10s' }} />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-purple-300/30 animate-spin-slow" style={{ animationDuration: '15s', animationDirection: 'reverse' }} />
          {/* Stars */}
          {[0, 72, 144, 216, 288].map((angle, i) => (
            <g key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}>
              <polygon
                points={`${50 + 46 * Math.cos(angle * Math.PI / 180)},${50 + 46 * Math.sin(angle * Math.PI / 180) - 3} ${50 + 46 * Math.cos(angle * Math.PI / 180) + 1},${50 + 46 * Math.sin(angle * Math.PI / 180)} ${50 + 46 * Math.cos(angle * Math.PI / 180)},${50 + 46 * Math.sin(angle * Math.PI / 180) + 3} ${50 + 46 * Math.cos(angle * Math.PI / 180) - 1},${50 + 46 * Math.sin(angle * Math.PI / 180)}`}
                className="fill-rose-200"
              />
            </g>
          ))}
        </svg>
      );

    case 'leaves':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <ellipse
              key={i}
              cx={50 + 42 * Math.cos(angle * Math.PI / 180)}
              cy={50 + 42 * Math.sin(angle * Math.PI / 180)}
              rx="6"
              ry="3"
              transform={`rotate(${angle + 45}, ${50 + 42 * Math.cos(angle * Math.PI / 180)}, ${50 + 42 * Math.sin(angle * Math.PI / 180)})`}
              className="fill-emerald-400/50"
            />
          ))}
        </svg>
      );

    case 'stars':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
            <g key={i} className="animate-pulse" style={{ animationDelay: `${i * 0.15}s` }}>
              <circle
                cx={50 + 44 * Math.cos(angle * Math.PI / 180)}
                cy={50 + 44 * Math.sin(angle * Math.PI / 180)}
                r={i % 2 === 0 ? 2 : 1.5}
                className="fill-yellow-200"
              />
            </g>
          ))}
        </svg>
      );

    case 'waves':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="1" className="text-indigo-300/40" strokeDasharray="8 4" />
          <circle cx="50" cy="50" r="43" fill="none" stroke="currentColor" strokeWidth="1" className="text-purple-300/30" strokeDasharray="4 8" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="1" className="text-blue-300/20" strokeDasharray="2 10" />
        </svg>
      );

    case 'dragon':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {/* Dragon scales pattern */}
          {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle, i) => (
            <path
              key={i}
              d={`M${50 + 38 * Math.cos(angle * Math.PI / 180)},${50 + 38 * Math.sin(angle * Math.PI / 180)} Q${50 + 44 * Math.cos((angle + 18) * Math.PI / 180)},${50 + 44 * Math.sin((angle + 18) * Math.PI / 180)} ${50 + 38 * Math.cos((angle + 36) * Math.PI / 180)},${50 + 38 * Math.sin((angle + 36) * Math.PI / 180)}`}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={i % 2 === 0 ? 'text-red-400/60' : 'text-yellow-400/60'}
            />
          ))}
        </svg>
      );

    case 'pioneer':
      return (
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="2" className="text-emerald-400/40" strokeDasharray="1 3" />
          {/* Compass points */}
          {[0, 90, 180, 270].map((angle, i) => (
            <polygon
              key={i}
              points={`${50 + 40 * Math.cos(angle * Math.PI / 180)},${50 + 40 * Math.sin(angle * Math.PI / 180)} ${50 + 48 * Math.cos((angle - 5) * Math.PI / 180)},${50 + 48 * Math.sin((angle - 5) * Math.PI / 180)} ${50 + 48 * Math.cos((angle + 5) * Math.PI / 180)},${50 + 48 * Math.sin((angle + 5) * Math.PI / 180)}`}
              className="fill-cyan-400/60"
            />
          ))}
        </svg>
      );

    default:
      return null;
  }
}
