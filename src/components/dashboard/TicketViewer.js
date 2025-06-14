import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FaCalendar, FaClock, FaMapMarkerAlt, FaUser, FaTicketAlt, FaEuroSign, FaExternalLinkAlt } from 'react-icons/fa';
import './TicketViewer.css';

const TicketViewer = ({ eventId }) => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTickets = async () => {
      try {
        const ticketsRef = collection(db, 'tickets');
        const q = query(ticketsRef, where('eventId', '==', eventId));
        const querySnapshot = await getDocs(q);
        const ticketsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setTickets(ticketsData);
      } catch (err) {
        setError('Errore nel caricamento dei biglietti');
        console.error('Errore nel caricamento dei biglietti:', err);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchTickets();
    }
  }, [eventId]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Data non disponibile';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'Orario non disponibile';
    return timeString;
  };

  const generateQRCode = (ticketCode) => {
    if (!ticketCode) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(ticketCode)}`;
  };

  const getTicketCode = (ticket) => {
    return ticket.ticketCode || ticket.code || ticket.id;
  };

  const handleTicketClick = (ticketCode) => {
    if (!ticketCode) {
      console.error('Ticket code is missing');
      return;
    }
    const ticketUrl = `${window.location.origin}/ticket/${ticketCode}`;
    window.open(ticketUrl, '_blank');
  };

  if (loading) {
    return <div className="ticket-viewer-loading">Caricamento biglietti...</div>;
  }

  if (error) {
    return <div className="ticket-viewer-error">{error}</div>;
  }

  if (!tickets.length) {
    return <div className="ticket-viewer-empty">Nessun biglietto trovato per questo evento</div>;
  }

  return (
    <div className="ticket-viewer">
      <h2>Biglietti dell'Evento</h2>
      <div className="tickets-grid">
        {tickets.map((ticket) => {
          const ticketCode = getTicketCode(ticket);
          return (
            <div 
              key={ticket.id} 
              className="ticket-card"
              onClick={() => handleTicketClick(ticketCode)}
            >
              <div className="ticket-header">
                <h3>{ticket.eventName || 'Nome Evento'}</h3>
                <FaExternalLinkAlt className="open-icon" />
              </div>
              <div className="ticket-content">
                <div className="ticket-info">
                  <div className="info-row">
                    <FaCalendar />
                    <span>{formatDate(ticket.eventDate)}</span>
                  </div>
                  <div className="info-row">
                    <FaClock />
                    <span>{formatTime(ticket.eventTime)}</span>
                  </div>
                  <div className="info-row">
                    <FaMapMarkerAlt />
                    <span>{ticket.eventLocation || 'Luogo non specificato'}</span>
                  </div>
                  <div className="info-row">
                    <FaUser />
                    <span>{ticket.customerName || 'Cliente non specificato'}</span>
                  </div>
                </div>
                <div className="ticket-qr">
                  <img 
                    src={generateQRCode(ticketCode)} 
                    alt="QR Code" 
                    className="qr-code"
                  />
                </div>
              </div>
              <div className="ticket-footer">
                <div className="ticket-details">
                  <div className="detail-row">
                    <FaTicketAlt />
                    <span>Codice: {ticketCode}</span>
                  </div>
                  <div className="detail-row">
                    <FaEuroSign />
                    <span>Prezzo: €{ticket.price || '0.00'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TicketViewer; 