import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';
import { FaTicketAlt, FaCalendarAlt, FaUser, FaCheck, FaTimes, FaSearch, FaArrowLeft, FaPhone, FaEnvelope, FaUserTie, FaMoneyBillWave, FaShoppingCart, FaMapMarkerAlt } from 'react-icons/fa';
import './TicketManagement.css';

function TicketManagement() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [checkedTickets, setCheckedTickets] = useState(new Set());
  const [availableDates, setAvailableDates] = useState([]);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      console.log('Evento selezionato:', selectedEvent);
      fetchTicketsForEvent(selectedEvent.id);
      // Estrai le date disponibili dall'evento selezionato
      if (selectedEvent.eventDates && selectedEvent.eventDates.length > 0) {
        const dates = selectedEvent.eventDates.map(date => {
          const eventDate = date.date.seconds ? 
            new Date(date.date.seconds * 1000) : 
            parseDate(date.date);
          
          if (!eventDate) return null;

          return {
            value: eventDate.toISOString().split('T')[0],
            label: formatDate(eventDate)
          };
        }).filter(date => date !== null);

        console.log('Date disponibili:', dates);
        setAvailableDates(dates);
      } else {
        setAvailableDates([]);
      }
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef);
      const querySnapshot = await getDocs(q);
      
      const eventsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Eventi recuperati:', eventsData);
      setEvents(eventsData);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero degli eventi:', error);
      setLoading(false);
    }
  };

  const fetchTicketsForEvent = async (eventId) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Recupero biglietti per evento:', eventId);
      
      const ticketsRef = collection(db, 'tickets');
      const q = query(
        ticketsRef,
        where('eventId', '==', eventId)
      );
      
      const querySnapshot = await getDocs(q);
      console.log('Query snapshot size:', querySnapshot.size);
      
      const ticketsData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          eventDate: data.eventDate?.seconds ? new Date(data.eventDate.seconds * 1000) : data.eventDate
        };
      });

      ticketsData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });
      
      console.log('Biglietti trovati per evento:', eventId, ticketsData);
      setTickets(ticketsData);
      setLoading(false);
      setRetryCount(0); // Reset retry count on success
    } catch (error) {
      console.error('Errore nel recupero dei biglietti:', error);
      setError(error.message);
      
      // Retry logic for network errors
      if (error.code === 'auth/network-request-failed' && retryCount < MAX_RETRIES) {
        console.log(`Tentativo di recupero ${retryCount + 1}/${MAX_RETRIES}...`);
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          fetchTicketsForEvent(eventId);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        setLoading(false);
      }
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'validated':
        return { label: 'Validato', color: 'validated' };
      case 'active':
        return { label: 'Attivo', color: 'active' };
      case 'disabled':
        return { label: 'Disabilitato', color: 'disabled' };
      case 'cancelled':
        return { label: 'Annullato', color: 'cancelled' };
      case 'sold':
        return { label: 'Venduto', color: 'sold' };
      default:
        return { label: status, color: 'default' };
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/D';
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleString('it-IT');
    }
    if (date instanceof Date) {
      return date.toLocaleString('it-IT');
    }
    return new Date(date).toLocaleString('it-IT');
  };

  const parseDate = (dateStr) => {
    if (!dateStr) return null;
    // Gestisce il formato italiano (DD/MM/YYYY, HH:mm:ss)
    const parts = dateStr.split(', ');
    if (parts.length === 2) {
      const [datePart, timePart] = parts;
      const [day, month, year] = datePart.split('/');
      const [hours, minutes, seconds] = timePart.split(':');
      return new Date(year, month - 1, day, hours, minutes, seconds);
    }
    return new Date(dateStr);
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = 
      ticket.ticketCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDate = !dateFilter || 
      (ticket.eventDate && 
        new Date(ticket.eventDate).toISOString().split('T')[0] === dateFilter);

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'validated' ? ticket.status === 'validated' || ticket.isValidated === true : ticket.status === statusFilter);

    return matchesSearch && matchesDate && matchesStatus;
  });

  // Raggruppa i biglietti per data
  const ticketsByDate = filteredTickets.reduce((acc, ticket) => {
    const date = ticket.eventDate;
    if (!date) return acc;
    
    let dateKey;
    if (typeof date === 'string' && date.includes('/')) {
      // Se la data è nel formato italiano
      const parsedDate = parseDate(date);
      dateKey = parsedDate ? parsedDate.toISOString() : date;
    } else if (date.seconds) {
      dateKey = new Date(date.seconds * 1000).toISOString();
    } else if (date instanceof Date) {
      dateKey = date.toISOString();
    } else {
      dateKey = new Date(date).toISOString();
    }
    
    if (!acc[dateKey]) {
      acc[dateKey] = {
        tickets: [],
        validated: 0,
        total: 0
      };
    }
    acc[dateKey].tickets.push(ticket);
    acc[dateKey].total += ticket.quantity || 1;
    if (ticket.status === 'validated') {
      acc[dateKey].validated += ticket.quantity || 1;
    }
    return acc;
  }, {});

  const toggleTicketCheck = (ticketId) => {
    setCheckedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="loading">
        Caricamento...
        {retryCount > 0 && (
          <div className="retry-message">
            Tentativo di recupero {retryCount}/{MAX_RETRIES}...
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-message">
          Si è verificato un errore: {error}
        </div>
        <button 
          className="retry-button"
          onClick={() => {
            setRetryCount(0);
            if (selectedEvent) {
              fetchTicketsForEvent(selectedEvent.id);
            }
          }}
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!selectedEvent) {
    return (
      <div className="ticket-management">
        <h2>Seleziona un Evento</h2>
        <div className="events-grid">
          {events.map(event => (
            <div 
              key={event.id} 
              className="event-card"
              onClick={() => setSelectedEvent(event)}
            >
              <h3>{event.name}</h3>
              <div className="event-details">
                <div className="detail-item">
                  <FaCalendarAlt />
                  <span>
                    {event.eventDates && event.eventDates.length > 0 
                      ? formatDate(event.eventDates[0].date)
                      : 'Data non specificata'}
                  </span>
                </div>
                <div className="detail-item">
                  <FaTicketAlt />
                  <span>
                    {event.eventDates && event.eventDates.length > 0
                      ? `${event.eventDates[0].totalTicketsForDate || 0} biglietti`
                      : '0 biglietti'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ticket-management">
      <div className="event-header">
        <button 
          className="back-button"
          onClick={() => setSelectedEvent(null)}
        >
          <FaArrowLeft /> Torna agli eventi
        </button>
        <h2>{selectedEvent.name}</h2>
      </div>

      {/* Contatori totali dell'evento */}
      <div className="event-stats">
        <div className="stat-box">
          <div className="stat-value validated">{tickets.filter(t => t.status === 'validated').reduce((sum, t) => sum + t.quantity, 0)}</div>
          <div className="stat-label">Biglietti Validati</div>
        </div>
        <div className="stat-box">
          <div className="stat-value">{tickets.reduce((sum, t) => sum + t.quantity, 0)}</div>
          <div className="stat-label">Biglietti Totali</div>
        </div>
        <div className="stat-box">
          <div className="stat-value pending">
            {tickets.reduce((sum, t) => sum + t.quantity, 0) - 
             tickets.filter(t => t.status === 'validated').reduce((sum, t) => sum + t.quantity, 0)}
          </div>
          <div className="stat-label">Da Validare</div>
        </div>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="Cerca per codice, cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="date-filter-select"
          >
            <option value="">Tutte le date</option>
            {availableDates.map(date => (
              <option key={date.value} value={date.value}>
                {date.label}
              </option>
            ))}
          </select>

          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tutti gli stati</option>
            <option value="sold">Venduto</option>
            <option value="active">Attivo</option>
            <option value="validated">Validato</option>
            <option value="disabled">Disabilitato</option>
            <option value="cancelled">Annullato</option>
          </select>
        </div>
      </div>

      {Object.entries(ticketsByDate).map(([date, data]) => (
        <div key={date} className="date-section">
          <div className="date-header">
            <div className="date-info">
              <h3>{formatDate(date)}</h3>
              <p className="event-name">{selectedEvent.name}</p>
            </div>
            <div className="date-stats">
              <div className="stat-item">
                <span className="mini-stat validated">{data.validated}</span>
                <span className="stat-label">Validati</span>
              </div>
              <div className="stat-item">
                <span className="mini-stat">{data.total - data.validated}</span>
                <span className="stat-label">Da validare</span>
              </div>
              <div className="stat-item">
                <span className="mini-stat total">{data.total}</span>
                <span className="stat-label">Totali</span>
              </div>
            </div>
          </div>

          <div className="event-banner">
            {selectedEvent.imageUrl && (
              <img 
                src={selectedEvent.imageUrl} 
                alt={selectedEvent.name}
                className="event-image"
              />
            )}
            <div className="event-details">
              <h4>{selectedEvent.name}</h4>
              <p>{selectedEvent.description}</p>
              <div className="event-meta">
                <span><FaMapMarkerAlt /> {selectedEvent.location}</span>
                <span><FaCalendarAlt /> {formatDate(date)}</span>
              </div>
            </div>
          </div>

          <div className="tickets-grid">
            {data.tickets.map(ticket => {
              const status = getStatusLabel(ticket.status);
              const isValidated = ticket.status === 'validated';
              const isChecked = checkedTickets.has(ticket.id);
              return (
                <div key={ticket.id} className={`ticket-card ${isValidated ? 'validated' : ''} ${isChecked ? 'checked' : ''}`}>
                  <div className="ticket-header">
                    <div className="ticket-status">
                      <span className={`status-badge ${status.color}`}>
                        {status.label}
                      </span>
                      {isValidated && (
                        <span className="validation-badge">
                          <FaCheck /> Validato
                        </span>
                      )}
                    </div>
                    <div className="ticket-actions">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTicketCheck(ticket.id)}
                        className="ticket-checkbox"
                      />
                    </div>
                  </div>

                  <div className="ticket-details">
                    <div className="detail-section">
                      <div className="detail-row main-info">
                        <div className="detail-item">
                          <FaTicketAlt />
                          <span className="ticket-code">{ticket.ticketCode}</span>
                        </div>
                        <div className="detail-item">
                          <span className="ticket-type">{ticket.ticketType}</span>
                        </div>
                      </div>

                      <div className="detail-row">
                        <div className="detail-item">
                          <FaUser />
                          <span>{ticket.customerName}</span>
                        </div>
                        <div className="detail-item">
                          <span>{ticket.quantity} × €{ticket.price}</span>
                        </div>
                      </div>

                      <div className="detail-row">
                        <div className="detail-item">
                          <FaPhone />
                          <span>{ticket.customerPhone || 'No tel'}</span>
                        </div>
                        <div className="detail-item">
                          <FaEnvelope />
                          <span>{ticket.customerEmail || 'No email'}</span>
                        </div>
                      </div>

                      <div className="detail-row">
                        <div className="detail-item">
                          <FaUserTie />
                          <span>Venduto da: {ticket.sellerName}</span>
                        </div>
                        <div className="detail-item">
                          <FaMoneyBillWave />
                          <span>Tot: €{ticket.totalPrice}</span>
                        </div>
                      </div>

                      {ticket.validatedAt && (
                        <div className="detail-row validated-info">
                          <FaCheck />
                          <span>Validato il: {formatDate(ticket.validatedAt)}</span>
                        </div>
                      )}

                      {ticket.soldAt && (
                        <div className="detail-row">
                          <FaShoppingCart />
                          <span>Venduto il: {formatDate(ticket.soldAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filteredTickets.length === 0 && (
        <div className="no-tickets">
          <p>Nessun biglietto trovato</p>
        </div>
      )}
    </div>
  );
}

export default TicketManagement; 