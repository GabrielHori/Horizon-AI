/**
 * ProjectBadge - Badge affichant le projet actif
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { Folder, Lock, Unlock, GitBranch } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

export const ProjectBadge = ({
  activeProject,
  selectedRepo,
  language,
  onRemove
}) => {
  const { isDarkMode } = useTheme();

  if (!activeProject) return null;

  const permissions = activeProject.permissions || { read: true, write: false };

  return (
    <div className="max-w-4xl mx-auto mb-3 flex flex-wrap items-center gap-2">
      {/* Badge Projet */}
      <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase ${
        isDarkMode
          ? 'bg-gray-500/10 border border-gray-500/30 text-gray-300'
          : 'bg-gray-100 border border-gray-300 text-gray-700'
      }`}>
        <Folder size={10} className="sm:w-3 sm:h-3 flex-shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[200px]" title={activeProject.scopePath}>
          {activeProject.name}
        </span>
        {permissions.write ? (
          <Unlock size={8} className="sm:w-[10px] sm:h-[10px] flex-shrink-0 opacity-60" title={language === 'fr' ? 'Écriture autorisée' : 'Write allowed'} />
        ) : (
          <Lock size={8} className="sm:w-[10px] sm:h-[10px] flex-shrink-0 opacity-60" title={language === 'fr' ? 'Lecture seule' : 'Read only'} />
        )}
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-0.5 sm:ml-1 p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
            title={language === 'fr' ? 'Retirer le projet' : 'Remove project'}
          >
            <Folder size={8} className="sm:w-[10px] sm:h-[10px]" />
          </button>
        )}
      </div>

      {/* Badge Repo (si présent et différent du projet) */}
      {selectedRepo && selectedRepo !== activeProject.scopePath && (
        <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase ${
          isDarkMode
            ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
            : 'bg-blue-50 border border-blue-200 text-blue-700'
        }`}>
          <GitBranch size={10} className="sm:w-3 sm:h-3 flex-shrink-0" />
          <span className="truncate max-w-[120px] sm:max-w-[200px]" title={selectedRepo}>
            {selectedRepo.split(/[/\\]/).pop()}
          </span>
        </div>
      )}
    </div>
  );
};
