/**
 * Header Component
 * Displays the title and status badge
 */

import React from 'react';
import { Globe, Lock, Unlock } from 'lucide-react';

const Header = ({ text, status, toggling, isDarkMode }) => {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Globe className={isDarkMode ? 'text-gray-400' : 'text-gray-500'} size={22} />
        <div>
          <h2 className="text-sm font-black uppercase tracking-widest">{text.title}</h2>
          <p className={`text-[10px] ${isDarkMode ? 'opacity-40' : 'text-slate-400'}`}>{text.subtitle}</p>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${isDarkMode ? 'bg-white/5 border border-white/10' : 'bg-slate-100 border border-slate-200'}`}>
        {status?.tunnel_running ? <Unlock size={14} /> : <Lock size={14} />}
        <span className="text-xs font-bold">
          {toggling ? text.connecting : status?.tunnel_running ? text.tunnelActive : text.tunnelInactive}
        </span>
      </div>
    </div>
  );
};

export default Header;