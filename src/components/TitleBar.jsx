import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Minus, Square, X, Copy } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

/**
 * TitleBar - Barre de titre personnalisée
 * 
 * Remplace la barre de titre Windows native pour un design cohérent
 * avec l'identité visuelle de Horizon AI
 */
const TitleBar = () => {
  const { isDarkMode } = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);

  // Vérifier l'état de la fenêtre au chargement
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
    try {
      await invoke('minimize_window');
    } catch (e) {
      console.error('TitleBar: minimize error', e);
    }
  };

  const handleMaximize = async () => {
    try {
      const newState = await invoke('toggle_maximize');
      setIsMaximized(newState);
    } catch (e) {
      console.error('TitleBar: maximize error', e);
    }
  };

  const handleClose = async () => {
    try {
      await invoke('close_window');
    } catch (e) {
      console.error('TitleBar: close error', e);
    }
  };

  return (
    <div 
      className={`h-9 flex items-center justify-between select-none
        ${isDarkMode 
          ? 'bg-black/80 border-b border-white/5' 
          : 'bg-slate-100 border-b border-slate-200'}
      `}
      // Zone draggable pour déplacer la fenêtre
      data-tauri-drag-region
    >
      {/* Logo et titre */}
      <div className="flex items-center gap-3 px-4" data-tauri-drag-region>
        {/* Logo petit */}
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="text-white text-[9px] font-black">H</span>
        </div>
        
        {/* Titre */}
        <span 
          className={`text-[11px] font-bold uppercase tracking-[0.2em]
            ${isDarkMode ? 'text-white/60' : 'text-slate-600'}
          `}
          data-tauri-drag-region
        >
          Horizon AI
        </span>
      </div>

      {/* Boutons de fenêtre */}
      <div className="flex items-center h-full">
        {/* Minimiser */}
        <button
          onClick={handleMinimize}
          className={`w-12 h-full flex items-center justify-center transition-colors duration-150
            ${isDarkMode 
              ? 'hover:bg-white/10 text-white/40 hover:text-white/80' 
              : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}
          `}
          title="Réduire"
        >
          <Minus size={14} strokeWidth={2} />
        </button>

        {/* Maximiser/Restaurer */}
        <button
          onClick={handleMaximize}
          className={`w-12 h-full flex items-center justify-center transition-colors duration-150
            ${isDarkMode 
              ? 'hover:bg-white/10 text-white/40 hover:text-white/80' 
              : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}
          `}
          title={isMaximized ? "Restaurer" : "Agrandir"}
        >
          {isMaximized ? (
            // Icône restaurer (deux carrés superposés)
            <Copy size={12} strokeWidth={2} />
          ) : (
            // Icône maximiser (carré simple)
            <Square size={12} strokeWidth={2} />
          )}
        </button>

        {/* Fermer */}
        <button
          onClick={handleClose}
          className={`w-12 h-full flex items-center justify-center transition-colors duration-150
            ${isDarkMode 
              ? 'hover:bg-red-500 text-white/40 hover:text-white' 
              : 'hover:bg-red-500 text-slate-400 hover:text-white'}
          `}
          title="Fermer"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
