import React, { useState, useEffect, useRef } from 'react';

// ========================================
// MERCURY LOADER - Effet Gooey / Liquid Metal
// ========================================
const MercuryLoader = ({ onComplete, duration = 3500 }) => {
  const [phase, setPhase] = useState('converging'); // 'converging' | 'forming' | 'scanning' | 'revealing'
  const [progress, setProgress] = useState(0);
  const containerRef = useRef(null);

  // Positions initiales des gouttes (dispersées)
  const [droplets, setDroplets] = useState([
    { id: 1, x: 15, y: 20, size: 40, delay: 0 },
    { id: 2, x: 80, y: 15, size: 35, delay: 100 },
    { id: 3, x: 25, y: 75, size: 45, delay: 200 },
    { id: 4, x: 70, y: 80, size: 38, delay: 150 },
    { id: 5, x: 50, y: 10, size: 42, delay: 50 },
    { id: 6, x: 10, y: 50, size: 36, delay: 250 },
    { id: 7, x: 85, y: 50, size: 40, delay: 180 },
  ]);

  useEffect(() => {
    const timers = [];

    // Phase 1: Convergence (gouttes vers le centre)
    timers.push(setTimeout(() => setPhase('forming'), 1200));
    
    // Phase 2: Formation du logo
    timers.push(setTimeout(() => setPhase('scanning'), 2000));
    
    // Phase 3: Scan prismatique
    timers.push(setTimeout(() => setPhase('revealing'), 2800));
    
    // Phase 4: Terminé
    timers.push(setTimeout(() => {
      if (onComplete) onComplete();
    }, duration));

    // Progress bar
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + (100 / (duration / 50)), 100));
    }, 50);

    return () => {
      timers.forEach(t => clearTimeout(t));
      clearInterval(progressInterval);
    };
  }, [duration, onComplete]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: '#000000' }}
    >
      {/* ===== FILTRE SVG GOOEY ===== */}
      <svg className="absolute w-0 h-0">
        <defs>
          {/* Filtre Gooey pour effet de fusion liquide */}
          <filter id="gooey-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0
                      0 1 0 0 0
                      0 0 1 0 0
                      0 0 0 25 -10"
              result="gooey"
            />
            <feComposite in="SourceGraphic" in2="gooey" operator="atop" />
          </filter>
          
          {/* Filtre Chrome/Metal */}
          <filter id="chrome-filter">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur" />
            <feSpecularLighting 
              in="blur" 
              surfaceScale="5" 
              specularConstant="1" 
              specularExponent="20" 
              lightingColor="#ffffff"
              result="specular"
            >
              <fePointLight x="100" y="100" z="200" />
            </feSpecularLighting>
            <feComposite in="SourceGraphic" in2="specular" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
          </filter>

          {/* Gradient Prismatique */}
          <linearGradient id="prism-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="20%" stopColor="#ffd93d" />
            <stop offset="40%" stopColor="#6bcb77" />
            <stop offset="60%" stopColor="#4d96ff" />
            <stop offset="80%" stopColor="#9b59b6" />
            <stop offset="100%" stopColor="#ff6b6b" />
          </linearGradient>

          {/* Gradient Mercury */}
          <linearGradient id="mercury-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a4a4a" />
            <stop offset="30%" stopColor="#2a2a2a" />
            <stop offset="50%" stopColor="#5a5a5a" />
            <stop offset="70%" stopColor="#3a3a3a" />
            <stop offset="100%" stopColor="#1a1a1a" />
          </linearGradient>

          {/* Radial pour reflet */}
          <radialGradient id="chrome-shine" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.8)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0.2)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
      </svg>

      {/* ===== AMBIENT BACKGROUND WAVES ===== */}
      <div className="absolute inset-0 overflow-hidden opacity-30">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: `${300 + i * 100}px`,
              height: `${300 + i * 100}px`,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: `radial-gradient(ellipse, rgba(80,80,80,${0.3 - i * 0.1}) 0%, transparent 70%)`,
              animation: `pulse-wave ${3 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      {/* ===== GOUTTES DE MERCURE (GOOEY CONTAINER) ===== */}
      <div 
        className="relative w-[400px] h-[400px] transition-all duration-1000"
        style={{ filter: 'url(#gooey-filter)' }}
      >
        {droplets.map((drop, index) => {
          // Position finale au centre
          const finalX = 50;
          const finalY = 50;
          
          // Position selon la phase
          const isConverging = phase === 'converging';
          const currentX = isConverging ? drop.x : finalX;
          const currentY = isConverging ? drop.y : finalY;
          const currentSize = isConverging ? drop.size : (phase === 'forming' ? 80 : 0);

          return (
            <div
              key={drop.id}
              className="absolute rounded-full transition-all"
              style={{
                width: `${currentSize}px`,
                height: `${currentSize}px`,
                left: `${currentX}%`,
                top: `${currentY}%`,
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(135deg, #5a5a5a 0%, #2a2a2a 50%, #4a4a4a 100%)',
                boxShadow: `
                  inset -5px -5px 15px rgba(0,0,0,0.5),
                  inset 5px 5px 15px rgba(255,255,255,0.1),
                  0 0 30px rgba(100,100,100,0.3)
                `,
                transitionDuration: `${800 + drop.delay}ms`,
                transitionTimingFunction: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
                transitionDelay: `${drop.delay}ms`,
                opacity: phase === 'scanning' || phase === 'revealing' ? 0 : 1,
              }}
            >
              {/* Reflet spéculaire */}
              <div 
                className="absolute w-[40%] h-[40%] rounded-full top-[15%] left-[15%]"
                style={{
                  background: 'radial-gradient(ellipse at 30% 30%, rgba(255,255,255,0.6) 0%, transparent 60%)',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* ===== LOGO HORIZON (apparaît après fusion) ===== */}
      <div 
        className={`absolute flex flex-col items-center transition-all duration-700 ${
          phase === 'forming' || phase === 'scanning' || phase === 'revealing'
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-75'
        }`}
      >
        {/* Logo texte avec effet chrome */}
        <div 
          className="relative text-6xl md:text-7xl font-black tracking-[0.3em] uppercase"
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #888888 40%, #ffffff 50%, #666666 60%, #aaaaaa 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            textShadow: '0 0 60px rgba(255,255,255,0.3)',
            filter: phase === 'revealing' ? 'none' : 'url(#chrome-filter)',
          }}
        >
          HORIZON
        </div>
        
        {/* Sous-titre */}
        <div 
          className={`mt-4 text-xs font-bold tracking-[0.5em] uppercase transition-all duration-500 ${
            phase === 'scanning' || phase === 'revealing' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: 'linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          ARTIFICIAL INTELLIGENCE
        </div>
      </div>

      {/* ===== SCAN PRISMATIQUE ===== */}
      {(phase === 'scanning' || phase === 'revealing') && (
        <div 
          className="absolute left-0 right-0 h-[2px] animate-scan-down"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, #ff6b6b 10%, #ffd93d 25%, #6bcb77 40%, #4d96ff 55%, #9b59b6 70%, #ff6b6b 85%, transparent 100%)',
            boxShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(100,200,255,0.5)',
            top: phase === 'revealing' ? '100%' : '0%',
            transition: 'top 1s ease-in-out',
          }}
        />
      )}

      {/* ===== RÉVÉLATION OVERLAY ===== */}
      <div 
        className={`absolute inset-0 bg-black transition-opacity duration-1000 pointer-events-none ${
          phase === 'revealing' ? 'opacity-0' : 'opacity-0'
        }`}
      />

      {/* ===== BARRE DE PROGRESSION ===== */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-48">
        <div className="h-[2px] bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77, #4d96ff, #9b59b6)',
            }}
          />
        </div>
        <p className="text-center text-[10px] text-white/30 mt-3 font-mono tracking-wider">
          {phase === 'converging' && 'INITIALIZING...'}
          {phase === 'forming' && 'LOADING CORE...'}
          {phase === 'scanning' && 'SYSTEM CHECK...'}
          {phase === 'revealing' && 'READY'}
        </p>
      </div>

      {/* ===== STYLES D'ANIMATION ===== */}
      <style>{`
        @keyframes pulse-wave {
          0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.3; }
          50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.5; }
        }
        
        @keyframes scan-down {
          0% { top: 0%; }
          100% { top: 100%; }
        }
        
        .animate-scan-down {
          animation: scan-down 0.8s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default MercuryLoader;
