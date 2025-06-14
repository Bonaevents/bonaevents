import React, { useState } from 'react';
import './TicketStyles.css';

/**
 * Componente per l'input della quantità che risolve i problemi di modificabilità
 */
function QuantityInput({ initialValue = 1, maxValue = 999, onChange, className = '' }) {
  const [value, setValue] = useState(initialValue);
  const [focused, setFocused] = useState(false);

  const handleChange = (e) => {
    // Permette di inserire stringa vuota o numeri validi
    const newValue = e.target.value;
    if (newValue === '' || (/^\d+$/.test(newValue) && parseInt(newValue) >= 0)) {
      setValue(newValue);
      // Passa al genitore solo se è un numero valido
      if (newValue !== '' && !isNaN(parseInt(newValue))) {
        onChange(parseInt(newValue));
      }
    }
  };

  const handleBlur = () => {
    setFocused(false);
    // Se vuoto o 0, reimposta a 1
    if (value === '' || value === '0' || parseInt(value) === 0) {
      setValue(1);
      onChange(1);
    } else {
      // Assicurati che non superi il max
      const numValue = parseInt(value);
      if (numValue > maxValue) {
        setValue(maxValue);
        onChange(maxValue);
      } else {
        setValue(numValue);
        onChange(numValue);
      }
    }
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const incrementValue = () => {
    const currentValue = parseInt(value || 0);
    if (currentValue < maxValue) {
      const newValue = currentValue + 1;
      setValue(newValue);
      onChange(newValue);
    }
  };

  const decrementValue = () => {
    const currentValue = parseInt(value || 0);
    if (currentValue > 1) {
      const newValue = currentValue - 1;
      setValue(newValue);
      onChange(newValue);
    }
  };

  return (
    <div className={`quantity-input-container ${className}`}>
      <button 
        type="button"
        className="quantity-btn decrement"
        onClick={decrementValue}
        disabled={value === 1 || value === '1'}
      >
        -
      </button>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className="quantity-input"
        aria-label="Quantità"
        inputMode="numeric"
      />
      <button 
        type="button"
        className="quantity-btn increment"
        onClick={incrementValue}
        disabled={parseInt(value || 0) >= maxValue}
      >
        +
      </button>
    </div>
  );
}

export default QuantityInput; 