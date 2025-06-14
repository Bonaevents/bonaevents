import React from 'react';
import QRCode from 'qrcode.react';
import './TicketTemplate.css';

function TicketTemplate({ ticketData }) {
  const qrData = JSON.stringify({
    ticketCode: ticketData.ticketCode,
    eventId: ticketData.eventId,
    eventName: ticketData.eventName,
    quantity: ticketData.quantity,
    customerEmail: ticketData.customerEmail
  });

  return (
    <div className="ticket-container">
      <div className="ticket-header">
        <h2>{ticketData.eventName}</h2>
        <div className="ticket-code">{ticketData.ticketCode}</div>
      </div>

      <div className="ticket-details">
        <div className="detail-row">
          <span className="label">Data:</span>
          <span className="value">{new Date(ticketData.eventDate).toLocaleDateString()}</span>
        </div>
        <div className="detail-row">
          <span className="label">Luogo:</span>
          <span className="value">{ticketData.eventLocation}</span>
        </div>
        <div className="detail-row">
          <span className="label">Quantità:</span>
          <span className="value">{ticketData.quantity} biglietti</span>
        </div>
      </div>

      <div className="qr-section">
        <QRCode 
          value={qrData}
          size={200}
          level={'H'}
          includeMargin={true}
        />
        <div className="qr-code-text">
          Codice Biglietto: {ticketData.ticketCode}
        </div>
      </div>

      <div className="ticket-footer">
        <p>Presenta questo QR code all'ingresso per la validazione</p>
        <p>Email: {ticketData.customerEmail}</p>
      </div>
    </div>
  );
}

export default TicketTemplate; 