/**
 * AnimatedInteractiveButton - Bouton/Icône avec animation 3D Loop + Audio
 * 
 * Effet d'animation sophistiqué avec :
 * - Rotation/pulse en boucle infinie
 * - Oscillation verticale
 * - Effet sonore synchronisé au clic/hover
 * - Intensité réglable (low, medium, high)
 * - Optimisé pour mobile et desktop (~60 FPS)
 * 
 * @param {ReactNode} children - Contenu du bouton/icône
 * @param {Function} onClick - Callback au clic
 * @param {string} intensity - Intensité de l'animation: 'low' | 'medium' | 'high'
 * @param {boolean} enableSound - Activer/désactiver le son
 * @param {string} soundOn - Type de son: 'hover' | 'click' | 'both'
 * @param {string} className - Classes CSS additionnelles
 * @param {boolean} disabled - État désactivé
 * @param {object} style - Styles inline additionnels
 */

import React, { useRef, useEffect, useState } from 'react';

const AnimatedInteractiveButton = ({
    children,
    onClick,
    intensity = 'medium',
    enableSound = true,
    soundOn = 'both',
    className = '',
    disabled = false,
    style = {},
    ...props
}) => {
    const buttonRef = useRef(null);
    const audioContextRef = useRef(null);
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    // Paramètres d'intensité
    const intensitySettings = {
        low: {
            rotationSpeed: '20s',
            pulseScale: 1.05,
            floatAmount: '3px',
            floatDuration: '3s',
        },
        medium: {
            rotationSpeed: '15s',
            pulseScale: 1.1,
            floatAmount: '5px',
            floatDuration: '2.5s',
        },
        high: {
            rotationSpeed: '10s',
            pulseScale: 1.15,
            floatAmount: '8px',
            floatDuration: '2s',
        },
    };

    const settings = intensitySettings[intensity] || intensitySettings.medium;

    // Initialiser le contexte audio
    useEffect(() => {
        if (enableSound && !audioContextRef.current) {
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioContextRef.current = new AudioContext();
            } catch (error) {
                console.warn('Web Audio API not supported', error);
            }
        }

        return () => {
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, [enableSound]);

    // Générer un son synthétique élégant
    const playSound = (type = 'click') => {
        if (!enableSound || !audioContextRef.current || disabled) return;

        try {
            const ctx = audioContextRef.current;

            // Resume le contexte si suspendu (requis par certains navigateurs)
            if (ctx.state === 'suspended') {
                ctx.resume();
            }

            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(ctx.destination);

            // Configuration du son selon le type
            if (type === 'hover') {
                // Son doux pour le hover
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(800, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);

                filter.type = 'lowpass';
                filter.frequency.value = 2000;

                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
            } else {
                // Son plus affirmé pour le clic
                oscillator.type = 'triangle';
                oscillator.frequency.setValueAtTime(600, ctx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.05);
                oscillator.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.15);

                filter.type = 'lowpass';
                filter.frequency.value = 3000;
                filter.Q.value = 5;

                gainNode.gain.setValueAtTime(0, ctx.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
            }

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.25);
        } catch (error) {
            console.warn('Error playing sound:', error);
        }
    };

    const handleMouseEnter = () => {
        if (!disabled) {
            setIsHovered(true);
            if (soundOn === 'hover' || soundOn === 'both') {
                playSound('hover');
            }
        }
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setIsPressed(false);
    };

    const handleMouseDown = () => {
        if (!disabled) {
            setIsPressed(true);
        }
    };

    const handleMouseUp = () => {
        setIsPressed(false);
    };

    const handleClick = (e) => {
        if (!disabled) {
            if (soundOn === 'click' || soundOn === 'both') {
                playSound('click');
            }
            if (onClick) {
                onClick(e);
            }
        }
    };

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            disabled={disabled}
            className={`animated-interactive-button ${className}`}
            style={{
                ...style,
                cursor: disabled ? 'not-allowed' : 'pointer',
                position: 'relative',
                transform: 'translateZ(0)', // Force GPU acceleration
                willChange: 'transform',
            }}
            {...props}
        >
            <style>
                {`
          @keyframes pulse-rotate-${intensity} {
            0%, 100% {
              transform: scale(1) rotate(0deg) translateY(0);
            }
            25% {
              transform: scale(${settings.pulseScale}) rotate(5deg) translateY(-${settings.floatAmount});
            }
            50% {
              transform: scale(1) rotate(0deg) translateY(0);
            }
            75% {
              transform: scale(${settings.pulseScale}) rotate(-5deg) translateY(-${settings.floatAmount});
            }
          }

          @keyframes gentle-float-${intensity} {
            0%, 100% {
              transform: translateY(0) translateX(0);
            }
            33% {
              transform: translateY(-${settings.floatAmount}) translateX(2px);
            }
            66% {
              transform: translateY(${settings.floatAmount}) translateX(-2px);
            }
          }

          @keyframes glow-pulse {
            0%, 100% {
              opacity: 0.3;
            }
            50% {
              opacity: 0.6;
            }
          }

          @keyframes rainbow-rotate {
            0% {
              filter: hue-rotate(0deg);
            }
            100% {
              filter: hue-rotate(360deg);
            }
          }

          .animated-interactive-button .animation-wrapper {
            animation: 
              pulse-rotate-${intensity} ${settings.rotationSpeed} cubic-bezier(0.42, 0, 0.58, 1) infinite,
              gentle-float-${intensity} ${settings.floatDuration} ease-in-out infinite;
            transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
            transform-style: preserve-3d;
            perspective: 1000px;
          }

          .animated-interactive-button:hover .animation-wrapper {
            animation-play-state: running;
          }

          .animated-interactive-button:active .animation-wrapper {
            transform: scale(0.95) translateY(2px);
          }

          .animated-interactive-button .glow-effect {
            animation: glow-pulse 2s ease-in-out infinite;
          }

          .animated-interactive-button:hover .glow-effect {
            animation: rainbow-rotate 3s linear infinite, glow-pulse 2s ease-in-out infinite;
          }

          @media (prefers-reduced-motion: reduce) {
            .animated-interactive-button .animation-wrapper {
              animation: none;
            }
            .animated-interactive-button .glow-effect {
              animation: none;
            }
          }
        `}
            </style>

            {/* Glow effect */}
            <div
                className="glow-effect"
                style={{
                    position: 'absolute',
                    inset: '-10px',
                    borderRadius: 'inherit',
                    background: 'radial-gradient(circle, rgba(99, 102, 241, 0.3), transparent 70%)',
                    filter: 'blur(15px)',
                    pointerEvents: 'none',
                    zIndex: -1,
                    opacity: isHovered ? 0.6 : 0.3,
                    transition: 'opacity 0.3s ease',
                }}
            />

            {/* Animation wrapper */}
            <div
                className="animation-wrapper"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: isPressed ? 'scale(0.95) translateY(2px)' : 'none',
                }}
            >
                {children}
            </div>
        </button>
    );
};

export default AnimatedInteractiveButton;
