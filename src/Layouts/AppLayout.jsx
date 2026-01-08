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
    /* Ajout de pt-9 ici pour compenser la TitleBar fixed */
    <div className={`pt-9 flex h-full w-full overflow-hidden font-sans transition-colors duration-500 ${isDarkMode ? 'bg-black text-white' : 'bg-[#f0f0f2] text-gray-900'}`}>
      <AnimatedBackground />

      <div className={`relative z-20 transition-all duration-500 ease-in-out border-r backdrop-blur-2xl ${isDarkMode ? 'bg-black/40 border-white/5' : 'bg-white/70 border-gray-200'} ${isNavOpen ? 'w-64' : 'w-20'}`}>
        <Sidebar 
          activeTab={activeTab} setActiveTab={setActiveTab} 
          setSelectedChatId={setSelectedChatId} 
          systemStats={systemStats} isCollapsed={!isNavOpen} language={language}
        />
        {/* Bouton toggle sidebar - Gris métallique */}
        <button 
          onClick={() => setIsNavOpen(!isNavOpen)} 
          className="absolute -right-3 top-20 z-50 p-1.5 rounded-full hover:scale-110 shadow-lg transition-transform"
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
            ? <PanelLeftClose size={14} className={isDarkMode ? 'text-white/70' : 'text-gray-600'}/> 
            : <PanelLeftOpen size={14} className={isDarkMode ? 'text-white/70' : 'text-gray-600'}/>
          }
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