/**
 * PermissionBar - Barre de permissions contextuelle (V2.1 Phase 3)
 * 
 * Responsabilités:
 * - Afficher les permissions disponibles avec boutons actifs/inactifs
 * - Permettre d'activer/désactiver permissions depuis le chat
 * - Afficher l'état actuel des permissions (badge sécurité actif)
 * - Intégration avec PermissionRequestModal pour confirmation
 * 
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { FileText, Edit, GitBranch, ShieldCheck, Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';

export const PermissionBar = ({ 
  activeProject, 
  activePermissions,
  onRequestPermission,
  language = 'fr'
}) => {
  const { isDarkMode } = useTheme();
  const t = translations[language]?.security || translations.en.security;

  // Permissions disponibles pour affichage
  const availablePermissions = [
    { 
      id: 'FileRead', 
      label: t.fileRead || (language === 'fr' ? 'Lecture Fichiers' : 'Read Files'), 
      icon: FileText,
      description: language === 'fr' ? 'Lecture de fichiers' : 'Read files'
    },
    { 
      id: 'FileWrite', 
      label: t.fileWrite || (language === 'fr' ? 'Écriture Fichiers' : 'Write Files'), 
      icon: Edit,
      description: language === 'fr' ? 'Écriture de fichiers' : 'Write files'
    },
    { 
      id: 'RepoAnalyze', 
      label: t.repoAnalyze || (language === 'fr' ? 'Analyser Repo' : 'Analyze Repo'), 
      icon: GitBranch,
      description: language === 'fr' ? 'Analyse de repository' : 'Repository analysis'
    }
  ];

  // État sécurité : Toujours actif (mode sécurité par défaut)
  const securityModeActive = true; // V2.1 : Mode sécurité toujours actif par défaut

  return (
    <div className={`
      permission-bar mb-3 p-2.5 rounded-xl border
      ${isDarkMode 
        ? 'bg-black/20 border-white/5 backdrop-blur-sm' 
        : 'bg-slate-50 border-slate-200'
      }
    `}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Label */}
        <span className={`
          text-xs font-bold uppercase tracking-wide
          ${isDarkMode ? 'text-white/60' : 'text-slate-600'}
        `}>
          {t.permissionsLabel || 'Permissions:'}
        </span>
        
        {/* Boutons permissions */}
        {availablePermissions.map(perm => {
          const Icon = perm.icon;
          const isActive = activePermissions?.[perm.id] || false;
          
          return (
            <button
              key={perm.id}
              onClick={() => onRequestPermission?.(perm.id)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                transition-all hover:scale-105 active:scale-95
                ${isActive
                  ? isDarkMode
                    ? 'bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30'
                    : 'bg-green-100 hover:bg-green-200 text-green-700 border border-green-300'
                  : isDarkMode
                    ? 'bg-white/5 hover:bg-white/10 text-white/60 border border-white/10'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-300'
                }
              `}
              title={perm.description}
            >
              <Icon size={14} />
              <span>{perm.label}</span>
              {isActive && (
                <ShieldCheck 
                  size={12} 
                  className={isDarkMode ? 'text-green-400' : 'text-green-600'} 
                />
              )}
            </button>
          );
        })}
        
        {/* Badge Mode Sécurité Actif (toujours visible) */}
        <div className={`
          ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold
          ${isDarkMode 
            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
            : 'bg-green-100 text-green-700 border border-green-300'
          }
        `}>
          <Shield size={12} />
          <span>{t.securityModeActive || 'Security Mode Active'}</span>
        </div>
      </div>
    </div>
  );
};
