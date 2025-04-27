import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { FaSearch, FaTimesCircle, FaCheckCircle, FaBan, FaUndo, FaInfoCircle, FaWhatsapp } from 'react-icons/fa';
import './TicketHistory.css';

function TicketHistory() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [events, setEvents] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [cancellingTicket, setCancellingTicket] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchTickets();
    fetchEvents();
  }, [page, statusFilter, eventFilter]);

  async function fetchTickets() {
    try {
      setLoading(true);
      setError(null);

      // Costruisce la query base
      let ticketsQuery = collection(db, 'tickets');
      let conditions = [];

      // Applica filtri solo se sono validi
      if (statusFilter && statusFilter !== 'all') {
        conditions.push(where('status', '==', statusFilter));
      }

      if (eventFilter && eventFilter !== 'all') {
        conditions.push(where('eventId', '==', eventFilter));
      }

      // Crea query con condizioni
      if (conditions.length > 0) {
        ticketsQuery = query(
          collection(db, 'tickets'),
          ...conditions,
          limit(itemsPerPage)
        );
      } else {
        ticketsQuery = query(
          collection(db, 'tickets'),
          limit(itemsPerPage)
        );
      }

      const snapshot = await getDocs(ticketsQuery);
      const ticketsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAtFormatted: formatDate(data.createdAt),
          qrCode: data.qrCode || data.qr_code || null,
          code: data.code || data.ticketCode || null,
          eventName: data.eventName || data.event_name || 'Evento non specificato',
          customerName: data.customerName || data.customer_name || 'Cliente non specificato',
          customerEmail: data.customerEmail || data.customer_email || 'Email non specificata',
          status: data.status || 'active',
          price: data.price || data.ticketPrice || 0,
          totalPrice: data.totalPrice || data.total_price || 0,
          quantity: data.quantity || 1,
          eventDate: data.eventDate || data.event_date,
          eventLocation: data.eventLocation || data.event_location,
          ticketType: data.ticketType || data.ticket_type,
          tableNumber: data.tableNumber || data.table_number,
          sellerId: data.sellerId || data.seller_id,
          sellerName: data.sellerName || data.seller_name,
          usedAt: data.usedAt || data.used_at,
          cancelledAt: data.cancelledAt || data.cancelled_at,
          previousStatus: data.previousStatus || data.previous_status
        };
      });

      // Ordina i biglietti lato client
      ticketsData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setTickets(ticketsData);
      
      // Stima del numero totale di pagine
      const totalTicketsQuery = collection(db, 'tickets');
      const totalSnapshot = await getDocs(totalTicketsQuery);
      setTotalPages(Math.ceil(totalSnapshot.size / itemsPerPage));
      
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei biglietti:', error);
      setError('Si è verificato un errore nel caricamento dei biglietti.');
      setLoading(false);
    }
  }

  async function fetchEvents() {
    try {
      const eventsQuery = query(collection(db, 'events'));
      const snapshot = await getDocs(eventsQuery);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
    } catch (error) {
      console.error('Errore nel recupero degli eventi:', error);
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp instanceof Date 
      ? timestamp 
      : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    
    return date.toLocaleString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  async function handleDisableTicket(ticketId) {
    if (!window.confirm('Sei sicuro di voler disabilitare questo biglietto? Non potrà essere validato.')) {
      return;
    }

    try {
      setCancellingTicket(true);
      setError(null);

      // Aggiorna lo stato del biglietto a "disabled"
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'disabled',
        updatedAt: serverTimestamp()
      });

      // Aggiorna l'UI
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId
            ? {...ticket, status: 'disabled'}
            : ticket
        )
      );

      // Aggiorna il biglietto selezionato se è quello corrente
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: 'disabled'
        });
      }

      setSuccessMessage('Biglietto disabilitato con successo!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Errore nella disabilitazione del biglietto:', error);
      setError('Si è verificato un errore durante la disabilitazione del biglietto.');
    } finally {
      setCancellingTicket(false);
    }
  }

  async function handleEnableTicket(ticketId) {
    if (!window.confirm('Sei sicuro di voler riabilitare questo biglietto? Potrà essere validato.')) {
      return;
    }

    try {
      setCancellingTicket(true);
      setError(null);

      // Ripristina lo stato a "active"
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'active',
        updatedAt: serverTimestamp()
      });

      // Aggiorna l'UI
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId
            ? {...ticket, status: 'active'}
            : ticket
        )
      );

      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: 'active'
        });
      }

      setSuccessMessage('Biglietto riabilitato con successo!');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Errore nella riabilitazione del biglietto:', error);
      setError('Si è verificato un errore durante la riabilitazione del biglietto.');
    } finally {
      setCancellingTicket(false);
    }
  }

  function handleSearch() {
    // Filtra i biglietti localmente in base alla query di ricerca
    if (!searchQuery.trim()) {
      fetchTickets(); // Se la ricerca è vuota, ricarica tutti i biglietti
      return;
    }

    const lowerQuery = searchQuery.toLowerCase();
    const filtered = tickets.filter(ticket => 
      (ticket.code && ticket.code.toLowerCase().includes(lowerQuery)) ||
      (ticket.customerName && ticket.customerName.toLowerCase().includes(lowerQuery)) ||
      (ticket.customerEmail && ticket.customerEmail.toLowerCase().includes(lowerQuery)) ||
      (ticket.eventName && ticket.eventName.toLowerCase().includes(lowerQuery))
    );

    setTickets(filtered);
  }

  function getStatusLabel(status) {
    switch (status) {
      case 'active': return 'Attivo';
      case 'validated': return 'Validato';
      case 'disabled': return 'Disabilitato';
      case 'cancelled': return 'Annullato';
      default: return status;
    }
  }

  function getStatusIcon(status) {
    switch (status) {
      case 'active': return <FaCheckCircle className="status-icon active" />;
      case 'validated': return <FaCheckCircle className="status-icon validated" />;
      case 'disabled': return <FaBan className="status-icon disabled" />;
      case 'cancelled': return <FaTimesCircle className="status-icon cancelled" />;
      default: return <FaInfoCircle className="status-icon unknown" />;
    }
  }

  function handleViewDetails(ticket) {
    setSelectedTicket(ticket);
    setShowDetails(true);
  }

  function generateWhatsAppMessage(ticket) {
    const message = `🎫 Dettagli del tuo biglietto:\n\n` +
      `Evento: ${ticket.eventName}\n` +
      `Data: ${formatDate(ticket.eventDate)}\n` +
      `Luogo: ${ticket.eventLocation || 'N/A'}\n` +
      `Tipo: ${ticket.ticketType || 'Standard'}\n` +
      `Quantità: ${ticket.quantity}\n` +
      `Prezzo: €${ticket.price}\n` +
      `Totale: €${ticket.totalPrice}\n` +
      `Codice: ${ticket.code}\n\n` +
      `Per visualizzare e validare il biglietto, visita questo link:\n` +
      `https://gestione-pr-ultimata.vercel.app/ticket/${ticket.id || ticket.ticketCode || ticket.code}`;

    // Se c'è un numero di telefono, usa quello come destinatario
    const phoneNumber = ticket.customerPhone || ticket.customer_phone;
    if (phoneNumber) {
      // La formattazione del numero sarà gestita dal servizio WhatsApp
      // o potrebbe dover essere eseguita qui se il servizio non è disponibile
      return message;
    }
    
    // Messaggio senza telefono
    return message;
  }

  function handleShareWhatsApp(ticket) {
    try {
      // Importa dinamicamente il servizio WhatsApp per evitare dipendenze circolari
      import('../../services/WhatsAppService')
        .then(module => {
          const { sendTicketViaWhatsApp } = module;
          
          // Usa il numero di telefono esistente o un numero vuoto per condivisione generica
          const phoneNumber = ticket.customerPhone || ticket.customer_phone || '';
          
          // Usa il servizio ottimizzato che gestisce iOS e Android
          sendTicketViaWhatsApp(ticket, phoneNumber);
        })
        .catch(error => {
          console.error('Errore nel caricamento del servizio WhatsApp:', error);
          
          // Fallback alla vecchia implementazione
          const whatsappUrl = generateWhatsAppMessage(ticket);
          window.open(whatsappUrl, '_blank');
        });
    } catch (error) {
      console.error('Errore nella condivisione su WhatsApp:', error);
      
      // Fallback in caso di errore
      const whatsappUrl = generateWhatsAppMessage(ticket);
      window.open(whatsappUrl, '_blank');
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (searchQuery === '') return true;
    
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (ticket.code && ticket.code.toLowerCase().includes(lowerQuery)) ||
      (ticket.customerName && ticket.customerName.toLowerCase().includes(lowerQuery)) ||
      (ticket.customerEmail && ticket.customerEmail.toLowerCase().includes(lowerQuery)) ||
      (ticket.eventName && ticket.eventName.toLowerCase().includes(lowerQuery))
    );
  });

  return (
    <div className="ticket-history">
      <h2>Storico Biglietti</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      {successMessage && (
        <div className="success-message">
          {successMessage}
        </div>
      )}
      
      <div className="filters-container">
        <div className="search-container">
          <input
            type="text"
            placeholder="Cerca per codice, cliente, email o evento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button onClick={handleSearch} className="search-button">
            <FaSearch /> Cerca
          </button>
        </div>
        
        <div className="filters">
          <div className="filter">
            <label>Stato:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tutti</option>
              <option value="active">Attivo</option>
              <option value="validated">Validato</option>
              <option value="disabled">Disabilitato</option>
              <option value="cancelled">Annullato</option>
            </select>
          </div>
          
          <div className="filter">
            <label>Evento:</label>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">Tutti</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="loading">Caricamento biglietti...</div>
      ) : filteredTickets.length === 0 ? (
        <div className="no-tickets">
          Nessun biglietto trovato. Prova a modificare i filtri di ricerca.
        </div>
      ) : (
        <>
          <div className="table-responsive-wrapper tickets-table-container">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Evento</th>
                  <th>Cliente</th>
                  <th>Data Vendita</th>
                  <th>Quantità</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredTickets.map(ticket => (
                  <tr key={ticket.id} className={`status-${ticket.status}`}>
                    <td>{ticket.code}</td>
                    <td>{ticket.eventName}</td>
                    <td>{ticket.customerName}</td>
                    <td>{ticket.createdAtFormatted}</td>
                    <td>{ticket.quantity}</td>
                    <td>
                      <div className="status">
                        {getStatusIcon(ticket.status)}
                        <span>{getStatusLabel(ticket.status)}</span>
                      </div>
                    </td>
                    <td className="ticket-actions">
                      {/* View Details Button */}
                      <button 
                        onClick={() => handleViewDetails(ticket)} 
                        className="action-btn details-btn"
                        title="Vedi Dettagli"
                      >
                        <FaInfoCircle />
                      </button>

                      {/* Enable/Disable Buttons - Updated Logic */}
                      {/* Show Enable only if disabled */}
                      {ticket.status === 'disabled' && (
                        <button 
                          onClick={() => handleEnableTicket(ticket.id)} 
                          className="action-btn enable-btn"
                          disabled={cancellingTicket}
                          title="Riabilita (Imposta ad Attivo)" 
                        >
                          <FaUndo />
                        </button>
                      )}

                      {/* Show Disable if not already disabled, validated or cancelled */}
                      {ticket.status !== 'disabled' && ticket.status !== 'validated' && ticket.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleDisableTicket(ticket.id)} 
                          className="action-btn disable-btn"
                          disabled={cancellingTicket}
                          title="Disabilita (Impedisce la validazione)" 
                        >
                          <FaBan />
                        </button>
                      )}
                      
                      {/* WhatsApp Share Button (Example - adjust as needed) */}
                      {ticket.status !== 'disabled' && ticket.status !== 'cancelled' && (
                        <button 
                          onClick={() => handleShareWhatsApp(ticket)} 
                          className="action-btn whatsapp-btn"
                          title="Condividi su WhatsApp"
                        >
                          <FaWhatsapp />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="pagination">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="pagination-btn"
            >
              Precedente
            </button>
            <span className="page-info">
              Pagina {page} di {totalPages}
            </span>
            <button 
              onClick={() => setPage(p => p < totalPages ? p + 1 : p)}
              disabled={page >= totalPages}
              className="pagination-btn"
            >
              Successiva
            </button>
          </div>
        </>
      )}
      
      {showDetails && selectedTicket && (
        <div className="details-modal">
          <div className="details-content">
            <button className="close-button" onClick={() => setShowDetails(false)}>
              &times;
            </button>
            
            <h3>Dettagli Biglietto</h3>
            
            <div className="ticket-details">
              <div className="detail-group">
                <h4>Informazioni Biglietto</h4>
                <div className="detail-row">
                  <span className="detail-label">Codice:</span>
                  <span className="detail-value">{selectedTicket.code}</span>
                </div>
                {selectedTicket.qrCode && (
                  <div className="detail-row qr-code-container">
                    <span className="detail-label">Codice QR:</span>
                    <div className="qr-code">
                      <img 
                        src={selectedTicket.qrCode} 
                        alt="Codice QR del biglietto" 
                        className="qr-image"
                      />
                    </div>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">Stato:</span>
                  <span className={`detail-value status-${selectedTicket.status}`}>
                    {getStatusIcon(selectedTicket.status)} {getStatusLabel(selectedTicket.status)}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Quantità:</span>
                  <span className="detail-value">{selectedTicket.quantity}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Prezzo:</span>
                  <span className="detail-value">€{selectedTicket.price}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Totale:</span>
                  <span className="detail-value">€{selectedTicket.totalPrice}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Data Vendita:</span>
                  <span className="detail-value">{selectedTicket.createdAtFormatted}</span>
                </div>
                {selectedTicket.usedAt && (
                  <div className="detail-row">
                    <span className="detail-label">Data Utilizzo:</span>
                    <span className="detail-value">{formatDate(selectedTicket.usedAt)}</span>
                  </div>
                )}
                {selectedTicket.cancelledAt && (
                  <div className="detail-row">
                    <span className="detail-label">Data Annullamento:</span>
                    <span className="detail-value">{formatDate(selectedTicket.cancelledAt)}</span>
                  </div>
                )}
              </div>
              
              <div className="detail-group">
                <h4>Informazioni Cliente</h4>
                <div className="detail-row">
                  <span className="detail-label">Nome:</span>
                  <span className="detail-value">{selectedTicket.customerName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{selectedTicket.customerEmail}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Telefono:</span>
                  <span className="detail-value">{selectedTicket.customerPhone || selectedTicket.customer_phone || 'N/A'}</span>
                </div>
              </div>
              
              <div className="detail-group">
                <h4>Informazioni Evento</h4>
                <div className="detail-row">
                  <span className="detail-label">Nome:</span>
                  <span className="detail-value">{selectedTicket.eventName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Data:</span>
                  <span className="detail-value">
                    {selectedTicket.eventDate ? formatDate(selectedTicket.eventDate) : 'N/A'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Luogo:</span>
                  <span className="detail-value">{selectedTicket.eventLocation || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Tipo:</span>
                  <span className="detail-value">{selectedTicket.ticketType || 'Standard'}</span>
                </div>
                {selectedTicket.tableNumber && (
                  <div className="detail-row">
                    <span className="detail-label">Tavolo:</span>
                    <span className="detail-value">{selectedTicket.tableNumber}</span>
                  </div>
                )}
              </div>
              
              <div className="detail-group">
                <h4>Informazioni Venditore</h4>
                <div className="detail-row">
                  <span className="detail-label">ID Venditore:</span>
                  <span className="detail-value">{selectedTicket.sellerId || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Nome Venditore:</span>
                  <span className="detail-value">{selectedTicket.sellerName || 'N/A'}</span>
                </div>
              </div>
            </div>
            
            <div className="details-actions">
              <button 
                className="btn-close"
                onClick={() => setShowDetails(false)}
              >
                Chiudi
              </button>
              
              <button 
                className="btn-whatsapp"
                onClick={() => handleShareWhatsApp(selectedTicket)}
              >
                <FaWhatsapp /> Condividi su WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketHistory; 