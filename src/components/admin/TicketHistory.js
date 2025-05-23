import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp, increment, getDoc } from 'firebase/firestore';
import { FaSearch, FaTimesCircle, FaCheckCircle, FaBan, FaUndo, FaInfoCircle, FaWhatsapp, FaTrash, FaShoppingCart, FaQuestionCircle } from 'react-icons/fa';
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
        const mappedTicket = {
          id: doc.id,
          ...data,
          eventId: data.eventId || data.event_id || null,
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
          ticketType: data.ticketType || data.ticket_type || 'Standard',
          tableNumber: data.tableNumber || data.table_number,
          sellerId: data.sellerId || data.seller_id,
          sellerName: data.sellerName || data.seller_name,
          usedAt: data.usedAt || data.used_at,
          cancelledAt: data.cancelledAt || data.cancelled_at,
          previousStatus: data.previousStatus || data.previous_status,
          paymentStatus: data.paymentStatus || 'unpaid',
          paymentStatusUpdatedAt: data.paymentStatusUpdatedAt
        };
        return mappedTicket;
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

  function formatDateOnly(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp instanceof Date 
      ? timestamp 
      : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
    
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  async function handleDisableTicket(ticketId) {
    if (!window.confirm('Sei sicuro di voler disabilitare questo biglietto? Non potrà essere validato.')) {
      return;
    }

    try {
      setCancellingTicket(true);
      setError(null);

      // Aggiorna lo stato del biglietto a "disabled" e aggiungi il messaggio per lo scanner
      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        status: 'disabled',
        updatedAt: serverTimestamp(),
        scannerMessage: 'Ticket disabilitato', // Aggiungo il messaggio per lo scanner
        previousStatus: 'active' // Mantengo lo stato precedente
      });

      // Aggiorna l'UI
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId
            ? {...ticket, status: 'disabled', scannerMessage: 'Ticket disabilitato'}
            : ticket
        )
      );

      // Aggiorna il biglietto selezionato se è quello corrente
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket({
          ...selectedTicket,
          status: 'disabled',
          scannerMessage: 'Ticket disabilitato'
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

  async function handleDeleteTicket(ticketId, eventId, quantity) {
    if (!window.confirm('Sei sicuro di voler eliminare definitivamente questo biglietto? Questa azione non può essere annullata.')) {
      return;
    }

    try {
      setCancellingTicket(true);
      setError(null);

      console.log(`Inizio eliminazione del biglietto ${ticketId}`);
      
      // 1. Recupera i dettagli del biglietto prima di eliminarlo
      const ticketRef = doc(db, 'tickets', ticketId);
      const ticketSnap = await getDoc(ticketRef);
      
      if (!ticketSnap.exists()) {
        throw new Error('Biglietto non trovato');
      }
      
      const ticketData = ticketSnap.data();
      const ticketEventId = ticketData.eventId || ticketData.event_id;
      const ticketQuantity = ticketData.quantity || 1;
      const eventDate = ticketData.eventDate || ticketData.event_date;
      
      // Recupera informazioni sul tipo di biglietto
      const ticketTypeId = ticketData.ticketTypeId || ticketData.ticketType?.id || '';
      const ticketTypeName = ticketData.ticketTypeName || ticketData.ticketType?.name || '';
      console.log(`Dettagli biglietto - ID Evento: ${ticketEventId}, Quantità: ${ticketQuantity}, Tipo: ${ticketTypeName || "Sconosciuto"}`);
      
      // 2. Elimina il biglietto
      await deleteDoc(ticketRef);
      console.log(`Biglietto ${ticketId} eliminato con successo`);
      
      // 3. Aggiorna le giacenze dell'evento
      if (ticketEventId) {
        try {
          console.log(`Recupero dettagli completi dell'evento ${ticketEventId}`);
          
          const eventRef = doc(db, 'events', ticketEventId);
          const eventSnap = await getDoc(eventRef);
          
          if (!eventSnap.exists()) {
            throw new Error(`Evento ${ticketEventId} non trovato`);
          }
          
          const eventData = eventSnap.data();
          console.log(`Evento trovato: ${eventData.name}`);
          
          // Log dettagliato per debugging
          console.log(`STRUTTURA COMPLETA DELL'EVENTO:`, JSON.stringify(eventData, null, 2));
          
          // Controlla anche eventDates se presente
          if (eventData.eventDates && Array.isArray(eventData.eventDates) && eventData.eventDates.length > 0) {
            console.log(`L'evento ha ${eventData.eventDates.length} date configurate`);
            
            // Cerca la data corrispondente al biglietto
            let foundDate = false;
            if (eventDate) {
              const eventDateObj = eventDate instanceof Date ? 
                eventDate : 
                new Date(eventDate.seconds ? eventDate.seconds * 1000 : eventDate);
              
              const eventDateString = eventDateObj.toISOString().split('T')[0];
              
              // Copia l'array delle date per la modifica
              const updatedEventDates = [...eventData.eventDates];
              
              for (let i = 0; i < updatedEventDates.length; i++) {
                const dateItem = updatedEventDates[i];
                const itemDate = dateItem.date instanceof Date ? 
                  dateItem.date : 
                  new Date(dateItem.date.seconds ? dateItem.date.seconds * 1000 : dateItem.date);
                
                const itemDateString = itemDate.toISOString().split('T')[0];
                
                // Se abbiamo trovato la data corrispondente
                if (itemDateString === eventDateString) {
                  console.log(`Trovata data corrispondente al biglietto: ${itemDateString}`);
                  
                  // Verifica se la data ha tipi di biglietto
                  if (dateItem.ticketTypes && Array.isArray(dateItem.ticketTypes)) {
                    console.log(`La data ha ${dateItem.ticketTypes.length} tipi di biglietto`);
                    
                    // Cerca il tipo "general"
                    let foundTicketType = false;
                    for (let j = 0; j < dateItem.ticketTypes.length; j++) {
                      const typeItem = dateItem.ticketTypes[j];
                      const typeName = (typeItem.name || '').toLowerCase();
                      
                      if (typeName === 'general' || typeName === 'generale' || typeName === 'standard') {
                        console.log(`Trovato tipo "general" per la data ${itemDateString}`);
                        const oldQuantity = parseInt(typeItem.quantity) || 0;
                        const newQuantity = oldQuantity + ticketQuantity;
                        
                        console.log(`Incremento quantità da ${oldQuantity} a ${newQuantity}`);
                        updatedEventDates[i].ticketTypes[j].quantity = newQuantity;
                        
                        // Aggiorna il documento
                        await updateDoc(eventRef, { eventDates: updatedEventDates });
                        console.log(`Aggiornato documento con nuovo valore per il tipo "${typeName}"`);
                        
                        foundTicketType = true;
                        foundDate = true;
                        break;
                      }
                    }
                    
                    // Se non trovato, usa il primo tipo disponibile
                    if (!foundTicketType && dateItem.ticketTypes.length > 0) {
                      const typeItem = dateItem.ticketTypes[0];
                      const oldQuantity = parseInt(typeItem.quantity) || 0;
                      const newQuantity = oldQuantity + ticketQuantity;
                      
                      console.log(`Tipo "general" non trovato, uso il primo tipo: ${typeItem.name}`);
                      console.log(`Incremento quantità da ${oldQuantity} a ${newQuantity}`);
                      
                      updatedEventDates[i].ticketTypes[0].quantity = newQuantity;
                      
                      // Aggiorna il documento
                      await updateDoc(eventRef, { eventDates: updatedEventDates });
                      console.log(`Aggiornato documento con nuovo valore per il tipo "${typeItem.name}"`);
                      
                      foundDate = true;
                    }
                  }
                  
                  break;
                }
              }
            }
            
            // Se abbiamo trovato e aggiornato la data corretta, possiamo interrompere qui
            if (foundDate) {
              console.log(`Data aggiornata con successo, nessun'altra azione richiesta`);
              return;
            }
          }
          
          // Recupera il documento evento per effettuare modifiche
          // Controlla se l'evento ha tipi di biglietto 
          if (eventData.ticketTypes && Array.isArray(eventData.ticketTypes) && eventData.ticketTypes.length > 0) {
            console.log(`L'evento ha ${eventData.ticketTypes.length} tipi di biglietto`);
            
            // Copia l'array dei tipi di biglietto
            const updatedTicketTypes = [...eventData.ticketTypes];
            let foundTicketType = false;
            
            // Cerca il tipo "generale" o "standard"
            for (let i = 0; i < updatedTicketTypes.length; i++) {
              const typeName = (updatedTicketTypes[i].name || '').toLowerCase();
              if (typeName === 'general' || typeName === 'generale' || typeName === 'standard') {
                console.log(`Trovato tipo di biglietto standard: ${updatedTicketTypes[i].name}`);
                const oldQuantity = parseInt(updatedTicketTypes[i].quantity) || 0;
                const newQuantity = oldQuantity + ticketQuantity;
                
                console.log(`Incremento quantità da ${oldQuantity} a ${newQuantity}`);
                updatedTicketTypes[i].quantity = newQuantity;
                
                // Aggiorna il documento
                await updateDoc(eventRef, { ticketTypes: updatedTicketTypes });
                console.log(`Aggiornato biglietto di tipo ${updatedTicketTypes[i].name}: ${oldQuantity} -> ${newQuantity}`);
                foundTicketType = true;
                break;
              }
            }
            
            // Se non è stato possibile trovare un tipo specifico, aggiorna tutti
            if (!foundTicketType) {
              console.log(`Tipo specifico non trovato, incremento primo disponibile`);
              // Usa il primo tipo disponibile
              if (updatedTicketTypes.length > 0) {
                const oldQuantity = parseInt(updatedTicketTypes[0].quantity) || 0;
                const newQuantity = oldQuantity + ticketQuantity;
                
                console.log(`Incremento quantità per ${updatedTicketTypes[0].name} da ${oldQuantity} a ${newQuantity}`);
                updatedTicketTypes[0].quantity = newQuantity;
                
                // Aggiorna il documento
                await updateDoc(eventRef, { ticketTypes: updatedTicketTypes });
              }
            }
          } else {
            // Se non ci sono tipi di biglietto, incrementa il contatore generale
            const oldAvailableTickets = parseInt(eventData.availableTickets) || 0;
            console.log(`Incremento contatore generale da ${oldAvailableTickets} a ${oldAvailableTickets + ticketQuantity}`);
            await updateDoc(eventRef, { availableTickets: increment(ticketQuantity) });
          }
          
          // Notifica l'aggiornamento
          const ticketUpdateEvent = new CustomEvent('ticketQuantityUpdated', {
            detail: {
              eventId: ticketEventId
            }
          });
          window.dispatchEvent(ticketUpdateEvent);
          
          console.log(`Biglietto eliminato: ripristinati ${ticketQuantity} biglietti all'evento`);
        } catch (eventError) {
          console.error("Errore nell'aggiornamento delle giacenze:", eventError);
          setError("Il biglietto è stato eliminato, ma non è stato possibile aggiornare le giacenze dell'evento.");
        }
      } else {
        console.warn("Nessun ID evento associato al biglietto");
      }
      
      // 4. Aggiorna l'UI
      setTickets(prevTickets => prevTickets.filter(ticket => ticket.id !== ticketId));
      
      // 5. Chiudi il modale dei dettagli se era aperto
      if (selectedTicket && selectedTicket.id === ticketId) {
        setShowDetails(false);
        setSelectedTicket(null);
      }

      setSuccessMessage(`Biglietto eliminato con successo! ${ticketQuantity} biglietti sono stati ripristinati all'evento.`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (error) {
      console.error("Errore durante eliminazione biglietto:", error);
      setError("Si è verificato un errore durante eliminazione del biglietto: " + error.message);
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

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Attivo';
      case 'validated':
        return 'Validato';
      case 'disabled':
        return 'Disabilitato';
      case 'sold':
        return 'Venduto';
      case 'cancelled':
        return 'Cancellato';
      default:
        return 'Sconosciuto';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <FaCheckCircle className="status-icon active" />;
      case 'validated':
        return <FaCheckCircle className="status-icon validated" />;
      case 'disabled':
        return <FaBan className="status-icon disabled" />;
      case 'sold':
        return <FaShoppingCart className="status-icon sold" />;
      case 'cancelled':
        return <FaTimesCircle className="status-icon cancelled" />;
      default:
        return <FaQuestionCircle className="status-icon" />;
    }
  };

  function getScannerMessage(ticket) {
    if (ticket.status === 'disabled') {
      return 'Ticket disabilitato';
    }
    if (ticket.status === 'deleted') {
      return 'Ticket eliminato';
    }
    if (ticket.status === 'validated') {
      return 'Ticket già validato';
    }
    if (ticket.status === 'cancelled') {
      return 'Ticket annullato';
    }
    return null;
  }

  function handleViewDetails(ticket) {
    setSelectedTicket(ticket);
    setShowDetails(true);
  }

  function generateWhatsAppMessage(ticket) {
    const message = `🎫 Dettagli del tuo biglietto:\n\n` +
      `Evento: ${ticket.eventName}\n` +
      `Data: ${formatDateOnly(ticket.eventDate)}\n` +
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

  // Funzione per cambiare lo stato di pagamento di un biglietto
  async function handleTogglePaymentStatus(ticketId, currentPaymentStatus) {
    const newPaymentStatus = currentPaymentStatus === 'paid' ? 'unpaid' : 'paid';
    const confirmationMessage = `Sei sicuro di voler segnare questo biglietto come "${newPaymentStatus === 'paid' ? 'Pagato' : 'Non Pagato'}"?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    try {
      setLoading(true); // Potrebbe essere utile un loading specifico per questa azione
      setError(null);

      const ticketRef = doc(db, 'tickets', ticketId);
      await updateDoc(ticketRef, {
        paymentStatus: newPaymentStatus,
        paymentStatusUpdatedAt: serverTimestamp() 
      });

      // Aggiorna l'UI localmente
      setTickets(prevTickets =>
        prevTickets.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, paymentStatus: newPaymentStatus }
            : ticket
        )
      );

      // Aggiorna anche il selectedTicket se è quello modificato
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, paymentStatus: newPaymentStatus }));
      }

      setSuccessMessage(`Stato pagamento aggiornato a "${newPaymentStatus === 'paid' ? 'Pagato' : 'Non Pagato'}".`);
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (err) {
      console.error("Errore nell'aggiornamento dello stato di pagamento:", err);
      setError("Si è verificato un errore durante l'aggiornamento dello stato di pagamento.");
    } finally {
      setLoading(false);
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
                  <th>Venduto Da</th>
                  <th>Stato</th>
                  <th>Stato Pagamento</th>
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
                    <td>{ticket.sellerName || 'N/A'}</td>
                    <td>
                      <div className="status">
                        {getStatusIcon(ticket.status)}
                        <span>{getStatusLabel(ticket.status)}</span>
                        {getScannerMessage(ticket) && (
                          <span className="scanner-message">{getScannerMessage(ticket)}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`payment-status-badge ${ticket.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                        {ticket.paymentStatus === 'paid' ? <FaCheckCircle /> : <FaTimesCircle />}
                        {ticket.paymentStatus === 'paid' ? 'Pagato' : 'Non Pagato'}
                      </span>
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

                      {/* Enable/Disable Buttons */}
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

                      {(ticket.status === 'active' || ticket.status === 'sold') && (
                        <button 
                          onClick={() => handleDisableTicket(ticket.id)} 
                          className="action-btn disable-btn"
                          disabled={cancellingTicket}
                          title="Disabilita (Impedisce la validazione)" 
                        >
                          <FaBan />
                        </button>
                      )}
                      
                      {/* Switch per Pagato/Non Pagato */}
                      <button 
                        title={ticket.paymentStatus === 'paid' ? 'Segna come Non Pagato' : 'Segna come Pagato'}
                        onClick={() => handleTogglePaymentStatus(ticket.id, ticket.paymentStatus)}
                        className={`action-btn payment-toggle ${ticket.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                        {ticket.paymentStatus === 'paid' ? <FaCheckCircle /> : <FaTimesCircle />}
                      </button>
                      
                      {/* Delete Button */}
                      <button 
                        onClick={() => {
                          handleDeleteTicket(ticket.id, ticket.eventId, ticket.quantity);
                        }} 
                        className="action-btn delete-btn"
                        disabled={cancellingTicket}
                        title="Elimina Biglietto" 
                      >
                        <FaTrash />
                      </button>
                      
                      {/* WhatsApp Share Button */}
                      {(ticket.status === 'active' || ticket.status === 'sold') && (
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