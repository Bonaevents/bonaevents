/**
 * responsiveUtils.js
 * Utility per la gestione responsive dell'applicazione su diversi dispositivi
 * Supporto per iPhone 5 e modelli più recenti, Android e vari dispositivi
 */

import { Dimensions } from 'react-native-web';
import { useDevice } from '../contexts/DeviceContext';

// Utility per conversione dimensioni responsive
const screenWidth = () => {
  // Verificare se siamo in un ambiente browser o con React Native Web
  if (typeof window !== 'undefined') {
    return window.innerWidth;
  }
  
  // Fallback a Dimensions di react-native-web
  try {
    return Dimensions.get('window').width;
  } catch (e) {
    console.warn('Impossibile ottenere dimensioni dello schermo:', e);
    return 375; // Default fallback (dimensione iPhone 6-8)
  }
};

const screenHeight = () => {
  // Verificare se siamo in un ambiente browser o con React Native Web
  if (typeof window !== 'undefined') {
    return window.innerHeight;
  }
  
  // Fallback a Dimensions di react-native-web
  try {
    return Dimensions.get('window').height;
  } catch (e) {
    console.warn('Impossibile ottenere dimensioni dello schermo:', e);
    return 667; // Default fallback (dimensione iPhone 6-8)
  }
};

// Basata su iPhone 8 (375 x 667) come dimensione di riferimento
const BASE_WIDTH = 375;
const BASE_HEIGHT = 667;

// Funzioni di conversione dimensionale
// Ora accetta sia percentuali (numero) che pixel (string con 'px')
const widthPercentage = (widthValue) => {
  if (typeof widthValue === 'string' && widthValue.endsWith('px')) {
    // Se è specificato in pixel, restituisci il valore come è
    return widthValue;
  }
  
  // Se è un numero, trattalo come percentuale
  const percentage = typeof widthValue === 'number' ? widthValue : parseFloat(widthValue);
  return (percentage / 100) * screenWidth();
};

const heightPercentage = (heightValue) => {
  if (typeof heightValue === 'string' && heightValue.endsWith('px')) {
    // Se è specificato in pixel, restituisci il valore come è
    return heightValue;
  }
  
  // Se è un numero, trattalo come percentuale
  const percentage = typeof heightValue === 'number' ? heightValue : parseFloat(heightValue);
  return (percentage / 100) * screenHeight();
};

// Scale una dimensione in base al dispositivo rispetto al dispositivo di riferimento
const scaleSize = (size) => {
  const scale = screenWidth() / BASE_WIDTH;
  return Math.round(size * scale);
};

// Controlla se è un dispositivo molto piccolo (tipo iPhone 5/SE)
const isIPhoneSE1 = () => {
  return typeof window !== 'undefined' && window.innerWidth <= 320 && window.innerHeight <= 568;
};

// Controlla se il dispositivo è in orientamento ritratto
const isPortrait = () => {
  return typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
};

// Controlla se è un dispositivo mobile
const isMobile = () => {
  if (typeof window === 'undefined') return false;
  // Controlla se la larghezza è inferiore a 768px (punto di rottura comune per tablet)
  return window.innerWidth < 768 || 
    // Controlla anche l'user agent per dispositivi mobili
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Funzione per aggiungere un event listener per il resize con throttling
const addResizeListener = (callback, throttleTime = 200) => {
  if (typeof window === 'undefined') return () => {};
  
  let timeoutId = null;
  
  const throttledCallback = () => {
    if (timeoutId) return;
    
    timeoutId = setTimeout(() => {
      callback();
      timeoutId = null;
    }, throttleTime);
  };
  
  window.addEventListener('resize', throttledCallback);
  window.addEventListener('orientationchange', throttledCallback);
  
  // Restituisce una funzione per rimuovere l'event listener
  return () => {
    window.removeEventListener('resize', throttledCallback);
    window.removeEventListener('orientationchange', throttledCallback);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };
};

// Add the missing addDimensionListener function
const addDimensionListener = (callback, throttleTime = 200) => {
  if (typeof window === 'undefined') return { remove: () => {} };
  
  const wrappedCallback = () => {
    callback({
      width: screenWidth(),
      height: screenHeight()
    });
  };
  
  const removeListener = addResizeListener(wrappedCallback, throttleTime);
  
  // Return an object with a remove method for compatibility
  return {
    remove: removeListener
  };
};

// Helper function to get device info
const getDeviceInfo = () => {
  const width = screenWidth();
  const height = screenHeight();
  return {
    width,
    height,
    isIPhoneSE1: isIPhoneSE1(),
    isMobile: isMobile()
  };
};

// Shorthand per le dimensioni comuni
const dimensions = {
  fullWidth: '100%',
  fullHeight: '100%',
  halfWidth: '50%',
  halfHeight: '50%',
  screenWidth,
  screenHeight
};

// Esportazione delle utility
export {
  widthPercentage as wp,
  heightPercentage as hp,
  scaleSize,
  isIPhoneSE1,
  isPortrait,
  isMobile,
  addResizeListener,
  addDimensionListener,
  getDeviceInfo,
  dimensions,
  screenWidth,
  screenHeight
};

// Esportazione di default per compatibilità con codice esistente
export default {
  wp: widthPercentage,
  hp: heightPercentage,
  scaleSize,
  isIPhoneSE1,
  isPortrait,
  isMobile,
  addResizeListener,
  addDimensionListener,
  getDeviceInfo,
  dimensions,
  screenWidth,
  screenHeight
}; 