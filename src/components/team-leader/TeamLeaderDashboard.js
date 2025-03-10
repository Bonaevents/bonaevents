import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaTicketAlt, FaEuroSign } from 'react-icons/fa';
import Header from '../common/Header';
import './TeamLeaderDashboard.css';

function TeamLeaderDashboard() {
  const { currentUser } = useAuth();
  const [promoters, setPromoters] = useState([]);
  const [selectedPromoter, setSelectedPromoter] = useState(null);
  const [promoterStats, setPromoterStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [filteredStats, setFilteredStats] = useState(null);

  useEffect(() => {
    fetchPromoters();
  }, [currentUser]);

  useEffect(() => {
    if (promoterStats) {
      const filtered = promoterStats.filter(stat => {
        const matchesSearch = stat.eventName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesDate = !dateFilter || stat.date === dateFilter;
        return matchesSearch && matchesDate;
      });
      setFilteredStats(filtered);
    }
  }, [promoterStats, searchTerm, dateFilter]);

  async function fetchPromoters() {
    try {
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', currentUser.uid),
        where('role', '==', 'promoter')
      );
      const snapshot = await getDocs(promotersQuery);
      const promotersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromoters(promotersData);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei promoter:', error);
      setLoading(false);
    }
  }

  async function fetchPromoterStats(promoterId) {
    try {
      // Recupera tutti i biglietti venduti dal promoter
      const ticketsQuery = query(
        collection(db, 'tickets'),
        where('sellerId', '==', promoterId)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      
      // Raggruppa i biglietti per evento
      const eventStats = {};
      
      for (const doc of ticketsSnapshot.docs) {
        const ticket = doc.data();
        if (!eventStats[ticket.eventId]) {
          eventStats[ticket.eventId] = {
            eventId: ticket.eventId,
            eventName: ticket.eventName,
            totalTickets: 0,
            totalRevenue: 0,
            sales: []
          };
        }
        
        eventStats[ticket.eventId].totalTickets += ticket.quantity;
        eventStats[ticket.eventId].totalRevenue += ticket.price * ticket.quantity;
        eventStats[ticket.eventId].sales.push({
          date: ticket.createdAt,
          quantity: ticket.quantity,
          revenue: ticket.price * ticket.quantity
        });
      }

      return Object.values(eventStats);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      return [];
    }
  }

  const handlePromoterClick = async (promoter) => {
    setSelectedPromoter(promoter);
    const stats = await fetchPromoterStats(promoter.id);
    setPromoterStats(stats);
  };

  return (
    <div className="dashboard-container">
      <Header />
      <div className="team-leader-dashboard">
        <h2>I Miei Promoter</h2>
        
        <div className="promoters-grid">
          {promoters.map(promoter => (
            <div 
              key={promoter.id}
              className="promoter-card"
              onClick={() => handlePromoterClick(promoter)}
            >
              <div className="promoter-icon">
                <FaUser size={24} />
              </div>
              <h3>{promoter.name}</h3>
              <p>{promoter.email}</p>
            </div>
          ))}
        </div>

        {selectedPromoter && promoterStats && (
          <div className="stats-modal" onClick={() => setSelectedPromoter(null)}>
            <div className="stats-content" onClick={e => e.stopPropagation()}>
              <button className="close-button" onClick={() => setSelectedPromoter(null)}>×</button>
              <h3>Statistiche di {selectedPromoter.name}</h3>
              
              <div className="filters">
                <input
                  type="text"
                  placeholder="Cerca evento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="date-filter"
                />
              </div>

              <div className="stats-grid">
                {(filteredStats || promoterStats).map(stat => (
                  <div key={stat.eventId} className="event-stat-card">
                    <h4>{stat.eventName}</h4>
                    <div className="stat-row">
                      <div className="stat-item">
                        <FaTicketAlt />
                        <span>{stat.totalTickets} biglietti</span>
                      </div>
                      <div className="stat-item">
                        <FaEuroSign />
                        <span>€{stat.totalRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                    
                    <div className="sales-history">
                      <h5>Ultime vendite</h5>
                      {stat.sales.slice(-5).map((sale, index) => (
                        <div key={index} className="sale-row">
                          <span>{new Date(sale.date).toLocaleDateString()}</span>
                          <span>{sale.quantity} biglietti</span>
                          <span>€{sale.revenue.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TeamLeaderDashboard; 