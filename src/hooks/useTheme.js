import { useState, useEffect } from 'react';

const useTheme = () => {
  const [theme, setTheme] = useState('light'); // Forza il tema chiaro iniziale

  useEffect(() => {
    // Salva il tema nelle preferenze
    localStorage.setItem('theme', theme);
    
    // Applica il tema al documento
    document.documentElement.setAttribute('data-theme', theme);
    
    // Aggiorna i meta tag per il tema del browser mobile
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', theme === 'dark' ? '#1a1a1a' : '#ffffff'); // Questo userà sempre '#ffffff'
    }
  }, [theme]);

  // Rimosso useEffect per ascoltare i cambiamenti delle preferenze del sistema
  // Rimosso toggleTheme function

  return { theme }; // Rimosso toggleTheme dal return
};

export default useTheme; 