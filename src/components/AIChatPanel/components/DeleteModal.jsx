/**
 * DeleteModal - Modal de confirmation de suppression
 * Style: Dark, Premium, Glass (Horizon AI)
 */
import React from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../../../contexts/ThemeContext';

export const DeleteModal = ({
  show,
  language,
  onClose,
  onConfirm
}) => {
  const { isDarkMode } = useTheme();

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className={`relative w-[400px] p-8 rounded-[28px] border shadow-2xl ${isDarkMode ? 'bg-zinc-900 border-white/10' : 'bg-white border-slate-200'}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10"
        >
          <X size={16} />
        </button>

        <h3 className="text-lg font-black uppercase text-center mb-6">
          {language === 'fr' ? 'Supprimer la conversation ?' : 'Delete conversation?'}
        </h3>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl border text-[10px] font-black uppercase"
          >
            {language === 'fr' ? 'Annuler' : 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 rounded-2xl bg-red-500 text-white text-[10px] font-black uppercase"
          >
            {language === 'fr' ? 'Supprimer' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
