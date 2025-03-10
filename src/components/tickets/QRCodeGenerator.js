import QRCode from 'qrcode.react';
import { useState } from 'react';

function QRCodeGenerator({ ticketData }) {
  const [showDetails, setShowDetails] = useState(false);

  const qrData = JSON.stringify({
    ticketCode: ticketData.ticketCode,
    eventId: ticketData.eventId,
    quantity: ticketData.quantity,
    customerEmail: ticketData.customerEmail
  });

  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <QRCode 
        value={qrData}
        size={256}
        level={'H'}
        includeMargin={true}
      />
      <button
        onClick={() => setShowDetails(!showDetails)}
        style={{
          margin: '20px',
          padding: '10px',
          backgroundColor: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {showDetails ? 'Nascondi Dettagli' : 'Mostra Dettagli'}
      </button>
      
      {showDetails && (
        <div style={{ marginTop: '20px', textAlign: 'left' }}>
          <h3>Dettagli Biglietto</h3>
          <p><strong>Codice:</strong> {ticketData.ticketCode}</p>
          <p><strong>Evento:</strong> {ticketData.eventName}</p>
          <p><strong>Data:</strong> {new Date(ticketData.eventDate).toLocaleString()}</p>
          <p><strong>Luogo:</strong> {ticketData.eventLocation}</p>
          <p><strong>Quantità:</strong> {ticketData.quantity}</p>
          <p><strong>Email Cliente:</strong> {ticketData.customerEmail}</p>
        </div>
      )}
    </div>
  );
}

export default QRCodeGenerator; 