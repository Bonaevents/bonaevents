import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import './TicketHistory.css';

function TicketHistory() {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [searchEvent, setSearchEvent] = useState('');
  const [stats, setStats] = useState({
    totalTickets: 0,
    validatedTickets: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    fetchTickets();
  }, [currentUser]);

  // Effetto per filtrare i biglietti quando cambiano i criteri di ricerca
  useEffect(() => {
    filterTickets();
  }, [tickets, searchEmail, searchEvent]);

    async function fetchTickets() {
      try {
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('sellerId', '==', currentUser.uid)
        );

      const snapshot = await getDocs(ticketsQuery);
      const ticketsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

      setTickets(ticketsData);
      calculateStats(ticketsData);
      setLoading(false);
    } catch (error) {
      setError('Errore nel caricamento dei biglietti');
      setLoading(false);
    }
  }

  function filterTickets() {
    let filtered = [...tickets];

    if (searchEmail) {
      filtered = filtered.filter(ticket => 
        ticket.customerEmail.toLowerCase().includes(searchEmail.toLowerCase())
      );
    }

    if (searchEvent) {
      filtered = filtered.filter(ticket =>
        ticket.eventName.toLowerCase().includes(searchEvent.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
  }

  function calculateStats(ticketsData) {
    const stats = ticketsData.reduce((acc, ticket) => ({
          totalTickets: acc.totalTickets + (ticket.quantity || 0),
      validatedTickets: acc.validatedTickets + (ticket.status === 'validated' ? ticket.quantity : 0),
          totalRevenue: acc.totalRevenue + ((ticket.price || 0) * (ticket.quantity || 0))
        }), {
          totalTickets: 0,
          validatedTickets: 0,
          totalRevenue: 0
        });

    setStats(stats);
  }

  if (loading) return <div>Caricamento...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="ticket-history-container">
      <div className="tickets-summary">
        <div className="summary-card">
          <h3>Totale Biglietti</h3>
          <p>{stats.totalTickets}</p>
        </div>
        <div className="summary-card">
          <h3>Biglietti Validati</h3>
          <p>{stats.validatedTickets}</p>
        </div>
        <div className="summary-card">
          <h3>Incasso Totale</h3>
          <p>€{stats.totalRevenue.toFixed(2)}</p>
        </div>
      </div>

      <div className="filters-container">
        <div className="search-filters">
          <input
            type="text"
            placeholder="Cerca per email cliente..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Cerca per nome evento..."
            value={searchEvent}
            onChange={(e) => setSearchEvent(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      <div className="tickets-table">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Codice</th>
              <th>Evento</th>
              <th>Email Cliente</th>
              <th>Quantità</th>
              <th>Prezzo Unit.</th>
              <th>Totale</th>
              <th>Stato</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.map(ticket => (
              <tr key={ticket.id}>
                <td data-label="Data">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                <td data-label="Codice">{ticket.ticketCode}</td>
                <td data-label="Evento">{ticket.eventName}</td>
                <td data-label="Email Cliente">{ticket.customerEmail}</td>
                <td data-label="Quantità">{ticket.quantity}</td>
                <td data-label="Prezzo Unit.">€{ticket.price?.toFixed(2) || '0.00'}</td>
                <td data-label="Totale">€{((ticket.price || 0) * (ticket.quantity || 0)).toFixed(2)}</td>
                <td data-label="Stato">
                  <span className={`status ${ticket.status}`}>
                    {ticket.validatedAt ? 'Validato' : ticket.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TicketHistory; 