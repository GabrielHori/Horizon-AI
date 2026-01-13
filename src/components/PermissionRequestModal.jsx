/**
 * PermissionRequestModal - Modal de confirmation demande permission (V2.1 Phase 3)
 * 
 * Responsabilités:
 * - Afficher une confirmation explicite pour activation de permission
 * - Permettre de choisir la portée (temporaire/session/projet)
 * - Expliquer les risques de sécurité
 * - Toujours demander confirmation utilisateur (jamais d'activation automatique)
 * 
 * Style: Dark, Premium, Glass (Horizon AI) avec avertissements visuels
 */
import React, { useState } from 'react';
import { Shield, AlertTriangle, Clock, Timer, Folder, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';

export const PermissionRequestModal = ({
  permission,
  description,
  activeProject,
  defaultScope = 'temporary',
  defaultDuration = 60,
  onConfirm,
  onCancel,
  language = 'fr'
}) => {
  const { isDarkMode } = useTheme();
  const t = translations[language]?.security || translations.en.security;

  const [selectedScope, setSelectedScope] = useState(defaultScope);
  const [selectedDuration, setSelectedDuration] = useState(defaultDuration);

  if (!permission || !description) {
    return null;
  }

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm({
        permission,
        scope: selectedScope,
        duration: selectedScope === 'temporary' ? selectedDuration : null,
        projectId: selectedScope === 'project' ? activeProject?.id : null
      });
    }
  };

  const scopeOptions = [
    {
      value: 'temporary',
      label: language === 'fr' ? 'Temporaire' : 'Temporary',
      description: language === 'fr'
        ? 'Permission active pour une durée limitée'
        : 'Permission active for a limited duration',
      icon: Clock,
      available: true
    },
    {
      value: 'session',
      label: language === 'fr' ? 'Cette session' : 'This session',
      description: language === 'fr'
        ? 'Permission active jusqu\'à fermeture de l\'application'
        : 'Permission active until application closes',
      icon: Timer,
      available: true
    },
    {
      value: 'project',
      label: language === 'fr' ? 'Ce projet' : 'This project',
      description: language === 'fr'
        ? activeProject
          ? `Permission liée au projet "${activeProject.name}"`
          : 'Permission liée au projet actif (nécessite un projet actif)'
        : activeProject
          ? `Permission linked to project "${activeProject.name}"`
          : 'Permission linked to active project (requires active project)',
      icon: Folder,
      available: !!activeProject
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className={`
        relative w-full max-w-md rounded-2xl border shadow-2xl
        ${isDarkMode
          ? 'bg-slate-900/95 border-white/10 backdrop-blur-xl'
          : 'bg-white border-slate-200'
        }
        animate-scale-in
      `}>
        {/* Header */}
        <div className={`
          flex items-center justify-between p-4 border-b
          ${isDarkMode ? 'border-white/10' : 'border-slate-200'}
        `}>
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded-lg
              ${isDarkMode ? 'bg-yellow-500/20' : 'bg-yellow-100'}
            `}>
              <Shield
                size={20}
                className={isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}
              />
            </div>
            <h3 className={`
              font-bold text-base
              ${isDarkMode ? 'text-white' : 'text-slate-900'}
            `}>
              {t.permissionRequestTitle}
            </h3>
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className={`
                p-1.5 rounded-lg transition-colors
                ${isDarkMode
                  ? 'hover:bg-white/10 text-white/70'
                  : 'hover:bg-slate-100 text-slate-600'
                }
              `}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Description */}
          <div>
            <p className={`
              text-sm mb-2
              ${isDarkMode ? 'text-white/80' : 'text-slate-700'}
            `}>
              {t.permissionRequestDescription}
            </p>
            <div className={`
              p-3 rounded-lg font-semibold
              ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-50 text-blue-700'}
            `}>
              {description}
            </div>
          </div>

          {/* Avertissement */}
          <div className={`
            flex items-start gap-2 p-3 rounded-lg border
            ${isDarkMode
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-yellow-50 border-yellow-200'
            }
          `}>
            <AlertTriangle
              size={16}
              className={`
                flex-shrink-0 mt-0.5
                ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}
              `}
            />
            <p className={`
              text-xs leading-relaxed
              ${isDarkMode ? 'text-yellow-300/90' : 'text-yellow-700'}
            `}>
              {t.permissionWarning}
            </p>
          </div>

          {/* Sélection portée */}
          <div>
            <label className={`
              block text-xs font-bold mb-2
              ${isDarkMode ? 'text-white/90' : 'text-slate-700'}
            `}>
              {t.permissionScope}
            </label>

            <div className="space-y-2">
              {scopeOptions.map(option => {
                const Icon = option.icon;
                const isSelected = selectedScope === option.value;
                const isDisabled = !option.available;

                return (
                  <button
                    key={option.value}
                    onClick={() => !isDisabled && setSelectedScope(option.value)}
                    disabled={isDisabled}
                    className={`
                      w-full flex items-start gap-3 p-3 rounded-lg border transition-all
                      ${isSelected
                        ? isDarkMode
                          ? 'bg-blue-500/20 border-blue-500/50'
                          : 'bg-blue-50 border-blue-300'
                        : isDarkMode
                          ? 'bg-white/5 border-white/10 hover:bg-white/10'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                      }
                      ${isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer'
                      }
                    `}
                  >
                    <Icon
                      size={18}
                      className={`
                        flex-shrink-0 mt-0.5
                        ${isSelected
                          ? isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          : isDarkMode ? 'text-white/50' : 'text-slate-400'
                        }
                      `}
                    />
                    <div className="flex-1 text-left">
                      <div className={`
                        text-xs font-semibold mb-0.5
                        ${isSelected
                          ? isDarkMode ? 'text-blue-400' : 'text-blue-700'
                          : isDarkMode ? 'text-white/80' : 'text-slate-700'
                        }
                      `}>
                        {option.label}
                      </div>
                      <div className={`
                        text-[10px]
                        ${isDarkMode ? 'text-white/60' : 'text-slate-500'}
                      `}>
                        {option.description}
                      </div>
                    </div>
                    {isSelected && (
                      <div className={`
                        w-4 h-4 rounded-full border-2 flex items-center justify-center
                        ${isDarkMode
                          ? 'border-blue-400 bg-blue-400'
                          : 'border-blue-600 bg-blue-600'
                        }
                      `}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sélecteur durée (si temporaire) */}
          {selectedScope === 'temporary' && (
            <div>
              <label className={`
                block text-xs font-bold mb-2
                ${isDarkMode ? 'text-white/90' : 'text-slate-700'}
              `}>
                {t.permissionDuration}
              </label>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(parseInt(e.target.value))}
                className={`
                  w-full px-3 py-2 rounded-lg text-sm font-semibold border
                  ${isDarkMode
                    ? 'bg-white/5 border-white/10 text-white focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20'
                    : 'bg-white border-slate-300 text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                  }
                `}
              >
                <option value={15}>{t.permissionDuration15min}</option>
                <option value={60}>{t.permissionDuration1hour}</option>
                <option value={480}>{t.permissionDuration8hours}</option>
              </select>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`
          flex gap-3 p-4 border-t
          ${isDarkMode ? 'border-white/10' : 'border-slate-200'}
        `}>
          {onCancel && (
            <button
              onClick={onCancel}
              className={`
                flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all
                ${isDarkMode
                  ? 'bg-white/5 hover:bg-white/10 text-white/80'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }
              `}
            >
              {t.permissionCancel}
            </button>
          )}

          <button
            onClick={handleConfirm}
            className={`
              flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all
              ${isDarkMode
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30'
                : 'bg-red-100 hover:bg-red-200 text-red-700 border border-red-300'
              }
            `}
          >
            {t.permissionAuthorize.replace('{scope}',
              selectedScope === 'temporary'
                ? (language === 'fr' ? 'Temporaire' : 'Temporary')
                : selectedScope === 'session'
                  ? (language === 'fr' ? 'Session' : 'Session')
                  : (language === 'fr' ? 'Projet' : 'Project')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
