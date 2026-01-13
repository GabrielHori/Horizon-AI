/**
 * AnimationDemo - Page de démonstration de l'effet "Loop+Audio Icon"
 * 
 * Cette page présente toutes les variantes du composant AnimatedInteractiveButton
 * avec différents paramètres d'intensité, de son, et de styles.
 * 
 * 🔓 ACCÈS : Easter Egg dans Settings
 * 1. Aller dans Settings (dernier onglet sidebar)
 * 2. Cliquer 3 fois rapidement sur le titre "SETTINGS Horizon"
 * 3. Cliquer sur le bouton "🎨 Démo d'Animation" qui apparaît
 * 
 * Ou via code : setActiveTab('animation-demo')
 */

import React, { useState } from 'react';
import {
    Zap,
    Sparkles,
    Star,
    Heart,
    Send,
    Play,
    Pause,
    Volume2,
    VolumeX,
    Settings,
    Info
} from 'lucide-react';
import AnimatedInteractiveButton from '../components/AnimatedInteractiveButton';
import { useTheme } from '../contexts/ThemeContext';

const AnimationDemo = () => {
    const { isDarkMode } = useTheme();
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [selectedIntensity, setSelectedIntensity] = useState('medium');
    const [selectedSoundType, setSelectedSoundType] = useState('both');
    const [clickCount, setClickCount] = useState(0);

    // Preset configurations
    const presets = [
        {
            name: 'Logo Sidebar',
            intensity: 'medium',
            soundOn: 'both',
            icon: Zap,
            size: 'large',
            description: 'Configuration actuelle du logo dans la sidebar'
        },
        {
            name: 'Bouton Envoi',
            intensity: 'low',
            soundOn: 'click',
            icon: Send,
            size: 'medium',
            description: 'Configuration du bouton d\'envoi dans le chat'
        },
        {
            name: 'Action Hero',
            intensity: 'high',
            soundOn: 'both',
            icon: Sparkles,
            size: 'large',
            description: 'Animation intense pour actions importantes'
        },
        {
            name: 'Subtle',
            intensity: 'low',
            soundOn: 'hover',
            icon: Heart,
            size: 'small',
            description: 'Animation discrète pour actions secondaires'
        }
    ];

    const iconSizes = {
        small: 16,
        medium: 24,
        large: 32
    };

    return (
        <div className="w-full h-full overflow-y-auto bg-transparent p-8 custom-scrollbar">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="text-center space-y-4">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest mb-4 ${isDarkMode ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400' : 'bg-indigo-100 border border-indigo-200 text-indigo-600'
                        }`}>
                        <Sparkles size={14} />
                        Loop + Audio Icon Demo
                    </div>

                    <h1 className="text-5xl font-black tracking-tight">
                        Interactive Button Animation
                    </h1>

                    <p className={`text-lg max-w-2xl mx-auto ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
                        Effet d'animation 3D avec rotation, pulse, oscillation verticale et son synchronisé.
                        Optimisé pour 60 FPS sur mobile et desktop.
                    </p>
                </div>

                {/* Global Controls */}
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-xl'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-black uppercase tracking-widest opacity-60">
                            Global Controls
                        </h2>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSoundEnabled(!soundEnabled)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${soundEnabled
                                    ? (isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200')
                                    : (isDarkMode ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : 'bg-gray-100 text-gray-500 border border-gray-200')
                                    }`}
                            >
                                {soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                                {soundEnabled ? 'Son Activé' : 'Son Désactivé'}
                            </button>
                            <div className={`px-4 py-2 rounded-xl text-xs font-bold ${isDarkMode ? 'bg-white/5 text-white/60' : 'bg-gray-100 text-gray-600'
                                }`}>
                                Clicks: {clickCount}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Intensity Selector */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide opacity-60 mb-2">
                                Intensité
                            </label>
                            <div className="flex gap-2">
                                {['low', 'medium', 'high'].map((intensity) => (
                                    <button
                                        key={intensity}
                                        onClick={() => setSelectedIntensity(intensity)}
                                        className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedIntensity === intensity
                                            ? (isDarkMode ? 'bg-indigo-500/30 text-indigo-300 border border-indigo-500/50' : 'bg-indigo-100 text-indigo-700 border border-indigo-300')
                                            : (isDarkMode ? 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200')
                                            }`}
                                    >
                                        {intensity}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sound Type Selector */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wide opacity-60 mb-2">
                                Type de Son
                            </label>
                            <div className="flex gap-2">
                                {['hover', 'click', 'both'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedSoundType(type)}
                                        className={`flex-1 px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedSoundType === type
                                            ? (isDarkMode ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50' : 'bg-purple-100 text-purple-700 border border-purple-300')
                                            : (isDarkMode ? 'bg-white/5 text-white/40 border border-white/10 hover:bg-white/10' : 'bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200')
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Info */}
                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-blue-500/10 border border-blue-500/20' : 'bg-blue-50 border border-blue-100'
                            }`}>
                            <div className="flex items-start gap-2">
                                <Info size={14} className={isDarkMode ? 'text-blue-400 mt-0.5' : 'text-blue-600 mt-0.5'} />
                                <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                                    Cliquez ou survolez les boutons pour tester les effets sonores et visuels
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Presets Grid */}
                <div>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60 mb-4">
                        Configurations Prédéfinies
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {presets.map((preset, index) => (
                            <div
                                key={index}
                                className={`p-6 rounded-3xl border transition-all hover:scale-[1.02] ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-lg'
                                    }`}
                            >
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <AnimatedInteractiveButton
                                        intensity={preset.intensity}
                                        enableSound={soundEnabled}
                                        soundOn={preset.soundOn}
                                        onClick={() => setClickCount(c => c + 1)}
                                        className="relative group"
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: 0,
                                        }}
                                    >
                                        <div
                                            className={`p-6 rounded-2xl shadow-lg ${isDarkMode
                                                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10'
                                                : 'bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300'
                                                }`}
                                        >
                                            <preset.icon size={iconSizes[preset.size]} />
                                        </div>
                                    </AnimatedInteractiveButton>

                                    <div>
                                        <h3 className="font-bold text-sm mb-1">{preset.name}</h3>
                                        <p className={`text-xs ${isDarkMode ? 'text-white/40' : 'text-gray-500'}`}>
                                            {preset.description}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap gap-2 justify-center">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${isDarkMode ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {preset.intensity}
                                        </span>
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold ${isDarkMode ? 'bg-white/10 text-white/60' : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {preset.soundOn}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interactive Playground */}
                <div className={`p-8 rounded-3xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-xl'
                    }`}>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60 mb-6">
                        Playground - Test Personnalisé
                    </h2>

                    <div className="flex items-center justify-center min-h-[300px]">
                        <AnimatedInteractiveButton
                            intensity={selectedIntensity}
                            enableSound={soundEnabled}
                            soundOn={selectedSoundType}
                            onClick={() => setClickCount(c => c + 1)}
                            className="relative group"
                            style={{
                                background: 'transparent',
                                border: 'none',
                                padding: 0,
                            }}
                        >
                            <div
                                className={`p-12 rounded-3xl shadow-2xl transition-all ${isDarkMode
                                    ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 border border-white/20'
                                    : 'bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400 border border-white/40'
                                    }`}
                            >
                                <Sparkles size={64} className="text-white" />
                            </div>
                        </AnimatedInteractiveButton>
                    </div>

                    <div className="mt-6 text-center">
                        <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-gray-600'}`}>
                            Intensité: <span className="font-bold">{selectedIntensity}</span> |
                            Son: <span className="font-bold">{selectedSoundType}</span> |
                            Audio: <span className="font-bold">{soundEnabled ? 'ON' : 'OFF'}</span>
                        </p>
                    </div>
                </div>

                {/* Icon Showcase */}
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-xl'
                    }`}>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60 mb-6">
                        Showcase - Différentes Icônes
                    </h2>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
                        {[Zap, Sparkles, Star, Heart, Send, Play, Pause, Volume2, Settings].map((Icon, index) => (
                            <div key={index} className="flex justify-center">
                                <AnimatedInteractiveButton
                                    intensity={selectedIntensity}
                                    enableSound={soundEnabled}
                                    soundOn={selectedSoundType}
                                    onClick={() => setClickCount(c => c + 1)}
                                    className="relative group"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        padding: 0,
                                    }}
                                >
                                    <div
                                        className={`p-5 rounded-2xl shadow-lg transition-all ${isDarkMode
                                            ? 'bg-gradient-to-br from-gray-700 to-gray-800 border border-white/10 hover:border-white/20'
                                            : 'bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <Icon size={28} />
                                    </div>
                                </AnimatedInteractiveButton>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Technical Specs */}
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-xl'
                    }`}>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60 mb-4">
                        Spécifications Techniques
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <h3 className="text-xs font-bold uppercase tracking-wide opacity-40 mb-2">Performance</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    60 FPS garantis
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    GPU Acceleration
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    Transitions ease-in/out
                                </li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <h3 className="text-xs font-bold uppercase tracking-wide opacity-40 mb-2">Animations</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Rotation + Pulse
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Oscillation verticale
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                    Glow effect
                                </li>
                            </ul>
                        </div>

                        <div className={`p-4 rounded-xl ${isDarkMode ? 'bg-white/5' : 'bg-gray-50'}`}>
                            <h3 className="text-xs font-bold uppercase tracking-wide opacity-40 mb-2">Audio</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    Web Audio API
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    Sons synthétiques
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                    Synchronisation parfaite
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Usage Example */}
                <div className={`p-6 rounded-3xl border ${isDarkMode ? 'bg-black/30 border-white/10' : 'bg-white border-gray-200 shadow-xl'
                    }`}>
                    <h2 className="text-sm font-black uppercase tracking-widest opacity-60 mb-4">
                        Exemple de Code
                    </h2>

                    <pre className={`p-4 rounded-xl overflow-x-auto text-xs ${isDarkMode ? 'bg-black/50 text-green-400' : 'bg-gray-900 text-green-300'
                        }`}>
                        {`<AnimatedInteractiveButton
  intensity="${selectedIntensity}"      // 'low' | 'medium' | 'high'
  enableSound={${soundEnabled}}
  soundOn="${selectedSoundType}"        // 'hover' | 'click' | 'both'
  onClick={() => handleClick()}
  className="custom-classes"
>
  <YourIcon size={24} />
</AnimatedInteractiveButton>`}
                    </pre>
                </div>

            </div>
        </div>
    );
};

export default AnimationDemo;
