/**
 * PublicUrlBox Component
 * Displays the public URL and related actions
 */

import React from 'react';
import { ExternalLink, Copy, Check } from 'lucide-react';

const PublicUrlBox = ({
  text,
  status,
  copied,
  copyToClipboard,
  currentToken,
  language,
  isDarkMode
}) => {
  return (
    <div className={`p-4 rounded-2xl ${isDarkMode ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        <ExternalLink size={14} className="text-emerald-500" />
        <span className="text-xs font-bold text-emerald-500">{text.publicUrl}</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          readOnly
          value={status?.tunnel_url || "Initialisation..."}
          className={`flex-1 p-3 rounded-xl text-xs font-mono ${isDarkMode ? 'bg-black/40 text-white' : 'bg-white text-slate-900'} border-none outline-none`}
        />

        <button
          onClick={() => copyToClipboard(status?.tunnel_url, 'url')}
          className={`p-3 rounded-xl ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
          title={text.copyUrl}
        >
          {copied === 'url' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
        </button>

        <a
          href={status?.tunnel_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`p-3 rounded-xl ${isDarkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200 hover:bg-slate-300'} transition-colors`}
          title={text.openInBrowser}
        >
          <ExternalLink size={16} />
        </a>
      </div>

      {copied === 'url' && (
        <p className="text-xs text-emerald-500 mt-2">{text.urlCopied}</p>
      )}

      {/* Authenticated link with token */}
      {currentToken && status?.tunnel_url && (
        <div className={`mt-4 p-3 rounded-xl ${isDarkMode ? 'bg-black/40' : 'bg-white'}`}>
          <p className={`text-[10px] mb-2 ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>
            {language === 'fr' ? '🔗 Lien avec authentification (connexion automatique):' : '🔗 Link with auth (auto-login):'}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={`${status.tunnel_url}?token=${currentToken.token}`}
              className={`flex-1 p-2 rounded-lg text-[10px] font-mono ${isDarkMode ? 'bg-white/5 text-white/60' : 'bg-slate-50 text-slate-600'} border-none outline-none`}
            />
            <button
              onClick={() => copyToClipboard(`${status.tunnel_url}?token=${currentToken.token}`, 'fullUrl')}
              className={`p-2 rounded-lg ${isDarkMode ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} transition-colors`}
              title={language === 'fr' ? 'Copier le lien complet' : 'Copy full link'}
            >
              {copied === 'fullUrl' ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
          <p className={`text-[9px] mt-2 ${isDarkMode ? 'text-amber-400/60' : 'text-amber-600'}`}>
            ⚠️ {language === 'fr' ? 'Ce lien contient votre token - ne le partagez pas publiquement' : 'This link contains your token - do not share publicly'}
          </p>
        </div>
      )}
    </div>
  );
};

export default PublicUrlBox;