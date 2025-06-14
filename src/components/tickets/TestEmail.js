import React, { useState } from 'react';
import emailjs from '@emailjs/browser';
import { EMAIL_CONFIG } from '../../config/emailConfig';

const TestEmail = () => {
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const sendTestEmail = async () => {
    try {
      setStatus('Invio in corso...');
      setError('');

      // Dati di test
      const templateParams = {
        to_name: 'Test User',
        customer_email: 'test@example.com',
        event_name: 'Test Event',
        event_description: 'This is a test event description',
        event_date: new Date().toLocaleDateString('it-IT'),
        event_location: 'Test Location',
        ticket_type: 'Test Ticket',
        unit_price: '10.00',
        quantity: 1,
        total_price: '10.00',
        ticket_code: 'TEST123',
        has_table: 'false'
      };

      console.log('Invio email di test con parametri:', templateParams);

      const result = await emailjs.send(
        EMAIL_CONFIG.SERVICE_ID,
        EMAIL_CONFIG.TEMPLATE_ID,
        templateParams
      );

      console.log('Risultato invio email:', result);
      setStatus('Email inviata con successo!');
    } catch (error) {
      console.error('Errore invio email:', error);
      setError(`Errore: ${error.message || error.text || JSON.stringify(error)}`);
      setStatus('Errore nell\'invio dell\'email');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Test Invio Email</h2>
      <button onClick={sendTestEmail}>Invia Email di Test</button>
      {status && <p style={{ color: status.includes('successo') ? 'green' : 'red' }}>{status}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default TestEmail; 