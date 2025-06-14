import React, { useState } from 'react';
import { db } from '../../firebase/config';
import Header from '../common/Header';
import './ValidatorDashboard.css';
import logo from '../../assets/wave.png';

function ValidatorDashboard() {
  const [ticketCode, setTicketCode] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleValidation = async (e) => {
    e.preventDefault();
    setLoading(true);
    // ... resto del codice di validazione
  };

  return (
    <div className="validator-dashboard">
      <Header />
      <div className="validator-content">
        <div className="logo-container">
          <img src={logo} alt="Wave Logo" className="logo" />
        </div>
        
        <div className="validation-form">
          <h2>Validazione Biglietti</h2>
          <form onSubmit={handleValidation}>
            <input
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              placeholder="Inserisci il codice del biglietto"
              className="ticket-input"
            />
            <button 
              type="submit" 
              className="validate-button"
              disabled={loading}
            >
              {loading ? 'Validazione...' : 'Valida Biglietto'}
            </button>
          </form>

          {validationResult && (
            <div className={`validation-result ${validationResult.valid ? 'valid' : 'invalid'}`}>
              {validationResult.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ValidatorDashboard; 