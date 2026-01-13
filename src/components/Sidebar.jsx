import React, { useState, useEffect } from 'react';
import { Zap, LayoutDashboard, MessageSquare, Files, Settings, Cpu, ShieldCheck, HardDrive, Brain, Globe } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';
import { requestWorker } from '../services/bridge';
import AnimatedInteractiveButton from './AnimatedInteractiveButton';

/**
 * Sidebar - Navigation latérale style "Chrome Metal"
 * 
 * Design: Gris métallique chromé, bordures arc-en-ciel prismatiques
 * Compatible mode jour/nuit
 * 
 * V2.1 : Repository supprimé (géré dans AIChatPanel), Remote Access ajouté
 */
const Sidebar = ({ activeTab, setActiveTab, systemStats, isCollapsed, language }) => {
  const { isDarkMode } = useTheme();
  const t = translations[language] || translations.en;

  // État Remote Access (pour badge ON/OFF)
  const [remoteStatus, setRemoteStatus] = useState(null);

  // Charger le statut Remote Access au montage et périodiquement
  useEffect(() => {
    const loadRemoteStatus = async () => {
      try {
        const status = await requestWorker("tunnel_get_status");
        setRemoteStatus(status);
      } catch (error) {
        console.error("Error loading remote status:", error);
        setRemoteStatus(null);
      }
    };

    loadRemoteStatus();

    // Rafraîchir le statut toutes les 5 secondes si tunnel actif
    const interval = setInterval(() => {
      loadRemoteStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Extraction sécurisée des stats
  const getVal = (s) => {
    if (s === null || s === undefined) return 0;
    if (typeof s === 'object') return s.usage_percent ?? s.percent ?? 0;
    return typeof s === 'number' ? s : 0;
  };

  const cpu = getVal(systemStats?.cpu);
  const ram = getVal(systemStats?.ram);
  const vram = (systemStats?.gpu?.vram_total > 0)
    ? (systemStats.gpu.vram_used / systemStats.gpu.vram_total) * 100
    : getVal(systemStats?.gpu);

  const menuItems = [
    {
      id: 'dashboard',
      label: t.nav.dashboard,
      icon: <LayoutDashboard size={18} />,
      description: 'Vue d\'ensemble, stats système, modèles Ollama'
    },
    {
      id: 'chat',
      label: t.nav.chat, // "AI ASSISTANT" dans traductions
      icon: <MessageSquare size={18} />,
      description: 'Chat avec IA, projets, conversations, contexte'
    },
    {
      id: 'files',
      label: t.nav.files, // "DATA EXPLORER" dans traductions
      icon: <Files size={18} />,
      description: 'Explorer fichiers, contexte local, preview'
    },
    {
      id: 'memory',
      label: t.nav.memory || 'Memory',
      icon: <Brain size={18} />,
      description: 'Mémoire utilisateur, projet, session'
    },
    {
      id: 'remote', // NOUVEAU : Remote Access
      label: t.nav.remote || (language === 'fr' ? 'REMOTE ACCESS' : 'REMOTE ACCESS'),
      icon: <Globe size={18} />,
      description: 'Accès distant sécurisé, sessions actives',
      badge: remoteStatus?.tunnel_running ? (
        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}>
          ON
        </span>
      ) : (
        <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-black uppercase ${isDarkMode ? 'bg-gray-500/20 text-gray-400 border border-gray-500/30' : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
          OFF
        </span>
      )
    },
    {
      id: 'settings',
      label: t.nav.settings, // "CONFIGURATION" dans traductions
      icon: <Settings size={18} />,
      description: 'Paramètres, sécurité, préférences'
    }
  ];

  return (
    <div className={`relative flex flex-col h-full py-4 transition-all duration-500 z-20 ${isCollapsed ? 'w-20' : 'w-64'}`}>

      {/* Bordure droite - Ligne métallique subtile */}
      <div className="absolute right-0 top-0 bottom-0 w-px">
        <div
          className={`absolute inset-0 ${isDarkMode ? 'opacity-20' : 'opacity-30'}`}
          style={{
            background: isDarkMode
              ? 'linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)'
              : 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
          }}
        />
      </div>

      {/* LOGO - Style métal chromé avec animation interactive */}
      <div className={`flex items-center gap-3 px-6 mb-10 ${isCollapsed ? 'justify-center px-0' : ''}`}>
        <AnimatedInteractiveButton
          intensity="medium"
          enableSound={true}
          soundOn="both"
          onClick={() => setActiveTab('dashboard')}
          className="relative group"
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          {/* Glow externe */}
          <div className={`absolute inset-0 rounded-xl blur-xl transition-all duration-500
            ${isDarkMode ? 'bg-white/10 group-hover:bg-white/20' : 'bg-black/5 group-hover:bg-black/10'}
          `} />

          {/* Logo container - Gris métallique */}
          <div
            className="relative p-2.5 rounded-xl shadow-lg flex-shrink-0 overflow-hidden"
            style={{
              background: isDarkMode
                ? 'linear-gradient(135deg, #3a3a3a 0%, #1a1a1a 100%)'
                : 'linear-gradient(135deg, #f0f0f0 0%, #d0d0d0 100%)',
              border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
              boxShadow: isDarkMode
                ? '0 4px 20px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
                : '0 44px 20px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.8)',
            }}
          >
            {/* Reflet chrome arc-en-ciel subtil */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{
                background: 'linear-gradient(135deg, transparent 30%, rgba(255,200,100,0.15) 45%, rgba(100,255,200,0.15) 55%, transparent 70%)',
              }}
            />
            <Zap size={18} className={`relative z-10 ${isDarkMode ? 'text-white' : 'text-gray-700'}`} style={{ fill: 'currentColor' }} />
          </div>
        </AnimatedInteractiveButton>

        {!isCollapsed && (
          <span className={`font-black text-xl tracking-tighter uppercase italic
            ${isDarkMode ? 'text-white' : 'text-gray-800'}
          `}>
            Horizon <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>AI</span>
          </span>
        )}
      </div>

      {/* NAVIGATION - Boutons métal chromé */}
      <nav className="flex-1 px-3 space-y-2">
        {menuItems.map((item, index) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group overflow-hidden
                ${isCollapsed ? 'justify-center' : ''} 
                ${isActive
                  ? (isDarkMode ? 'text-white' : 'text-gray-900')
                  : (isDarkMode ? 'text-white/30 hover:text-white/70' : 'text-gray-400 hover:text-gray-700')}`}
            >
              {/* Fond actif - Métal chromé */}
              {isActive && (
                <>
                  {/* Background gradient métallique */}
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: isDarkMode
                        ? 'linear-gradient(135deg, rgba(60, 60, 60, 0.6) 0%, rgba(40, 40, 40, 0.4) 100%)'
                        : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 240, 240, 0.7) 100%)',
                      border: isDarkMode
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.08)',
                      boxShadow: isDarkMode
                        ? 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 15px rgba(0,0,0,0.2)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 15px rgba(0,0,0,0.08)',
                    }}
                  />

                  {/* Bord prismatique gauche - Arc-en-ciel */}
                  <div
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,100,100,0.8), rgba(255,200,50,0.8), rgba(100,255,100,0.8), rgba(100,200,255,0.8), rgba(200,100,255,0.8))',
                      boxShadow: '0 0 10px rgba(255,200,100,0.4)',
                    }}
                  />

                  {/* Reflet chrome animé */}
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div
                      className="absolute top-0 -left-full w-full h-full animate-chrome-sweep"
                      style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
                      }}
                    />
                  </div>
                </>
              )}

              {/* Hover effect */}
              {!isActive && (
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300
                  ${isDarkMode ? 'bg-white/[0.03]' : 'bg-black/[0.03]'}
                `} />
              )}

              {/* Icon */}
              <div className={`relative z-10 transition-all duration-300 ${isActive ? 'scale-110' : ''}`}>
                {item.icon}
              </div>

              {/* Label + Badge */}
              {!isCollapsed && (
                <div className="relative z-10 flex items-center gap-2 flex-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className="ml-auto">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}

              {/* Badge en mode collapsed */}
              {isCollapsed && item.badge && (
                <div className="absolute -top-1 -right-1 z-20">
                  {item.badge}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* SYSTEM STATS - Jauges métalliques */}
      <div className="px-4 mt-auto pt-6">
        {/* Ligne de séparation */}
        <div
          className={`h-px mb-6 ${isDarkMode ? 'opacity-20' : 'opacity-30'}`}
          style={{
            background: isDarkMode
              ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
          }}
        />

        <MetalStat label="CPU" value={cpu} colorIndex={0} isCollapsed={isCollapsed} icon={<Cpu size={12} />} isDarkMode={isDarkMode} />
        <MetalStat label="RAM" value={ram} colorIndex={1} isCollapsed={isCollapsed} icon={<ShieldCheck size={12} />} isDarkMode={isDarkMode} />
        <MetalStat label="VRAM" value={vram} colorIndex={2} isCollapsed={isCollapsed} icon={<HardDrive size={12} />} isDarkMode={isDarkMode} />
      </div>
    </div>
  );
};

/**
 * MetalStat - Jauge style "métal chromé"
 */
const MetalStat = ({ label, value, colorIndex, isCollapsed, icon, isDarkMode }) => {
  // Couleurs arc-en-ciel pour les différentes jauges
  const colors = [
    { // CPU - Orange/Rouge
      gradient: 'linear-gradient(90deg, rgba(255,150,50,0.9) 0%, rgba(255,100,80,0.9) 100%)',
      glow: 'rgba(255,150,50,0.4)',
      text: isDarkMode ? 'text-orange-400' : 'text-orange-500',
    },
    { // RAM - Cyan/Bleu
      gradient: 'linear-gradient(90deg, rgba(100,200,255,0.9) 0%, rgba(100,150,255,0.9) 100%)',
      glow: 'rgba(100,200,255,0.4)',
      text: isDarkMode ? 'text-cyan-400' : 'text-cyan-500',
    },
    { // VRAM - Vert
      gradient: 'linear-gradient(90deg, rgba(100,255,150,0.9) 0%, rgba(100,220,200,0.9) 100%)',
      glow: 'rgba(100,255,150,0.4)',
      text: isDarkMode ? 'text-emerald-400' : 'text-emerald-500',
    },
  ];

  const c = colors[colorIndex] || colors[0];

  return (
    <div className="mb-4 last:mb-0">
      {!isCollapsed ? (
        <div className="w-full">
          {/* Header */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <span className={c.text}>{icon}</span>
              <span className={`text-[8px] font-black uppercase tracking-widest
                ${isDarkMode ? 'text-white/40' : 'text-gray-400'}
              `}>
                {label}
              </span>
            </div>
            <span className={`text-[9px] font-black
              ${isDarkMode ? 'text-white/60' : 'text-gray-500'}
            `}>
              {Math.round(value)}%
            </span>
          </div>

          {/* Barre de progression - Métal */}
          <div
            className="relative w-full h-1.5 rounded-full overflow-hidden"
            style={{
              background: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.08)',
            }}
          >
            {/* Remplissage */}
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(value, 100)}%`,
                background: c.gradient,
                boxShadow: `0 0 12px ${c.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
              }}
            />

            {/* Reflet surface */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 50%)',
              }}
            />
          </div>
        </div>
      ) : (
        /* Mode collapsed - Badge compact */
        <div
          className="flex flex-col items-center justify-center p-2 rounded-xl transition-all hover:scale-105"
          style={{
            background: isDarkMode ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.03)',
            border: isDarkMode ? '1px solid rgba(255, 255, 255, 0.05)' : '1px solid rgba(0, 0, 0, 0.05)',
          }}
        >
          <span className={c.text}>{icon}</span>
          <span className={`text-[7px] font-black mt-1 ${isDarkMode ? 'text-white/60' : 'text-gray-500'}`}>
            {Math.round(value)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
