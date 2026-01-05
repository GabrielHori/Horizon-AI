import React from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import Dashboard from '../pages/Dashboard';
import AIChatPanel from '../components/AIChatPanel';
import Settings from '../pages/Settings';
import FileManager from '../components/FileManager';
import AnimatedBackground from '../components/AnimatedBackground'; 
import { useTheme } from '../contexts/ThemeContext';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

const AppLayout = ({ 
  activeTab, setActiveTab, systemStats, selectedChatId, 
  setSelectedChatId, selectedModel, setSelectedModel,
  isNavOpen, setIsNavOpen, userName, setUserName, language, setLanguage,
  healthStatus 
}) => {
  const { isDarkMode } = useTheme();

  const renderContent = () => {
    const commonProps = { language, isDarkMode, healthStatus };
    
    switch (activeTab) {
      case 'dashboard': 
        return (
          <Dashboard 
            systemStats={systemStats} 
            setActiveTab={setActiveTab}
            selectedModel={selectedModel}
            setSelectedChatId={setSelectedChatId}
            userName={userName}
            {...commonProps} 
          />
        );
      case 'chat': 
        return (
          <AIChatPanel 
            selectedModel={selectedModel} 
            chatId={selectedChatId} 
            setSelectedChatId={setSelectedChatId} 
            {...commonProps} 
          />
        );
      case 'files': return <FileManager language={language} {...commonProps} />;
      case 'settings': 
        return (
          <Settings 
            userName={userName} setUserName={setUserName} 
            language={language} setLanguage={setLanguage} 
            {...commonProps} 
          />
        );
      default: return (
        <Dashboard 
          systemStats={systemStats} 
          setActiveTab={setActiveTab}
          selectedModel={selectedModel}
          setSelectedChatId={setSelectedChatId}
          userName={userName}
          {...commonProps} 
        />
      );
    }
  };

  return (
    <div className={`flex h-full w-full overflow-hidden font-sans transition-colors duration-500 ${isDarkMode ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'}`}>
      <AnimatedBackground isDarkMode={isDarkMode} />

      <div className={`relative z-20 transition-all duration-500 ease-in-out border-r backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white/60 border-black/5'} ${isNavOpen ? 'w-64' : 'w-20'}`}>
        <Sidebar 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          setSelectedChatId={setSelectedChatId} 
          systemStats={systemStats} isCollapsed={!isNavOpen} language={language}
        />
        <button 
          onClick={() => setIsNavOpen(!isNavOpen)} 
          className="absolute -right-3 top-20 z-50 p-1.5 bg-indigo-600 rounded-full border border-black/20 hover:scale-110 shadow-lg text-white"
        >
          {isNavOpen ? <PanelLeftClose size={14}/> : <PanelLeftOpen size={14}/>}
        </button>
      </div>

      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <TopBar 
          activeTab={activeTab} 
          selectedModel={selectedModel} 
          setSelectedModel={setSelectedModel} // Crucial pour le Chat
          userName={userName} language={language}
        />
        <main className="flex-1 overflow-hidden relative">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
