import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { FaSearch, FaTimesCircle, FaCheckCircle, FaBan, FaUndo, FaInfoCircle, FaWhatsapp, FaTrash, FaShoppingCart, FaQuestionCircle, FaEuroSign } from 'react-icons/fa';
import './TicketHistory.css';

function TicketHistory() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [events, setEvents] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchTickets();
    fetchEvents();
  }, [page, statusFilter, eventFilter, searchQuery]);

  async function fetchTickets() {
    try {
      setLoading(true);
      setError(null);
      let ticketsQueryRef = collection(db, 'tickets');
      let conditions = [];

      if (statusFilter && statusFilter !== 'all') {
        conditions.push(where('status', '==', statusFilter));
      }
      if (eventFilter && eventFilter !== 'all') {
        conditions.push(where('eventId', '==', eventFilter));
      }
      
      if (searchQuery) {
        // Se c'è una searchQuery, potremmo dover fetchare più documenti e filtrare lato client
        // oppure implementare una logica di ricerca più sofisticata se il backend lo supporta.
        // Per ora, la ricerca testuale verrà applicata dopo il fetch iniziale basato sugli altri filtri.
      }

      if (conditions.length > 0) {
        ticketsQueryRef = query(collection(db, 'tickets'), ...conditions, orderBy('soldAt', 'desc'), limit(itemsPerPage * page));
      } else {
        ticketsQueryRef = query(collection(db, 'tickets'), orderBy('soldAt', 'desc'), limit(itemsPerPage * page));
      }
      
      const snapshot = await getDocs(ticketsQueryRef);
      let ticketsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          soldAtFormatted: formatDate(data.soldAt),
          eventDateFormatted: formatDateOnly(data.eventDate),
          eventName: data.eventName || 'N/D',
          customerName: data.customerName || 'N/D',
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          sellerName: data.sellerName || 'N/D',
          status: data.status || 'N/A',
          code: data.ticketCode || data.code || 'N/A',
          quantity: data.quantity || 1,
          paymentStatus: data.paymentStatus || 'unpaid',
          totalPrice: data.totalPrice,
          price: data.price,
          qrCode: data.qrCode,
        };
      });

      if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        ticketsData = ticketsData.filter(ticket => 
          (ticket.code && ticket.code.toLowerCase().includes(lowerQuery)) ||
          (ticket.customerName && ticket.customerName.toLowerCase().includes(lowerQuery)) ||
          (ticket.customerEmail && ticket.customerEmail.toLowerCase().includes(lowerQuery)) ||
          (ticket.eventName && ticket.eventName.toLowerCase().includes(lowerQuery)) ||
          (ticket.sellerName && ticket.sellerName.toLowerCase().includes(lowerQuery))
        );
      }
      
      const paginatedTickets = ticketsData.slice((page - 1) * itemsPerPage, page * itemsPerPage);
      setTickets(paginatedTickets);

      const totalCount = ticketsData.length;
      setTotalPages(Math.ceil(totalCount / itemsPerPage));

      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei biglietti:', error);
      setError('Si è verificato un errore nel caricamento dei biglietti: ' + error.message);
      setLoading(false);
    }
  }

  async function fetchEvents() {
    try {
      const eventsCollection = collection(db, 'events');
      const eventSnapshot = await getDocs(eventsCollection);
      const eventsList = eventSnapshot.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
      setEvents(eventsList);
    } catch (error) {
      console.error('Errore nel recupero degli eventi:', error);
    }
  }

  function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000) : new Date(timestamp);
    return date.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function formatDateOnly(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000) : new Date(timestamp);
    return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  const handleViewDetails = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetails(true);
  };
  
  const getStatusLabel = (status) => {
    const statusMap = {
      active: 'Attivo',
      validated: 'Validato',
      disabled: 'Disabilitato',
      sold: 'Venduto',
      cancelled: 'Annullato',
    };
    return statusMap[status] || status?.toString() || 'Sconosciuto';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': case 'sold': return <FaCheckCircle className="status-icon active" />;
      case 'validated': return <FaCheckCircle className="status-icon validated" />;
      case 'disabled': return <FaBan className="status-icon disabled" />;
      case 'cancelled': return <FaTimesCircle className="status-icon cancelled" />;
      default: return <FaQuestionCircle className="status-icon unknown" />;
    }
  };

  async function handleDisableTicket(ticketId) {
    if (!window.confirm('Sei sicuro di voler disabilitare questo biglietto?')) return;
    setActionInProgress(true);
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      const ticketData = ticketSnap.data();
      await updateDoc(ticketRef, { 
        status: 'disabled', 
        previousStatus: ticketData.status || 'active',
        scannerMessage: 'Biglietto disabilitato dall_admin',
        updatedAt: serverTimestamp() 
      });
      setSuccessMessage('Biglietto disabilitato.');
      fetchTickets();
    } catch (e) { setError('Errore disabilitazione: ' + e.message); }
    finally { setActionInProgress(false); setTimeout(() => {setSuccessMessage(null); setError(null)}, 3000)}
  }

  async function handleEnableTicket(ticketId) {
    if (!window.confirm('Sei sicuro di voler riabilitare questo biglietto?')) return;
    setActionInProgress(true);
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      const ticketData = ticketSnap.data();
      await updateDoc(ticketRef, { 
        status: ticketData.previousStatus || 'active',
        previousStatus: null,
        scannerMessage: null,
        updatedAt: serverTimestamp() 
      });
      setSuccessMessage('Biglietto riabilitato.');
      fetchTickets();
    } catch (e) { setError('Errore riabilitazione: ' + e.message); }
    finally { setActionInProgress(false); setTimeout(() => {setSuccessMessage(null); setError(null)}, 3000)}
  }

  async function handleDeleteTicket(ticketId) {
    if (!window.confirm('Sei sicuro di voler ELIMINARE DEFINITIVAMENTE questo biglietto? L_azione non è reversibile.')) return;
    setActionInProgress(true);
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      if (!ticketSnap.exists()) throw new Error("Biglietto non trovato.");
      const ticketData = ticketSnap.data();

      await deleteDoc(ticketRef);

      if (ticketData.eventId && ticketData.eventDate && ticketData.itemId && ticketData.itemType === 'ticket') {
        const eventRef = doc(db, 'events', ticketData.eventId);
        const eventSnap = await getDoc(eventRef);
        if (eventSnap.exists()) {
          const eventData = eventSnap.data();
          const eventDates = eventData.eventDates ? [...eventData.eventDates] : [];
          const dateIndex = eventDates.findIndex(ed => ed.date === ticketData.eventDate);

          if (dateIndex > -1) {
            const ticketTypes = eventDates[dateIndex].ticketTypes ? [...eventDates[dateIndex].ticketTypes] : [];
            const typeIndex = ticketTypes.findIndex(tt => tt.id === ticketData.itemId);
            if (typeIndex > -1) {
              ticketTypes[typeIndex].quantity = (Number(ticketTypes[typeIndex].quantity) || 0) + (Number(ticketData.quantity) || 0);
              eventDates[dateIndex].ticketTypes = ticketTypes;
              await updateDoc(eventRef, { eventDates: eventDates });
            }
          }
        }
      }
      setSuccessMessage('Biglietto eliminato con successo. Scorte evento aggiornate.');
      fetchTickets();
    } catch (e) { setError('Errore eliminazione: ' + e.message); }
    finally { setActionInProgress(false); setTimeout(() => {setSuccessMessage(null); setError(null)}, 3000)}
  }

  async function handleTogglePaymentStatus(ticketId, currentStatus) {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
    if (!window.confirm(`Segnare questo biglietto come "${newStatus === 'paid' ? 'Pagato' : 'Non Pagato'}"?`)) return;
    setActionInProgress(true);
    try {
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, { 
        paymentStatus: newStatus, 
        paymentStatusUpdatedAt: serverTimestamp() 
      });
      setSuccessMessage(`Stato pagamento aggiornato a ${newStatus}.`);
      fetchTickets();
    } catch (e) { setError('Errore aggiornamento pagamento: ' + e.message); }
    finally { setActionInProgress(false); setTimeout(() => {setSuccessMessage(null); setError(null)}, 3000)}
  }

  const generateWhatsAppMessage = (ticket) => {
    return encodeURIComponent(
`Ciao ${ticket.customerName || ''}! 👋
Ecco il riepilogo del tuo biglietto:
Evento: *${ticket.eventName}*
Data Evento: ${ticket.eventDateFormatted}
Tipo: ${ticket.ticketType || ticket.itemName || 'Standard'} (x${ticket.quantity})
Codice Biglietto: *${ticket.code}*

Grazie!`
    );
  };

  const handleShareWhatsApp = (ticket) => {
    const phoneNumber = ticket.customerPhone || '';
    const message = generateWhatsAppMessage(ticket);
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/\D/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="ticket-history">
      <h2>Storico Biglietti</h2>

      {error && <p className="error-message">{error}</p>}
      {successMessage && <p className="success-message">{successMessage}</p>}

      <div className="filters-container">
        <input 
          type="text"
          placeholder="Cerca per codice, cliente, evento, email, venditore..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="search-input-th"
        />
        <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setPage(1);}} className="filter-select-th">
          <option value="all">Tutti gli Stati</option>
          <option value="active">Attivo</option>
          <option value="sold">Venduto</option>
          <option value="validated">Validato</option>
          <option value="disabled">Disabilitato</option>
          <option value="cancelled">Annullato</option>
        </select>
        <select value={eventFilter} onChange={(e) => {setEventFilter(e.target.value); setPage(1);}} className="filter-select-th">
          <option value="all">Tutti gli Eventi</option>
          {events.map(event => (
            <option key={event.id} value={event.id}>{event.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Caricamento biglietti...</p>
      ) : tickets.length === 0 ? (
        <p>Nessun biglietto trovato con i filtri selezionati.</p>
      ) : (
        <>
          <div className="table-responsive-wrapper tickets-table-container">
            <table className="tickets-table">
              <thead>
                <tr>
                  <th>Codice</th>
                  <th>Evento</th>
                  <th>Data Evento</th>
                  <th>Cliente</th>
                  <th>Data Vendita</th> 
                  <th>Qtà</th>
                  <th>Venduto Da</th>
                  <th>Stato Pagamento</th>
                  <th>Stato Biglietto</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(ticket => (
                  <tr key={ticket.id} className={`status-ticket-${ticket.status}`}>
                    <td data-label="Codice">{ticket.code}</td>
                    <td data-label="Evento">{ticket.eventName}</td>
                    <td data-label="Data Evento">{ticket.eventDateFormatted}</td>
                    <td data-label="Cliente">{ticket.customerName}</td>
                    <td data-label="Data Vendita">{ticket.soldAtFormatted}</td> 
                    <td data-label="Quantità">{ticket.quantity}</td>
                    <td data-label="Venduto Da">{ticket.sellerName}</td>
                    <td data-label="Stato Pagamento">
                      <button 
                        onClick={() => handleTogglePaymentStatus(ticket.id, ticket.paymentStatus)} 
                        className={`action-btn payment-toggle ${ticket.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}
                        title={ticket.paymentStatus === 'paid' ? 'Segna Non Pagato' : 'Segna Pagato'}
                        disabled={actionInProgress}
                      >
                        {ticket.paymentStatus === 'paid' ? <FaCheckCircle /> : <FaTimesCircle />}
                      </button>
                    </td>
                    <td data-label="Stato Biglietto">
                      {getStatusIcon(ticket.status)} {getStatusLabel(ticket.status)}
                    </td>
                    <td data-label="Azioni" className="ticket-actions">
                      <button onClick={() => handleViewDetails(ticket)} className="action-btn details-btn" title="Vedi Dettagli" disabled={actionInProgress}>
                        <FaInfoCircle />
                      </button>
                      {(ticket.status === 'active' || ticket.status === 'sold') && (
                        <button onClick={() => handleDisableTicket(ticket.id)} className="action-btn disable-btn" title="Disabilita Biglietto" disabled={actionInProgress}>
                          <FaBan />
                        </button>
                      )}
                      {ticket.status === 'disabled' && (
                        <button onClick={() => handleEnableTicket(ticket.id)} className="action-btn enable-btn" title="Riabilita Biglietto" disabled={actionInProgress}>
                          <FaUndo />
                        </button>
                      )}
                      <button onClick={() => handleDeleteTicket(ticket.id)} className="action-btn delete-btn" title="Elimina Biglietto" disabled={actionInProgress}>
                        <FaTrash />
                      </button>
                      <button onClick={() => handleShareWhatsApp(ticket)} className="action-btn whatsapp-btn" title="Condividi su WhatsApp" disabled={actionInProgress}>
                        <FaWhatsapp />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>Precedente</button>
            <span>Pagina {page} di {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>Successiva</button>
          </div>
        </>
      )}

      {showDetails && selectedTicket && (
        <div className="details-modal">
          <div className="details-content">
            <button className="close-button" onClick={() => setShowDetails(false)}>&times;</button>
            <h3>Dettagli Biglietto: {selectedTicket.code}</h3>
            <p><strong>Evento:</strong> {selectedTicket.eventName}</p>
            <p><strong>Data Evento:</strong> {selectedTicket.eventDateFormatted}</p>
            <p><strong>Cliente:</strong> {selectedTicket.customerName}</p>
            <p><strong>Email Cliente:</strong> {selectedTicket.customerEmail || 'N/A'}</p>
            <p><strong>Telefono Cliente:</strong> {selectedTicket.customerPhone || 'N/A'}</p>
            <p><strong>Data Vendita:</strong> {selectedTicket.soldAtFormatted}</p>
            <p><strong>Quantità:</strong> {selectedTicket.quantity}</p>
            <p><strong>Prezzo Unitario:</strong> €{Number(selectedTicket.price || 0).toFixed(2)}</p>
            <p><strong>Prezzo Totale:</strong> €{Number(selectedTicket.totalPrice || 0).toFixed(2)}</p>
            <p><strong>Venduto da:</strong> {selectedTicket.sellerName}</p>
            <p><strong>Stato:</strong> {getStatusLabel(selectedTicket.status)}</p>
            <p><strong>Stato Pagamento:</strong> {selectedTicket.paymentStatus === 'paid' ? 'Pagato' : 'Non Pagato'}</p>
            {selectedTicket.qrCode && (
              <div className="qr-code-container-th">
                <p><strong>QR Code:</strong></p>
                <img src={selectedTicket.qrCode} alt="QR Code" style={{maxWidth: '150px', marginTop:'10px'}}/>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TicketHistory; 