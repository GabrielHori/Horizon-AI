import React, { useState, useEffect } from 'react';
import AppLayout from './Layouts/AppLayout';
import OllamaSetup from './components/OllamaSetup';
import OnboardingTour from './components/OnboardingTour';
import TitleBar from './components/TitleBar';
import TimeoutNotification from './components/TimeoutNotification';
import { requestWorker } from './services/bridge';
import { DEFAULT_STYLE_ID } from './constants/ai_styles';

function App() {
  const [language, setLanguage] = useState('en'); // English by default
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === 'undefined') return 'dashboard';
    const savedTab = window.localStorage.getItem('horizon.activeTab');
    return savedTab || 'dashboard';
  });
  const [showOllamaSetup, setShowOllamaSetup] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("ollama");
  const [selectedStyle, setSelectedStyle] = useState(DEFAULT_STYLE_ID);
  const [modelOverride, setModelOverride] = useState(false);
  const [chatIntent, setChatIntent] = useState(null);
  const [prefillPrompt, setPrefillPrompt] = useState(null);
  const [isNavOpen, setIsNavOpen] = useState(true);
  const [userName, setUserName] = useState("Admin");

  const [systemStats, setSystemStats] = useState({
    cpu: { usage_percent: 0 },
    ram: { usage_percent: 0 },
    gpu: { available: false, usage_percent: 0, vram_used: 0, vram_total: 0 },
    vramUsed: 0,
    vramTotal: 0
  });

  const [healthStatus, setHealthStatus] = useState('loading');

  const normalizeStat = (stat) => {
    if (typeof stat === 'number') return { usage_percent: stat };
    if (stat?.usage_percent != null) return { usage_percent: stat.usage_percent };
    return { usage_percent: 0 };
  };

  const normalizeGpu = (gpu) => {
    if (!gpu) {
      return { available: false, usage_percent: 0, vram_used: 0, vram_total: 0 };
    }

    return {
      available: true,
      usage_percent: gpu.usage_percent ?? 0,
      vram_used: gpu.vram_used ?? 0,
      vram_total: gpu.vram_total ?? 0
    };
  };

  useEffect(() => {
    let interval;
    let isMounted = true;

    const fetchStats = async () => {
      if (!isMounted) return;

      const raw = await requestWorker("get_monitoring");
      if (!raw || !isMounted) return;

      setSystemStats({
        cpu: normalizeStat(raw.cpu),
        ram: normalizeStat(raw.ram),
        gpu: normalizeGpu(raw.gpu),
        vramUsed: raw.vramUsed ?? raw.gpu?.vram_used ?? 0,
        vramTotal: raw.vramTotal ?? raw.gpu?.vram_total ?? 0
      });

      setHealthStatus("healthy");
    };

    const init = async () => {
      try {
        const res = await requestWorker("health_check");
        if (isMounted) {
          setHealthStatus(res?.status === "healthy" ? "healthy" : "unreachable");
        }
      } catch {
        if (isMounted) setHealthStatus("unreachable");
      }

      fetchStats();
      interval = setInterval(fetchStats, 3000);
    };

    init();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('horizon.activeTab', activeTab);
  }, [activeTab]);

  // Écran de setup Ollama au premier lancement
  if (showOllamaSetup) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TitleBar />
        {/* Ajout de pt-9 ici pour descendre le contenu du setup sous la barre fixed */}
        <div className="flex-1 overflow-hidden pt-9">
          <OllamaSetup onComplete={() => setShowOllamaSetup(false)} language={language} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TitleBar />
      <div className="flex-1 overflow-hidden">
        <AppLayout
          language={language}
          setLanguage={setLanguage}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedChatId={selectedChatId}
          setSelectedChatId={setSelectedChatId}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          selectedProvider={selectedProvider}
          setSelectedProvider={setSelectedProvider}
          selectedStyle={selectedStyle}
          setSelectedStyle={setSelectedStyle}
          modelOverride={modelOverride}
          setModelOverride={setModelOverride}
          chatIntent={chatIntent}
          setChatIntent={setChatIntent}
          prefillPrompt={prefillPrompt}
          setPrefillPrompt={setPrefillPrompt}
          isNavOpen={isNavOpen}
          setIsNavOpen={setIsNavOpen}
          userName={userName}
          setUserName={setUserName}
          systemStats={systemStats}
          healthStatus={healthStatus}
          backendLaunched={true}
        />
      </div>

      {/* Guide interactif au premier lancement */}
      <OnboardingTour language={language} setActiveTab={setActiveTab} />

      {/* Notifications de timeout IPC (Tâche 2.2) */}
      <TimeoutNotification language={language} />
    </div>
  );
}

export default App;
