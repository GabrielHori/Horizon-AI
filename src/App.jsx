import React, { useState, useEffect } from 'react';
import AppLayout from './Layouts/AppLayout';
import OllamaSetup from './components/OllamaSetup';
import OnboardingTour from './components/OnboardingTour';
import TitleBar from './components/TitleBar';
import { requestWorker } from './services/bridge';

function App() {
  const [language, setLanguage] = useState('fr'); // Français par défaut
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showOllamaSetup, setShowOllamaSetup] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");
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
      // ✅ Réduit de 1s à 3s pour diminuer la charge CPU
      // Le worker Python envoie également des push events toutes les 2s
      interval = setInterval(fetchStats, 3000);
    };

    init();

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  // Écran de setup Ollama au premier lancement
  if (showOllamaSetup) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TitleBar />
        <div className="flex-1 overflow-hidden">
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
      <OnboardingTour language={language} />
    </div>
  );
}

export default App;
