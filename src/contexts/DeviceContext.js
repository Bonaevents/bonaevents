import React, { createContext, useContext } from 'react';
import useDeviceDetect from '../hooks/useDeviceDetect';

// Creazione del contesto
const DeviceContext = createContext(null);

/**
 * Provider per il contesto del dispositivo.
 * Fornisce informazioni sul dispositivo a tutti i componenti figli.
 */
export function DeviceProvider({ children }) {
  // Utilizzo del nostro hook personalizzato
  const deviceInfo = useDeviceDetect();
  
  return (
    <DeviceContext.Provider value={deviceInfo}>
      {children}
    </DeviceContext.Provider>
  );
}

/**
 * Hook personalizzato per accedere facilmente alle informazioni sul dispositivo.
 * @returns {Object} Informazioni sul dispositivo e sullo schermo
 */
export function useDevice() {
  const context = useContext(DeviceContext);
  
  if (context === null) {
    throw new Error('useDevice deve essere utilizzato all\'interno di un DeviceProvider');
  }
  
  return context;
}

/**
 * HOC (Higher Order Component) che inietta le proprietà del dispositivo nel componente.
 * @param {React.Component} Component - Il componente da avvolgere
 * @returns {React.Component} Componente con proprietà del dispositivo
 */
export function withDevice(Component) {
  return function DeviceAwareComponent(props) {
    const deviceProps = useDevice();
    
    return <Component {...props} device={deviceProps} />;
  };
}

// Esportiamo come default il provider per un import più pulito
export default DeviceProvider; 