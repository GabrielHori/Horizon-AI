import React, { useEffect, useRef } from 'react';

const AnimatedBackground = ({ isDarkMode }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let particles = [];
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        // Vitesse légèrement variable pour plus de naturel
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 1.5 + 0.5;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Rebond sur les bords
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const init = () => {
      // 60 particules est un bon compromis performance/visuel
      particles = Array.from({ length: 60 }, () => new Particle());
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Adaptation des couleurs au thème
      const mainColor = isDarkMode ? '99, 102, 241' : '79, 70, 229'; 
      ctx.fillStyle = `rgba(${mainColor}, 0.3)`;
      ctx.strokeStyle = `rgba(${mainColor}, 0.08)`;
      ctx.lineWidth = 0.8;

      particles.forEach((p, i) => {
        p.update();
        p.draw();

        // Dessin des lignes de connexion entre particules proches
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          
          if (dist < 150) {
            // Opacité proportionnelle à la distance
            ctx.globalAlpha = 1 - (dist / 150);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize(); 
    init(); 
    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, [isDarkMode]);

  return (
    <div className="fixed inset-0 z-0 pointer-events-none transition-colors duration-700 overflow-hidden">
      {/* Canvas Particules - Opacité réduite pour ne pas gêner la lisibilité */}
      <canvas 
        ref={canvasRef} 
        className={`absolute inset-0 transition-opacity duration-1000 ${isDarkMode ? 'opacity-40' : 'opacity-20'}`} 
      />
      
      {/* Blobs Lumineux Dynamiques (Glow effect) */}
      <div 
        className={`absolute top-[-10%] left-[-5%] w-[60%] h-[60%] rounded-full blur-[120px] transition-all duration-1000 animate-pulse-slow 
        ${isDarkMode ? 'bg-indigo-600/10' : 'bg-indigo-400/15'}`}
      />
      
      <div 
        className={`absolute bottom-[-10%] right-[-5%] w-[50%] h-[50%] rounded-full blur-[100px] transition-all duration-1000 
        ${isDarkMode ? 'bg-blue-600/10' : 'bg-blue-400/15'}`}
      />

      {/* Overlay de grain subtil (optionnel, pour le look "Next-Gen") */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    </div>
  );
};

export default AnimatedBackground;