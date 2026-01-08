import React, { useState, useEffect, useRef } from 'react';

// ========================================
// LIQUID GAUGE - Jauge circulaire avec effet liquide
// ========================================
const LiquidGauge = ({ 
  value = 0, 
  max = 100,
  label = '', 
  icon: Icon,
  color = 'cyan', // 'cyan' | 'green' | 'purple' | 'orange'
  size = 'md', // 'sm' | 'md' | 'lg'
  showLabel = true,
  animated = true,
  isDarkMode = true
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [waveOffset, setWaveOffset] = useState(0);
  const requestRef = useRef();

  // Animation du remplissage
  useEffect(() => {
    if (animated) {
      const diff = value - displayValue;
      if (Math.abs(diff) > 0.5) {
        const step = diff * 0.1;
        setDisplayValue(prev => prev + step);
      }
    } else {
      setDisplayValue(value);
    }
  }, [value, displayValue, animated]);

  // Animation des vagues
  useEffect(() => {
    const animate = () => {
      setWaveOffset(prev => (prev + 0.5) % 360);
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  const percentage = Math.min((displayValue / max) * 100, 100);

  // Couleurs selon le thème
  const colors = {
    cyan: {
      primary: '#22d3ee',
      secondary: '#0891b2',
      glow: 'rgba(34, 211, 238, 0.4)',
      gradient: 'from-cyan-400 to-cyan-600'
    },
    green: {
      primary: '#22c55e',
      secondary: '#16a34a',
      glow: 'rgba(34, 197, 94, 0.4)',
      gradient: 'from-emerald-400 to-emerald-600'
    },
    purple: {
      primary: '#a855f7',
      secondary: '#9333ea',
      glow: 'rgba(168, 85, 247, 0.4)',
      gradient: 'from-purple-400 to-purple-600'
    },
    orange: {
      primary: '#f97316',
      secondary: '#ea580c',
      glow: 'rgba(249, 115, 22, 0.4)',
      gradient: 'from-orange-400 to-orange-600'
    }
  };

  const colorScheme = colors[color] || colors.cyan;

  // Tailles
  const sizes = {
    sm: { container: 80, stroke: 6, font: 'text-lg', iconSize: 16, labelSize: 'text-[8px]' },
    md: { container: 100, stroke: 8, font: 'text-2xl', iconSize: 20, labelSize: 'text-[9px]' },
    lg: { container: 130, stroke: 10, font: 'text-3xl', iconSize: 24, labelSize: 'text-[10px]' }
  };
  
  const sizeConfig = sizes[size] || sizes.md;
  const radius = (sizeConfig.container - sizeConfig.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div 
      className="relative flex flex-col items-center"
      style={{ width: sizeConfig.container, height: sizeConfig.container + 30 }}
    >
      {/* ===== SVG FILTERS ===== */}
      <svg className="absolute w-0 h-0">
        <defs>
          {/* Filtre Glow */}
          <filter id={`glow-${color}`}>
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Gradient pour le liquide */}
          <linearGradient id={`liquid-gradient-${color}`} x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={colorScheme.primary} stopOpacity="0.8" />
            <stop offset="100%" stopColor={colorScheme.secondary} stopOpacity="1" />
          </linearGradient>

          {/* Masque circulaire */}
          <clipPath id={`circle-clip-${color}`}>
            <circle 
              cx={sizeConfig.container / 2} 
              cy={sizeConfig.container / 2} 
              r={radius - 2} 
            />
          </clipPath>
        </defs>
      </svg>

      {/* ===== CONTAINER PRINCIPAL ===== */}
      <div 
        className="relative"
        style={{ width: sizeConfig.container, height: sizeConfig.container }}
      >
        {/* Background Circle */}
        <svg 
          className="absolute inset-0"
          width={sizeConfig.container} 
          height={sizeConfig.container}
        >
          {/* Cercle de fond */}
          <circle
            cx={sizeConfig.container / 2}
            cy={sizeConfig.container / 2}
            r={radius}
            fill="none"
            stroke={isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
            strokeWidth={sizeConfig.stroke}
          />

          {/* Cercle de progression */}
          <circle
            cx={sizeConfig.container / 2}
            cy={sizeConfig.container / 2}
            r={radius}
            fill="none"
            stroke={`url(#liquid-gradient-${color})`}
            strokeWidth={sizeConfig.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${sizeConfig.container / 2} ${sizeConfig.container / 2})`}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-out',
              filter: `url(#glow-${color})`,
            }}
          />
        </svg>

        {/* ===== LIQUID FILL (intérieur) ===== */}
        <div 
          className="absolute inset-2 rounded-full overflow-hidden"
          style={{
            background: isDarkMode 
              ? 'linear-gradient(180deg, rgba(10,10,10,0.9) 0%, rgba(5,5,5,0.95) 100%)'
              : 'linear-gradient(180deg, rgba(250,250,250,0.9) 0%, rgba(240,240,240,0.95) 100%)',
            boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.3)',
          }}
        >
          {/* Niveau de liquide */}
          <div 
            className="absolute bottom-0 left-0 right-0 transition-all duration-500"
            style={{ 
              height: `${percentage}%`,
              background: `linear-gradient(180deg, ${colorScheme.primary}40 0%, ${colorScheme.secondary}60 100%)`,
            }}
          >
            {/* Vagues animées */}
            <svg 
              className="absolute -top-2 left-0 w-full h-4 overflow-visible"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path
                d={`M0,5 Q${25 + Math.sin(waveOffset * Math.PI / 180) * 5},${2 + Math.sin(waveOffset * Math.PI / 90) * 2} 50,5 T100,5 V10 H0 Z`}
                fill={colorScheme.primary}
                opacity="0.6"
              />
              <path
                d={`M0,5 Q${25 + Math.cos(waveOffset * Math.PI / 180) * 5},${3 + Math.cos(waveOffset * Math.PI / 90) * 2} 50,5 T100,5 V10 H0 Z`}
                fill={colorScheme.secondary}
                opacity="0.4"
              />
            </svg>
          </div>

          {/* Bulles animées */}
          {percentage > 20 && (
            <>
              <div 
                className="absolute w-1 h-1 rounded-full animate-bubble-rise"
                style={{ 
                  background: colorScheme.primary,
                  left: '30%',
                  bottom: '10%',
                  animationDelay: '0s',
                  opacity: 0.6
                }}
              />
              <div 
                className="absolute w-1.5 h-1.5 rounded-full animate-bubble-rise"
                style={{ 
                  background: colorScheme.primary,
                  left: '60%',
                  bottom: '15%',
                  animationDelay: '1s',
                  opacity: 0.5
                }}
              />
              <div 
                className="absolute w-0.5 h-0.5 rounded-full animate-bubble-rise"
                style={{ 
                  background: colorScheme.primary,
                  left: '45%',
                  bottom: '5%',
                  animationDelay: '0.5s',
                  opacity: 0.7
                }}
              />
            </>
          )}
        </div>

        {/* ===== VALEUR CENTRALE ===== */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {Icon && (
            <Icon 
              size={sizeConfig.iconSize} 
              style={{ color: colorScheme.primary }}
              className="mb-1"
            />
          )}
          <span 
            className={`${sizeConfig.font} font-black`}
            style={{ color: colorScheme.primary }}
          >
            {Math.round(displayValue)}
          </span>
          <span className={`${sizeConfig.labelSize} opacity-50`}>%</span>
        </div>

        {/* Reflet spéculaire */}
        <div 
          className="absolute top-2 left-3 w-[40%] h-[30%] rounded-full pointer-events-none"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* ===== LABEL ===== */}
      {showLabel && label && (
        <span className={`mt-2 ${sizeConfig.labelSize} font-bold uppercase tracking-wider opacity-50`}>
          {label}
        </span>
      )}

      {/* ===== STYLES D'ANIMATION ===== */}
      <style>{`
        @keyframes bubble-rise {
          0% { 
            transform: translateY(0) scale(1);
            opacity: 0.6;
          }
          50% {
            opacity: 0.8;
          }
          100% { 
            transform: translateY(-${sizeConfig.container * 0.6}px) scale(0.5);
            opacity: 0;
          }
        }
        
        .animate-bubble-rise {
          animation: bubble-rise 2s ease-out infinite;
        }
      `}</style>
    </div>
  );
};

// ========================================
// LIQUID GAUGE BAR - Version barre horizontale
// ========================================
export const LiquidGaugeBar = ({
  value = 0,
  max = 100,
  label = '',
  color = 'cyan',
  height = 8,
  isDarkMode = true,
  showValue = true
}) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const diff = value - displayValue;
    if (Math.abs(diff) > 0.5) {
      const timer = setTimeout(() => {
        setDisplayValue(prev => prev + diff * 0.15);
      }, 16);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue]);

  const percentage = Math.min((displayValue / max) * 100, 100);

  const colors = {
    cyan: { primary: '#22d3ee', secondary: '#0891b2' },
    green: { primary: '#22c55e', secondary: '#16a34a' },
    purple: { primary: '#a855f7', secondary: '#9333ea' },
    orange: { primary: '#f97316', secondary: '#ea580c' }
  };

  const colorScheme = colors[color] || colors.cyan;

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">{label}</span>
          {showValue && (
            <span className="text-xs font-bold" style={{ color: colorScheme.primary }}>
              {Math.round(displayValue)}%
            </span>
          )}
        </div>
      )}
      
      <div 
        className="relative w-full rounded-full overflow-hidden"
        style={{ 
          height,
          background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
        }}
      >
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${colorScheme.secondary}, ${colorScheme.primary})`,
            boxShadow: `0 0 15px ${colorScheme.primary}40`,
          }}
        >
          {/* Effet de brillance animé */}
          <div 
            className="absolute inset-0 overflow-hidden rounded-full"
          >
            <div 
              className="absolute top-0 -left-full w-full h-full animate-shine"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shine {
          0% { transform: translateX(0); }
          100% { transform: translateX(300%); }
        }
        .animate-shine {
          animation: shine 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default LiquidGauge;
