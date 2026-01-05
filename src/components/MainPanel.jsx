import React, { useState } from "react";
import AppLayout from "../Layouts/AppLayout";

export default function MainPanel({ 
  systemStats, 
  healthStatus, 
  userName, 
  setUserName, 
  language, 
  setLanguage 
}) {
  // --- ÉTATS LOCAUX DE NAVIGATION ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isNavOpen, setIsNavOpen] = useState(true);
  
  // --- ÉTATS PARTAGÉS POUR L'IA ---
  // On les garde ici pour qu'ils ne soient pas réinitialisés quand on change d'onglet
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* On transmet TOUTES les props reçues de App.jsx 
          plus les états locaux à AppLayout 
      */}
      <AppLayout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        
        selectedChatId={selectedChatId}
        setSelectedChatId={setSelectedChatId}
        
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}

        isNavOpen={isNavOpen}
        setIsNavOpen={setIsNavOpen}

        systemStats={systemStats}
        healthStatus={healthStatus}
        
        userName={userName}
        setUserName={setUserName}
        
        language={language}
        setLanguage={setLanguage}

        backendLaunched={true} // Géré par Rust au démarrage
      />
    </div>
  );
}