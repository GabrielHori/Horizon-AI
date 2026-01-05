import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "./index.css"
import App from './App.jsx'
import { ThemeProvider } from './contexts/ThemeContext'

// ✅ Bloquer le clic droit en production (pas en dev)
// Cela empêche l'utilisateur d'ouvrir le menu contextuel du navigateur
if (import.meta.env.PROD) {
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Également bloquer certains raccourcis clavier (F12, Ctrl+Shift+I, etc.)
  document.addEventListener('keydown', (e) => {
    // Bloquer F12 (DevTools)
    if (e.key === 'F12') {
      e.preventDefault();
      return false;
    }
    // Bloquer Ctrl+Shift+I (DevTools)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
      e.preventDefault();
      return false;
    }
    // Bloquer Ctrl+Shift+J (Console)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      return false;
    }
    // Bloquer Ctrl+U (View Source)
    if (e.ctrlKey && e.key === 'u') {
      e.preventDefault();
      return false;
    }
  });
}

// ✅ Empêcher le drag & drop non désiré sur toute l'app (comportement pro)
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => e.preventDefault());

// ✅ Empêcher la sélection de texte non désirée sur certains éléments
// (sera appliqué via CSS avec user-select: none sur les éléments UI)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
