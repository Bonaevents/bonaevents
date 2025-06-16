import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import './TicketHistory.css';

function TicketHistory() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    if (currentUser?.uid) {
      fetchTickets();
    }
  }, [currentUser]);

  const fetchTickets = async () => {
    if (!currentUser?.uid) {
      setError('Utente non autenticato');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const ticketsRef = collection(db, 'tickets');
      // Semplifichiamo la query per evitare problemi con l'indice
      const q = query(ticketsRef, where('sellerId', '==', currentUser.uid));

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const ticketsData = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            // Gestione sicura delle date
            saleDate: data.saleDate ? data.saleDate.toDate() : new Date(),
            eventDate: data.eventDate ? new Date(data.eventDate) : new Date(),
            paymentStatus: data.paymentStatus || 'unpaid'
          };
        });

        // Ordinamento lato client
        ticketsData.sort((a, b) => b.saleDate - a.saleDate);
        
        setTickets(ticketsData);
      } else {
        setTickets([]);
      }
    } catch (error) {
      console.error('Errore nel recupero dei biglietti:', error);
      if (error.code === 'failed-precondition') {
        setError('Errore di configurazione del database. Contattare l\'amministratore.');
      } else {
        setError('Errore nel recupero dei biglietti. Riprova più tardi.');
      }
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const handleFilterChange = (e) => {
    setFilterBy(e.target.value);
  };

  const filteredTickets = tickets.filter(ticket => {
    if (!searchTerm) return true;

    const searchValue = searchTerm.toLowerCase();
    switch (filterBy) {
      case 'email':
        return ticket.customerEmail?.toLowerCase().includes(searchValue);
      case 'name':
        return ticket.customerName?.toLowerCase().includes(searchValue);
      case 'event':
        return ticket.eventName?.toLowerCase().includes(searchValue);
      case 'code':
        return ticket.ticketCode?.toLowerCase().includes(searchValue);
      default:
        return (
          ticket.customerEmail?.toLowerCase().includes(searchValue) ||
          ticket.customerName?.toLowerCase().includes(searchValue) ||
          ticket.eventName?.toLowerCase().includes(searchValue) ||
          ticket.ticketCode?.toLowerCase().includes(searchValue)
        );
    }
  });

  if (loading) return <div className="loading">Loading sales history...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="ticket-history">
      <h2>Sales History</h2>
      
      <div className="filters-section">
        <div className="search-box">
          <label htmlFor="searchInput" className="filter-label">Search sales:</label>
          <input
            type="text"
            id="searchInput"
            placeholder="Name, email, event, code..."
            value={searchTerm}
            onChange={handleSearch}
            className="search-input"
          />
          <label htmlFor="filterSelect" className="filter-label">Filter by:</label>
          <select
            id="filterSelect"
            value={filterBy}
            onChange={handleFilterChange}
            className="filter-select"
          >
            <option value="all">All fields</option>
            <option value="email">Customer email</option>
            <option value="name">Customer name</option>
            <option value="event">Event name</option>
            <option value="code">Ticket code</option>
          </select>
        </div>
      </div>

      <div className="tickets-grid">
        {filteredTickets.map(ticket => (
          <div key={ticket.id} className="ticket-card">
            <div className="ticket-header">
              <h3>{ticket.eventName}</h3>
              <span className="ticket-code">Code: {ticket.ticketCode}</span>
            </div>
            
            <div className="ticket-details">
              <div className="detail-row">
                <span className="label">Event:</span>
                <span className="value">{ticket.eventName || 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="label">Ticket Code:</span>
                <span className="value">{ticket.ticketCode || 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="label">Sale date:</span>
                <span className="value">{ticket.saleDate.toLocaleDateString()}</span>
              </div>
              
              <div className="detail-row">
                <span className="label">Event date:</span>
                <span className="value">{ticket.eventDate.toLocaleDateString()}</span>
              </div>

              <div className="detail-row">
                <span className="label">Customer:</span>
                <span className="value">{ticket.customerName}</span>
              </div>

              <div className="detail-row">
                <span className="label">Customer email:</span>
                <span className="value">{ticket.customerEmail || 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="label">Customer phone:</span>
                <span className="value">{ticket.customerPhone || 'N/A'}</span>
              </div>

              <div className="detail-row">
                <span className="label">Quantity:</span>
                <span className="value">{ticket.quantity}</span>
              </div>

              <div className="detail-row">
                <span className="label">Unit price:</span>
                <span className="value">€{ticket.price?.toFixed(2) || '0.00'}</span>
              </div>

              <div className="detail-row total">
                <span className="label">Total:</span>
                <span className="value">€{ticket.totalPrice?.toFixed(2) || '0.00'}</span>
              </div>

              {typeof ticket.commissionAmount === 'number' && (
                <div className="detail-row commission">
                  <span className="label">Commission Earned:</span>
                  <span className="value">€{ticket.commissionAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="detail-row payment-status-row">
                <span className="label">Payment Status:</span>
                <span className={`value payment-status-badge ${ticket.paymentStatus === 'paid' ? 'paid' : 'unpaid'}`}>
                  {ticket.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTickets.length === 0 && (
        <div className="no-results">
          No sales found with selected filters
        </div>
      )}
    </div>
  );
}

export default TicketHistory; 