/**
 * SecurityNotification - Notification de blocage intelligente (V2.1 Phase 3)
 * 
 * Responsabilités:
 * - Afficher une notification claire quand une action est bloquée
 * - Expliquer pourquoi l'action est bloquée (permission manquante)
 * - Proposer une action visible (bouton pour demander permission)
 * - Afficher des détails pédagogiques sur la sécurité
 * 
 * Style: Dark, Premium, Glass (Horizon AI) avec couleur rouge pour alerte
 */
import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';
import { getPermissionDescription } from '../services/permission_detector';

export const SecurityNotification = ({ 
  blockedAction, 
  missingPermission, 
  onRequestPermission,
  onDismiss,
  language = 'fr'
}) => {
  const { isDarkMode } = useTheme();
  const t = translations[language]?.security || translations.en.security;
  const [showDetails, setShowDetails] = useState(false);

  if (!blockedAction || !missingPermission) {
    return null;
  }

  const permissionDesc = getPermissionDescription(missingPermission, language);

  return (
    <div className={`
      security-notification mb-4 p-4 rounded-xl border
      ${isDarkMode 
        ? 'bg-red-500/10 border-red-500/30 backdrop-blur-sm' 
        : 'bg-red-50 border-red-200'
      }
      animate-fade-in
    `}>
      <div className="flex items-start gap-3">
        <ShieldAlert 
          className={`flex-shrink-0 mt-0.5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} 
          size={20} 
        />
        
        <div className="flex-1 min-w-0">
          {/* Titre */}
          <h4 className={`
            font-bold mb-1 text-sm
            ${isDarkMode ? 'text-red-400' : 'text-red-700'}
          `}>
            {t.actionBlocked}
          </h4>
          
          {/* Description de l'action bloquée */}
          <p className={`
            text-xs mb-2
            ${isDarkMode ? 'text-white/80' : 'text-slate-700'}
          `}>
            <span className="font-semibold">{t.actionBlockedReason}:</span>{' '}
            {blockedAction}
          </p>
          
          {/* Info permission manquante */}
          <div className={`
            text-xs mb-3 p-2 rounded-lg font-mono
            ${isDarkMode ? 'bg-black/30 text-white/70' : 'bg-white text-slate-600'}
          `}>
            <span className="font-semibold">{t.missingPermission}:</span>{' '}
            <code className="text-red-400 font-bold">{missingPermission}</code>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            {onRequestPermission && (
              <button
                onClick={onRequestPermission}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-bold
                  transition-all hover:scale-105 active:scale-95
                  ${isDarkMode
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                    : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
                  }
                `}
              >
                {t.requestPermission}
              </button>
            )}
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold
                transition-all hover:scale-105 active:scale-95
                flex items-center gap-1.5
                ${isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                }
              `}
            >
              {t.learnMore}
              {showDetails ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className={`
                  px-3 py-1.5 rounded-lg text-xs font-semibold
                  transition-all hover:scale-105 active:scale-95
                  ${isDarkMode
                    ? 'bg-white/5 hover:bg-white/10 text-white/60'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }
                `}
              >
                {language === 'fr' ? 'Fermer' : 'Dismiss'}
              </button>
            )}
          </div>
          
          {/* Détails expandables */}
          {showDetails && (
            <div className={`
              mt-3 pt-3 border-t
              ${isDarkMode ? 'border-red-500/20' : 'border-red-200'}
            `}>
              <div className="space-y-2">
                {/* Mode sécurité actif */}
                <div className="flex items-start gap-2">
                  <Info 
                    size={14} 
                    className={`
                      flex-shrink-0 mt-0.5
                      ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}
                    `} 
                  />
                  <p className={`
                    text-xs leading-relaxed
                    ${isDarkMode ? 'text-white/70' : 'text-slate-600'}
                  `}>
                    <span className="font-semibold">{t.securityModeActive}:</span>{' '}
                    {t.paranoModeDescription}
                  </p>
                </div>
                
                {/* Description permission */}
                <div className="flex items-start gap-2">
                  <AlertTriangle 
                    size={14} 
                    className={`
                      flex-shrink-0 mt-0.5
                      ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}
                    `} 
                  />
                  <p className={`
                    text-xs leading-relaxed
                    ${isDarkMode ? 'text-white/70' : 'text-slate-600'}
                  `}>
                    <span className="font-semibold">{t.permissionRequiredFor}:</span>{' '}
                    {permissionDesc}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
