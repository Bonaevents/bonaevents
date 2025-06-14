import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import TicketValidator from '../components/tickets/TicketValidator';
import Header from '../components/common/Header';
import '../components/tickets/TicketValidator.css';

function ValidatorPage() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return (
      <div className="validator-page-container">
        <Header />
        <div className="validator-content">
          <div className="message error">
            Devi effettuare l'accesso per utilizzare questa funzionalità.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="validator-page-container">
      <Header />
      <div className="validator-content">
        <TicketValidator initializeWithScanner={true} />
      </div>
    </div>
  );
}

export default ValidatorPage; 