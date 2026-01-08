import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const TitleBar = () => {
  const { isDarkMode } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        const maximized = await invoke('is_maximized');
        setIsMaximized(maximized);
      } catch (e) {
        console.error('TitleBar: check maximized error', e);
      }
    };
    checkMaximized();
  }, []);

  const handleMinimize = async () => {
    try { await invoke('minimize_window'); } catch (e) { console.error(e); }
  };

  const handleMaximize = async () => {
    try {
      const newState = await invoke('toggle_maximize');
      setIsMaximized(newState);
    } catch (e) { console.error(e); }
  };

  const handleClose = async () => {
    try { await invoke('close_window'); } catch (e) { console.error(e); }
  };

  return (
    <div
      data-tauri-drag-region
      className={`fixed top-0 left-0 w-full z-[99999] h-9 flex items-center justify-between select-none backdrop-blur-md transition-all duration-300
        ${isDarkMode
          ? 'bg-black/40 border-b border-white/5 text-white'
          : 'bg-white/60 border-b border-slate-200 text-slate-800'}
      `}
    >
      {/* Section Gauche : Logo & Titre */}
      <div className="flex items-center gap-3 px-4 h-full flex-grow cursor-default" data-tauri-drag-region>
        <div
          className="w-5 h-5 rounded flex items-center justify-center shadow-[0_0_10px_rgba(0,0,0,0.5)]"
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, #444 0%, #111 100%)'
              : 'linear-gradient(135deg, #fff 0%, #ccc 100%)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
          }}
        >
          <span className={`text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>H</span>
        </div>

        <span className={`text-[10px] font-bold uppercase tracking-[0.3em] opacity-80 ${isDarkMode ? 'text-white' : 'text-slate-600'}`}>
          Horizon AI
        </span>
      </div>

      {/* Section Droite : Boutons de contrôle */}
      <div className="flex items-center h-full px-1">
        
        {/* Bouton Réduire */}
        <button
          onClick={handleMinimize}
          className={`group w-10 h-7 flex items-center justify-center rounded-md transition-all duration-200
            ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          <Minus size={14} strokeWidth={2} className="opacity-60 group-hover:opacity-100 transition-opacity" />
        </button>

        {/* Bouton Agrandir / Restaurer */}
        <button
          onClick={handleMaximize}
          className={`group w-10 h-7 flex items-center justify-center rounded-md transition-all duration-200
            ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
        >
          {isMaximized ? (
            <Copy size={13} strokeWidth={2} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          ) : (
            <Square size={13} strokeWidth={2} className="opacity-60 group-hover:opacity-100 transition-opacity" />
          )}
        </button>

        {/* Bouton Fermer */}
        <button
          onClick={handleClose}
          className={`group w-10 h-7 flex items-center justify-center rounded-md transition-all duration-300
            ${isDarkMode ? 'hover:bg-red-500/80' : 'hover:bg-red-500'} `}
        >
          <X size={15} strokeWidth={2} 
             className={`transition-all duration-200 
             ${isDarkMode ? 'opacity-60 group-hover:opacity-100' : 'opacity-50 group-hover:text-white group-hover:opacity-100'}`} 
          />
        </button>
        
      </div>
    </div>
  );
};

export default TitleBar;