import React, { Suspense, lazy } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import AnimatedBackground from '../components/AnimatedBackground';
import { useTheme } from '../contexts/ThemeContext';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const Dashboard = lazy(() => import('../pages/Dashboard'));
const AIChatPanel = lazy(() => import('../components/AIChatPanel'));
const Settings = lazy(() => import('../pages/Settings'));
const ModelLibrary = lazy(() => import('../pages/ModelLibrary'));
const ContextPanel = lazy(() => import('../components/ContextPanel'));
const ModelManager = lazy(() => import('../components/ModelManager'));
const MemoryManager = lazy(() => import('../components/MemoryManager'));
const RemoteAccess = lazy(() => import('../pages/RemoteAccess'));
const AnimationDemo = lazy(() => import('../pages/AnimationDemo'));
const SecurityCenter = lazy(() => import('../pages/SecurityCenter'));
const AdvancedCenter = lazy(() => import('../pages/AdvancedCenter'));

const AppLayout = ({
  activeTab, setActiveTab, systemStats, selectedChatId,
  setSelectedChatId, selectedModel, setSelectedModel,
  selectedStyle, setSelectedStyle, chatIntent, setChatIntent,
  prefillPrompt, setPrefillPrompt,
  modelOverride, setModelOverride,
  isNavOpen, setIsNavOpen, userName, setUserName, language, setLanguage,
  healthStatus
}) => {
  const { isDarkMode } = useTheme();
  const loadingFallback = (
    <div className={`h-full w-full flex items-center justify-center text-xs font-bold ${isDarkMode ? 'text-white/40' : 'text-slate-500'}`}>
      {language === 'fr' ? 'Chargement...' : 'Loading...'}
    </div>
  );

  const renderContent = () => {
    const commonProps = { language, isDarkMode, healthStatus };

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            systemStats={systemStats}
            setActiveTab={setActiveTab}
            selectedStyle={selectedStyle}
            setSelectedStyle={setSelectedStyle}
            setChatIntent={setChatIntent}
            setPrefillPrompt={setPrefillPrompt}
            setSelectedChatId={setSelectedChatId}
            userName={userName}
            {...commonProps}
          />
        );
      case 'chat':
        return (
          <AIChatPanel
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            selectedStyle={selectedStyle}
            modelOverride={modelOverride}
            setModelOverride={setModelOverride}
            chatIntent={chatIntent}
            setChatIntent={setChatIntent}
            prefillPrompt={prefillPrompt}
            setPrefillPrompt={setPrefillPrompt}
            chatId={selectedChatId}
            setSelectedChatId={setSelectedChatId}
            {...commonProps}
          />
        );
      case 'security':
        return (
          <SecurityCenter
            language={language}
            setActiveTab={setActiveTab}
          />
        );
      case 'advanced':
        return (
          <AdvancedCenter
            language={language}
            setActiveTab={setActiveTab}
          />
        );
      case 'files': return (
        <div className="h-full p-6 overflow-hidden">
          <ContextPanel language={language} isDarkMode={isDarkMode} />
        </div>
      );
      case 'library': return <ModelLibrary language={language} systemStats={systemStats} setActiveTab={setActiveTab} />;
      case 'models': return <ModelManager language={language} {...commonProps} />; // ✅ SPRINT 2: Nouvelle route
      case 'memory': return <MemoryManager language={language} {...commonProps} />;
      case 'remote': return <RemoteAccess language={language} {...commonProps} />;
      case 'animation-demo': return <AnimationDemo />;
      case 'settings':
        return (
          <Settings
            userName={userName} setUserName={setUserName}
            language={language} setLanguage={setLanguage}
            setActiveTab={setActiveTab}
            {...commonProps}
          />
        );
      default: return (
        <Dashboard
          systemStats={systemStats}
          setActiveTab={setActiveTab}
          selectedStyle={selectedStyle}
          setSelectedStyle={setSelectedStyle}
          setChatIntent={setChatIntent}
          setPrefillPrompt={setPrefillPrompt}
          setSelectedChatId={setSelectedChatId}
          userName={userName}
          {...commonProps}
        />
      );
    }
  };

  return (
    /* Ajout de pt-9 ici pour compenser la TitleBar fixed */
    <div className={`pt-9 flex h-full w-full overflow-hidden font-sans transition-colors duration-500 ${isDarkMode ? 'bg-black text-white' : 'bg-[#f0f0f2] text-gray-900'}`}>
      <AnimatedBackground />

      {/* Sidebar Desktop */}
      <div className={`relative z-20 transition-all duration-500 ease-in-out border-r backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white/70 border-gray-200'} ${isNavOpen ? 'w-0 sm:w-64' : 'w-0 sm:w-20'} hidden sm:block`}>
        <Sidebar
          activeTab={activeTab} setActiveTab={setActiveTab}
          setSelectedChatId={setSelectedChatId}
          systemStats={systemStats} isCollapsed={!isNavOpen} language={language}
        />
        {/* Bouton toggle sidebar - Gris métallique */}
        <button
          onClick={() => setIsNavOpen(!isNavOpen)}
          className="absolute -right-3 top-20 z-50 p-1.5 rounded-full hover:scale-110 shadow-lg transition-transform hidden sm:flex"
          style={{
            background: isDarkMode
              ? 'linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%)'
              : 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
            border: isDarkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            boxShadow: isDarkMode
              ? '0 4px 15px rgba(0,0,0,0.3)'
              : '0 4px 15px rgba(0,0,0,0.1)',
          }}
        >
          {isNavOpen
            ? <PanelLeftClose size={14} className={isDarkMode ? 'text-white/70' : 'text-gray-600'} />
            : <PanelLeftOpen size={14} className={isDarkMode ? 'text-white/70' : 'text-gray-600'} />
          }
        </button>
      </div>

      {/* Sidebar Mobile - Overlay */}
      {isNavOpen && (
        <div className="sm:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm" onClick={() => setIsNavOpen(false)} />
      )}
      <div className={`sm:hidden fixed left-0 top-9 bottom-0 z-40 w-64 transition-transform duration-500 ease-in-out border-r backdrop-blur-2xl ${isDarkMode ? 'bg-black/95 border-white/5' : 'bg-white/95 border-gray-200'} ${isNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar
          activeTab={activeTab} setActiveTab={setActiveTab}
          setSelectedChatId={setSelectedChatId}
          systemStats={systemStats} isCollapsed={false} language={language}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar
          activeTab={activeTab}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedStyle={selectedStyle}
          setSelectedStyle={setSelectedStyle}
          chatIntent={chatIntent}
          modelOverride={modelOverride}
          setModelOverride={setModelOverride}
          userName={userName}
          language={language}
          onToggleSidebar={() => setIsNavOpen(!isNavOpen)}
        />
        <main className="flex-1 overflow-hidden relative">
          <Suspense fallback={loadingFallback}>
            {renderContent()}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
