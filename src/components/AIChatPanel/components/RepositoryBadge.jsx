/**
 * RepositoryBadge - Badge affichant le repository sélectionné
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { GitBranch, X, Loader2 } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

export const RepositoryBadge = ({
  selectedRepo,
  analyzingRepo,
  repoAnalysis,
  language,
  onRemove
}) => {
  const { isDarkMode } = useTheme();

  if (!selectedRepo) return null;

  return (
    <div className="max-w-4xl mx-auto mb-4 flex items-center gap-2">
      <div className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase ${
        isDarkMode
          ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
          : 'bg-blue-50 border border-blue-200 text-blue-700'
      }`}>
        <GitBranch size={10} className="sm:w-3 sm:h-3 flex-shrink-0" />
        <span className="truncate max-w-[120px] sm:max-w-[200px]" title={selectedRepo}>
          {selectedRepo.split(/[/\\]/).pop()}
        </span>
        {analyzingRepo && (
          <Loader2 size={8} className="sm:w-[10px] sm:h-[10px] animate-spin flex-shrink-0" />
        )}
        {repoAnalysis && (
          <span className="text-[9px] sm:text-[10px] opacity-60 hidden sm:inline">
            ({repoAnalysis.file_count} {language === 'fr' ? 'fichiers' : 'files'})
          </span>
        )}
        <button
          onClick={onRemove}
          className="ml-0.5 sm:ml-1 p-0.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          title={language === 'fr' ? 'Retirer le repository' : 'Remove repository'}
        >
          <X size={8} className="sm:w-[10px] sm:h-[10px]" />
        </button>
      </div>
    </div>
  );
};
