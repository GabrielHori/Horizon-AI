import React, { useEffect, useState } from 'react';
import { Sparkles, MessageSquare, FileText, PenLine, FolderSearch, ArrowRight, ShieldCheck } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { translations } from '../constants/translations';
import PermissionService from '../services/permission_service';

const Dashboard = ({
  language = 'en',
  healthStatus = 'healthy',
  setActiveTab,
  setSelectedChatId,
  userName = 'User',
  selectedStyle,
  setSelectedStyle,
  setChatIntent,
  setPrefillPrompt
}) => {
  const { isDarkMode } = useTheme();
  const t = translations[language] || translations.en;
  const d = t.dashboard || translations.en.dashboard;

  const [paranoMode, setParanoMode] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const loadParanoMode = async () => {
      try {
        const status = await PermissionService.getParanoMode();
        if (isMounted) setParanoMode(status);
      } catch {
        if (isMounted) setParanoMode(null);
      }
    };

    loadParanoMode();

    return () => {
      isMounted = false;
    };
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return d.greeting?.morning || 'Good morning';
    if (hour < 18) return d.greeting?.afternoon || 'Good afternoon';
    return d.greeting?.evening || 'Good evening';
  };

  const intents = [
    {
      id: 'ask',
      icon: MessageSquare,
      title: d.intents?.ask?.title || 'Ask a question',
      desc: d.intents?.ask?.desc || 'A clear, direct answer.',
      style: 'clear',
      placeholder: d.intents?.ask?.placeholder || 'Ask your question...'
    },
    {
      id: 'understand',
      icon: FileText,
      title: d.intents?.understand?.title || 'Understand a text',
      desc: d.intents?.understand?.desc || 'Simple explanation, step by step.',
      style: 'structured',
      placeholder: d.intents?.understand?.placeholder || 'Paste a text to explain...'
    },
    {
      id: 'write',
      icon: PenLine,
      title: d.intents?.write?.title || 'Writing help',
      desc: d.intents?.write?.desc || 'Rewrite, improve, or draft.',
      style: 'creative',
      placeholder: d.intents?.write?.placeholder || 'Describe what you want to write...'
    },
    {
      id: 'analyze',
      icon: FolderSearch,
      title: d.intents?.analyze?.title || 'Analyze a project',
      desc: d.intents?.analyze?.desc || 'Optional. For a local folder.',
      style: 'precise',
      placeholder: d.intents?.analyze?.placeholder || 'Tell me what to analyze...'
    }
  ];

  const handleIntent = (intent) => {
    setSelectedChatId?.(null);
    if (setSelectedStyle) {
      setSelectedStyle(intent.style);
    }
    setChatIntent?.({
      id: intent.id,
      label: intent.title,
      placeholder: intent.placeholder
    });
    if (setPrefillPrompt) {
      setPrefillPrompt('');
    }
    setActiveTab('chat');
  };

  const securityLabel = paranoMode
    ? (d.security?.max || 'Maximum security')
    : (d.security?.normal || 'Normal');

  return (
    <div className="relative w-full h-full overflow-y-auto bg-transparent p-4 sm:p-6 md:p-8 custom-scrollbar">
      <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">

        {/* === WELCOME HEADER === */}
        <div className="text-center py-4 sm:py-6 md:py-8">
          <div className={`inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-4 sm:mb-6 ${isDarkMode ? 'bg-gray-500/10 border border-gray-500/20 text-gray-400' : 'bg-gray-200 border border-gray-300 text-gray-600'}`}>
            <Sparkles size={12} className="sm:w-[14px] sm:h-[14px]" />
            {healthStatus === 'healthy'
              ? (d.systemReady || 'System Ready')
              : (d.connecting || 'Connecting...')}
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight mb-2 sm:mb-3 px-4">
            {getGreeting()}, <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>{userName}</span>
          </h1>

          <p className={`text-sm sm:text-base md:text-lg px-4 ${isDarkMode ? 'text-white/50' : 'text-slate-500'}`}>
            {d.entryTitle || 'What would you like to do?'}
          </p>

          <p className={`text-xs sm:text-sm mt-2 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
            {d.entrySubtitle || 'Everything stays on this computer unless you say otherwise.'}
          </p>
        </div>

        {/* === INTENTIONS === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {intents.map((intent) => (
            <IntentCard
              key={intent.id}
              icon={intent.icon}
              title={intent.title}
              desc={intent.desc}
              onClick={() => handleIntent(intent)}
              isDarkMode={isDarkMode}
              dataOnboarding={intent.id === 'ask' ? 'intent-ask' : undefined}
            />
          ))}
        </div>

        {/* === SECONDARY ACTIONS === */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SecondaryCard
            icon={MessageSquare}
            title={d.secondary?.resumeTitle || 'Resume a conversation'}
            desc={d.secondary?.resumeDesc || 'Find your recent chats'}
            onClick={() => setActiveTab('chat')}
            isDarkMode={isDarkMode}
          />
          <SecondaryCard
            icon={ShieldCheck}
            title={d.secondary?.securityTitle || 'Security'}
            desc={`${d.secondary?.securityDesc || 'Current mode'}: ${securityLabel}`}
            onClick={() => setActiveTab('security')}
            isDarkMode={isDarkMode}
            dataOnboarding="security-card"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl text-xs opacity-70">
          <span>{d.footer?.local || 'Local assistant. No automatic sharing.'}</span>
          <button
            onClick={() => setActiveTab('advanced')}
            data-onboarding="advanced-link"
            className={`text-xs font-bold uppercase tracking-widest ${isDarkMode ? 'text-white/50 hover:text-white/80' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {d.secondary?.advancedTitle || 'Advanced center'}
            <ArrowRight size={12} className="inline ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

const IntentCard = ({ icon: Icon, title, desc, onClick, isDarkMode, dataOnboarding }) => (
  <button
    onClick={onClick}
    data-onboarding={dataOnboarding}
    className={`p-6 rounded-[24px] border text-left transition-all group hover:scale-[1.02] active:scale-[0.98]
      ${isDarkMode
        ? 'bg-black/30 border-white/10 hover:border-white/20'
        : 'bg-white border-slate-200 shadow-lg hover:shadow-xl'}
    `}
  >
    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110
      ${isDarkMode ? 'bg-gray-500/10 text-gray-300' : 'bg-gray-200 text-gray-700'}
    `}>
      <Icon size={24} />
    </div>
    <h3 className="font-bold mb-1">{title}</h3>
    <p className="text-xs opacity-50">{desc}</p>
  </button>
);

const SecondaryCard = ({ icon: Icon, title, desc, onClick, isDarkMode, dataOnboarding }) => (
  <button
    onClick={onClick}
    data-onboarding={dataOnboarding}
    className={`p-5 rounded-[20px] border text-left transition-all group hover:scale-[1.01] active:scale-[0.99]
      ${isDarkMode
        ? 'bg-black/20 border-white/10 hover:border-white/20'
        : 'bg-white border-slate-200 shadow-md hover:shadow-lg'}
    `}
  >
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center
        ${isDarkMode ? 'bg-gray-500/10 text-gray-300' : 'bg-gray-200 text-gray-700'}
      `}>
        <Icon size={18} />
      </div>
      <div>
        <h3 className="text-sm font-bold">{title}</h3>
        <p className="text-xs opacity-50">{desc}</p>
      </div>
    </div>
  </button>
);

export default Dashboard;
