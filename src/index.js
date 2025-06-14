import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/global.css';
import './index.css';
import App from './App';
import { defineCustomElements } from '@ionic/core/loader';
import { Capacitor } from '@capacitor/core';

// Polyfill for react-native-web if missing
if (typeof window !== 'undefined' && !window.ReactNativeWebView) {
  window.ReactNativeWebView = {};
}

// Ensure Dimensions exists globally to prevent errors
if (typeof global !== 'undefined' && !global.Dimensions) {
  global.Dimensions = {
    get: (screen) => {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    }
  };
}

// Inizializza i componenti Ionic
defineCustomElements(window);

// Inizializza Capacitor
if (Capacitor.isNativePlatform()) {
  // Configurazione specifica per app nativa
  document.body.classList.add('native');
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);