import React from 'react';
import { Zap, LayoutDashboard, MessageSquare, Files, Settings, Cpu, ShieldCheck, HardDrive } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';

const Sidebar = ({ activeTab, setActiveTab, systemStats, isCollapsed, language }) => {
  const { isDarkMode } = useTheme();
  const t = translations[language] || translations.en;

  /**
   * Extraction sécurisée des stats système
   * Gère les formats : { usage_percent: X } ou { percent: X } ou X direct
   */
  const getVal = (s) => {
    if (s === null || s === undefined) return 0;
    if (typeof s === 'object') {
      return s.usage_percent ?? s.percent ?? 0;
    }
    return typeof s === 'number' ? s : 0;
  };

  // Calcul des valeurs pour les jauges
  const cpu = getVal(systemStats?.cpu);
  const ram = getVal(systemStats?.ram);
  
  // VRAM : Soit on calcule le ratio si on a les totaux, soit on prend le pourcentage direct du GPU
  const vram = (systemStats?.gpu?.vram_total > 0) 
    ? (systemStats.gpu.vram_used / systemStats.gpu.vram_total) * 100 
    : getVal(systemStats?.gpu);

  const menuItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: <LayoutDashboard size={18}/> },
    { id: 'chat', label: t.nav.chat, icon: <MessageSquare size={18}/> },
    { id: 'files', label: t.nav.files, icon: <Files size={18}/> },
    { id: 'settings', label: t.nav.settings, icon: <Settings size={18}/> }
  ];

  return (
    <div className={`flex flex-col h-screen py-6 transition-all duration-300 z-20 ${isCollapsed ? 'w-20' : 'w-64'}`}>
      
      {/* LOGO SECTION */}
      <div className={`flex items-center gap-3 px-6 mb-10 ${isCollapsed ? 'justify-center px-0' : ''}`}>
        <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20 flex-shrink-0 animate-pulse-soft">
          <Zap size={18} className="text-white fill-white" />
        </div>
        {!isCollapsed && (
          <span className={`font-black text-xl tracking-tighter uppercase italic ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Horizon <span className="text-indigo-500">AI</span>
          </span>
        )}
      </div>

      {/* NAVIGATION MENU */}
      <nav className="flex-1 px-3 space-y-1.5">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button 
              key={item.id} 
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[18px] transition-all group ${isCollapsed ? 'justify-center' : ''} 
                ${isActive 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 translate-x-1' 
                  : (isDarkMode ? 'text-white/40 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-black/5 hover:text-slate-900')}`}
            >
              <div className={`${isActive ? 'text-white' : 'group-hover:text-indigo-500'} transition-colors`}>
                {item.icon}
              </div>
              {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.2em]">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* SYSTEM STATS SECTION */}
      <div className={`px-4 mt-auto pt-6 border-t ${isDarkMode ? 'border-white/5' : 'border-black/5'}`}>
        <SidebarStat label="CPU" value={cpu} color="text-blue-500" bg="bg-blue-500" isCollapsed={isCollapsed} icon={<Cpu size={12}/>} />
        <SidebarStat label="RAM" value={ram} color="text-indigo-500" bg="bg-indigo-500" isCollapsed={isCollapsed} icon={<ShieldCheck size={12}/>} />
        <SidebarStat label="VRAM" value={vram} color="text-emerald-500" bg="bg-emerald-500" isCollapsed={isCollapsed} icon={<HardDrive size={12}/>} />
      </div>
    </div>
  );
};

/**
 * Composant interne pour l'affichage des statistiques (Barres de progression)
 */
const SidebarStat = ({ label, value, color, bg, isCollapsed, icon }) => (
  <div className="mb-4 last:mb-0">
    {!isCollapsed ? (
      <div className="w-full">
        <div className="flex justify-between items-center mb-1.5 opacity-60">
          <div className="flex items-center gap-2">
            <span className={color}>{icon}</span>
            <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
          </div>
          <span className={`text-[9px] font-black italic`}>{Math.round(value)}%</span>
        </div>
        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
          <div 
            className={`${bg} h-full transition-all duration-1000 shadow-[0_0_8px_currentColor]`} 
            style={{ width: `${Math.min(value, 100)}%` }} 
          />
        </div>
      </div>
    ) : (
      <div className={`flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 ${color} border border-white/5`}>
        {icon}
        <span className="text-[7px] font-black mt-1">{Math.round(value)}%</span>
      </div>
    )}
  </div>
);

export default Sidebar;