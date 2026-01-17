import React from 'react';
import { Cpu, Database, Files, Brain, Globe, Settings, ArrowRight } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';

const AdvancedCenter = ({ language = 'fr', setActiveTab }) => {
  const { isDarkMode } = useTheme();
  const t = translations[language] || translations.en;
  const a = t.advancedCenter || {};

  const items = [
    {
      id: 'models',
      title: a.modelsTitle || 'Internal models',
      desc: a.modelsDesc || 'Manage installed models.',
      icon: Database
    },
    {
      id: 'files',
      title: a.filesTitle || 'Files & context',
      desc: a.filesDesc || 'Browse local files.',
      icon: Files
    },
    {
      id: 'memory',
      title: a.memoryTitle || 'Memory',
      desc: a.memoryDesc || 'User and project memory.',
      icon: Brain
    },
    {
      id: 'remote',
      title: a.remoteTitle || 'Remote access',
      desc: a.remoteDesc || 'Access from another device.',
      icon: Globe
    },
    {
      id: 'settings',
      title: a.settingsTitle || 'Settings',
      desc: a.settingsDesc || 'Advanced configuration.',
      icon: Settings
    }
  ];

  return (
    <div className={`p-6 sm:p-8 lg:p-12 w-full h-full overflow-y-auto custom-scrollbar ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] opacity-50">
            <Cpu size={14} />
            {a.subtitle || 'Optional'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {a.title || 'Advanced Center'}
          </h1>
          <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
            {a.description || 'Expert settings live here. You can ignore this screen.'}
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab?.(item.id)}
              className={`p-6 rounded-[24px] border text-left transition-all group hover:scale-[1.02] active:scale-[0.98]\n                ${isDarkMode ? 'bg-black/30 border-white/10 hover:border-white/20' : 'bg-white border-slate-200 shadow-lg hover:shadow-xl'}\n              `}
            >
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center\n                  ${isDarkMode ? 'bg-gray-500/10 text-gray-300' : 'bg-gray-200 text-gray-700'}\n                `}>
                  <item.icon size={22} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold">{item.title}</h3>
                  <p className="text-xs opacity-50">{item.desc}</p>
                </div>
                <ArrowRight size={16} className="opacity-40" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdvancedCenter;
