import React from 'react';
import QRCode from 'qrcode.react';
import useTheme from '../../hooks/useTheme';

const QRCodeGenerator = ({ ticketData }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (error) {
      console.error('Errore nella formattazione della data:', error);
      return dateString;
    }
  };

  const qrValue = JSON.stringify({
    ticketCode: ticketData.ticketCode,
    eventId: ticketData.eventId,
    eventName: ticketData.eventName
  });

  return (
    <div className="ticket-whatsapp">
      <div className="header">
        <div className="event-name">{ticketData.eventName}</div>
        <div className="date">{formatDate(ticketData.eventDate)}</div>
      </div>

      <div className="ticket-info">
        <div className="info-row">
          <strong>Cliente:</strong>
          <span>{ticketData.customerName}</span>
        </div>
        <div className="info-row">
          <strong>Email:</strong>
          <span>{ticketData.customerEmail}</span>
        </div>
        <div className="info-row">
          <strong>Quantità:</strong>
          <span>{ticketData.quantity}</span>
        </div>
        <div className="info-row">
          <strong>Tipo:</strong>
          <span>{ticketData.ticketType}</span>
        </div>
        <div className="info-row">
          <strong>Prezzo:</strong>
          <span>€{ticketData.price.toFixed(2)}</span>
        </div>
      </div>

      <div className="qr-code">
        <QRCode
          value={qrValue}
          size={200}
          level="H"
          includeMargin={true}
          bgColor={isDark ? '#2d2d2d' : '#ffffff'}
          fgColor={isDark ? '#ffffff' : '#000000'}
        />
      </div>

      <div className="footer">
        <p>Codice Biglietto: {ticketData.ticketCode}</p>
        <small>Mostra questo QR code all'ingresso</small>
      </div>
    </div>
  );
};

export default QRCodeGenerator; 