import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Initialisation : on récupère le thème sauvegardé ou "dark" par défaut
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('horizon-theme');
    // Si rien n'est stocké, on commence en mode sombre par défaut
    return saved ? saved === 'dark' : true;
  });

  // Effet pour appliquer les classes CSS et persister le choix
  useEffect(() => {
    const root = window.document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
      localStorage.setItem('horizon-theme', 'dark');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      localStorage.setItem('horizon-theme', 'light');
    }
  }, [isDarkMode]);

  // Fonction pour basculer entre les deux modes
  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook personnalisé pour utiliser le thème partout dans l'app
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme doit être utilisé à l’intérieur d’un ThemeProvider');
  }
  return context;
};