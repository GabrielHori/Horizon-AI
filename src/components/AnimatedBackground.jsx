import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * AnimatedBackground - Fond avec Flares Prismatiques
 * 
 * Inspiré des images : beams lumineux arc-en-ciel diagonaux
 * Compatible mode jour/nuit
 */
const AnimatedBackground = () => {
  const { isDarkMode } = useTheme();

  return (
    <div className={`fixed inset-0 z-0 pointer-events-none overflow-hidden transition-colors duration-500
      ${isDarkMode ? 'bg-[#0a0a0a]' : 'bg-[#f5f5f7]'}
    `}>
      
      {/* ===== MODE SOMBRE : Flares Prismatiques ===== */}
      {isDarkMode && (
        <>
          {/* Flare principal - Diagonal haut-droit */}
          <div 
            className="absolute opacity-60"
            style={{
              top: '-10%',
              right: '10%',
              width: '600px',
              height: '800px',
              background: `
                linear-gradient(
                  135deg,
                  transparent 0%,
                  rgba(255, 100, 100, 0.15) 15%,
                  rgba(255, 180, 50, 0.2) 25%,
                  rgba(255, 255, 100, 0.15) 35%,
                  rgba(100, 255, 100, 0.1) 45%,
                  rgba(100, 200, 255, 0.15) 55%,
                  rgba(100, 100, 255, 0.2) 65%,
                  rgba(180, 100, 255, 0.15) 75%,
                  transparent 100%
                )
              `,
              transform: 'rotate(-25deg)',
              filter: 'blur(60px)',
              animation: 'flare-drift 20s ease-in-out infinite',
            }}
          />
          
          {/* Flare secondaire - Plus petit, bas-droite */}
          <div 
            className="absolute opacity-40"
            style={{
              bottom: '5%',
              right: '15%',
              width: '400px',
              height: '600px',
              background: `
                linear-gradient(
                  145deg,
                  transparent 0%,
                  rgba(255, 150, 50, 0.2) 20%,
                  rgba(255, 220, 100, 0.15) 35%,
                  rgba(100, 255, 180, 0.1) 50%,
                  rgba(80, 180, 255, 0.15) 65%,
                  rgba(150, 100, 255, 0.1) 80%,
                  transparent 100%
                )
              `,
              transform: 'rotate(-35deg)',
              filter: 'blur(50px)',
              animation: 'flare-drift 25s ease-in-out infinite reverse',
            }}
          />
          
          {/* Flare tertiaire - Subtil, centre-gauche */}
          <div 
            className="absolute opacity-25"
            style={{
              top: '30%',
              left: '-5%',
              width: '300px',
              height: '500px',
              background: `
                linear-gradient(
                  125deg,
                  transparent 0%,
                  rgba(100, 180, 255, 0.2) 30%,
                  rgba(180, 100, 255, 0.15) 50%,
                  rgba(255, 100, 150, 0.1) 70%,
                  transparent 100%
                )
              `,
              transform: 'rotate(-20deg)',
              filter: 'blur(70px)',
              animation: 'flare-drift 30s ease-in-out infinite',
              animationDelay: '-5s',
            }}
          />

          {/* Grain métallique subtil */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />

          {/* Vignette sombre sur les bords */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
            }}
          />
        </>
      )}

      {/* ===== MODE CLAIR : Flares plus visibles ===== */}
      {!isDarkMode && (
        <>
          {/* Flare principal - Plus saturé */}
          <div 
            className="absolute opacity-50"
            style={{
              top: '-10%',
              right: '0%',
              width: '600px',
              height: '800px',
              background: `
                linear-gradient(
                  135deg,
                  transparent 0%,
                  rgba(255, 120, 80, 0.25) 15%,
                  rgba(255, 200, 50, 0.3) 25%,
                  rgba(150, 255, 150, 0.2) 40%,
                  rgba(80, 200, 255, 0.25) 55%,
                  rgba(150, 100, 255, 0.2) 70%,
                  transparent 100%
                )
              `,
              transform: 'rotate(-25deg)',
              filter: 'blur(50px)',
              animation: 'flare-drift 20s ease-in-out infinite',
            }}
          />
          
          {/* Flare secondaire - Plus visible */}
          <div 
            className="absolute opacity-40"
            style={{
              bottom: '5%',
              right: '10%',
              width: '450px',
              height: '600px',
              background: `
                linear-gradient(
                  145deg,
                  transparent 0%,
                  rgba(80, 180, 255, 0.3) 25%,
                  rgba(180, 100, 255, 0.25) 50%,
                  rgba(255, 150, 180, 0.2) 75%,
                  transparent 100%
                )
              `,
              transform: 'rotate(-35deg)',
              filter: 'blur(40px)',
              animation: 'flare-drift 25s ease-in-out infinite reverse',
            }}
          />

          {/* Flare tertiaire gauche */}
          <div 
            className="absolute opacity-30"
            style={{
              top: '20%',
              left: '-5%',
              width: '350px',
              height: '500px',
              background: `
                linear-gradient(
                  125deg,
                  transparent 0%,
                  rgba(100, 200, 255, 0.3) 30%,
                  rgba(200, 150, 255, 0.2) 60%,
                  transparent 100%
                )
              `,
              transform: 'rotate(-15deg)',
              filter: 'blur(50px)',
              animation: 'flare-drift 30s ease-in-out infinite',
              animationDelay: '-10s',
            }}
          />

          {/* Vignette subtile */}
          <div 
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 40%, rgba(180,180,200,0.15) 100%)',
            }}
          />
        </>
      )}

      {/* Styles des animations */}
      <style>{`
        @keyframes flare-drift {
          0%, 100% {
            transform: rotate(-25deg) translateX(0) translateY(0);
            opacity: 0.6;
          }
          25% {
            transform: rotate(-23deg) translateX(20px) translateY(-15px);
            opacity: 0.7;
          }
          50% {
            transform: rotate(-27deg) translateX(-10px) translateY(10px);
            opacity: 0.5;
          }
          75% {
            transform: rotate(-24deg) translateX(15px) translateY(5px);
            opacity: 0.65;
          }
        }
      `}</style>
    </div>
  );
};

export default AnimatedBackground;
