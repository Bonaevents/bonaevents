import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import CreatePromoter from '../auth/CreatePromoter';
import { notifyPromoter } from '../../services/NotificationService';
import PromoterStatistics from '../statistics/PromoterStatistics';
import { FaUserPlus, FaUsers, FaUser, FaChartBar, FaCalendarAlt, FaToggleOn, FaToggleOff, FaUserMinus, FaTicketAlt, FaEuroSign } from 'react-icons/fa';
import Header from '../common/Header';
import './TeamLeaderDashboard.css';

function PromoterCard({ promoter, onStatusChange, onRemove }) {
  return (
    <div className="promoter-card">
      <div className="promoter-icon">
        <FaUser size={24} />
      </div>
      <div className="promoter-info">
        <h3>{promoter.name}</h3>
        <p>{promoter.email}</p>
        <div className="promoter-stats">
          <div className="stat">
            <FaTicketAlt />
            <span>Biglietti: {promoter.totalTickets || 0}</span>
          </div>
          <div className="stat">
            <FaEuroSign />
            <span>Incasso: €{(promoter.totalRevenue || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AvailablePromoterCard({ promoter, onAdd }) {
  return (
    <div className="card available-promoter-card">
      <div className="card-header">
        <div className="header-content">
          <FaUser className="promoter-icon" />
          <div>
            <h4>{promoter.name}</h4>
            <span className="email">{promoter.email}</span>
          </div>
        </div>
      </div>
      <button
        className="btn btn-success"
        onClick={() => onAdd(promoter.id)}
      >
        <FaUserPlus /> Aggiungi al Team
      </button>
    </div>
  );
}

function EventCard({ event }) {
  return (
    <div className="card event-card">
      <div className="card-header">
        <h4>{event.name}</h4>
        <div className="event-status">
          <span className={`badge ${event.availableTickets > 0 ? 'badge-success' : 'badge-danger'}`}>
            {event.availableTickets} biglietti disponibili
          </span>
        </div>
      </div>
      <div className="event-details">
        <p><strong>Data:</strong> {new Date(event.date).toLocaleDateString()}</p>
        <p><strong>Luogo:</strong> {event.location}</p>
        <p><strong>Prezzo:</strong> €{event.price}</p>
      </div>
    </div>
  );
}

async function fetchPromoterStats(promoterId) {
  const ticketsQuery = query(
    collection(db, 'tickets'),
    where('sellerId', '==', promoterId)
  );
  const ticketsSnapshot = await getDocs(ticketsQuery);
  
  let totalTickets = 0;
  let totalRevenue = 0;
  const eventStats = {};

  ticketsSnapshot.forEach(doc => {
    const ticket = doc.data();
    totalTickets += ticket.quantity || 0;
    totalRevenue += ticket.totalPrice || 0;

    if (!eventStats[ticket.eventId]) {
      eventStats[ticket.eventId] = {
        eventId: ticket.eventId,
        eventName: ticket.eventName,
        totalTickets: 0,
        totalRevenue: 0,
        sales: []
      };
    }

    eventStats[ticket.eventId].totalTickets += ticket.quantity || 0;
    eventStats[ticket.eventId].totalRevenue += ticket.totalPrice || 0;
    eventStats[ticket.eventId].sales.push({
      date: ticket.createdAt,
      quantity: ticket.quantity,
      revenue: ticket.totalPrice
    });
  });

  return {
    totals: { totalTickets, totalRevenue },
    eventStats: Object.values(eventStats)
  };
}

function TeamLeaderDashboard() {
  const { currentUser } = useAuth();
  const [promoters, setPromoters] = useState([]);
  const [availablePromoters, setAvailablePromoters] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePromoter, setShowCreatePromoter] = useState(false);
  const [selectedPromoter, setSelectedPromoter] = useState(null);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [promoterStats, setPromoterStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const handlePromoterClick = async (promoter) => {
    setSelectedPromoter(promoter);
    const stats = await fetchPromoterStats(promoter.id);
    setPromoterStats(stats);
  };

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  async function fetchData() {
    try {
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', currentUser.uid),
        where('role', '==', 'promoter')
      );
      const promotersSnapshot = await getDocs(promotersQuery);
      
      const promotersData = await Promise.all(promotersSnapshot.docs.map(async (doc) => {
        const promoter = {
          id: doc.id,
          ...doc.data()
        };

        const stats = await fetchPromoterStats(promoter.id);
        return {
          ...promoter,
          totalTickets: stats.totals.totalTickets,
          totalRevenue: stats.totals.totalRevenue
        };
      }));

      setPromoters(promotersData);

      // Recupera promoter disponibili (senza team)
      const availablePromQuery = query(
        collection(db, 'users'),
        where('role', '==', 'promoter'),
        where('status', '!=', 'deleted'),
        where('teamLeaderId', '==', '')
      );
      const availablePromSnapshot = await getDocs(availablePromQuery);
      setAvailablePromoters(availablePromSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Recupera eventi
      const eventsQuery = query(collection(db, 'events'));
      const eventsSnapshot = await getDocs(eventsQuery);
      setEvents(eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }

  async function handlePromoterStatusChange(promoterId, newStatus) {
    try {
      const promoterRef = doc(db, 'users', promoterId);
      await updateDoc(promoterRef, {
        status: newStatus
      });

      await notifyPromoter(promoterId,
        'Cambio stato account',
        `Il tuo account è stato ${newStatus === 'active' ? 'attivato' : 'disattivato'}`
      );

      fetchData();
    } catch (error) {
      console.error('Errore nel cambio di stato del promoter:', error);
    }
  }

  async function handleAddPromoterToTeam(promoterId) {
    try {
      const promoterRef = doc(db, 'users', promoterId);
      await updateDoc(promoterRef, {
        teamLeaderId: currentUser.uid
      });

      await notifyPromoter(promoterId,
        'Aggiunto al team',
        'Sei stato aggiunto a un nuovo team'
      );

      fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiunta del promoter al team:', error);
    }
  }

  async function handleRemovePromoterFromTeam(promoterId) {
    try {
      const promoterRef = doc(db, 'users', promoterId);
      await updateDoc(promoterRef, {
        teamLeaderId: ''
      });

      await notifyPromoter(promoterId,
        'Rimosso dal team',
        'Sei stato rimosso dal team'
      );

      fetchData();
    } catch (error) {
      console.error('Errore nella rimozione del promoter dal team:', error);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container fade-in">
      <Header />
      <div className="team-leader-dashboard">
        <h2>I Miei Promoter</h2>
        
        <div className="leaders-grid">
          {promoters.map(promoter => (
            <div 
              key={promoter.id}
              className="leader-card"
              onClick={() => handlePromoterClick(promoter)}
            >
              <div className="leader-icon">
                <FaUser size={24} />
              </div>
              <h3>{promoter.name}</h3>
              <p>{promoter.email}</p>
              <div className="leader-stats">
                <div className="stat">
                  <FaTicketAlt />
                  <span>{promoter.totalTickets || 0} Biglietti</span>
                </div>
                <div className="stat">
                  <FaEuroSign />
                  <span>€ {(promoter.totalRevenue || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {selectedPromoter && promoterStats && (
          <div className="modal">
            <div className="modal-content">
              <div className="modal-header">
                <h3>{selectedPromoter.name} - Statistiche Dettagliate</h3>
                <button className="close-button" onClick={() => setSelectedPromoter(null)}>×</button>
              </div>
              <div className="stats-summary">
                <div className="summary-stat">
                  <FaTicketAlt className="stat-icon" />
                  <div className="stat-info">
                    <h3>Biglietti Totali</h3>
                    <p className="stat-value">{promoterStats.totals.totalTickets}</p>
                  </div>
                </div>
                <div className="summary-stat">
                  <FaEuroSign className="stat-icon" />
                  <div className="stat-info">
                    <h3>Incasso Totale</h3>
                    <p className="stat-value">€{promoterStats.totals.totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
              </div>
              <div className="stats-grid">
                {promoterStats.eventStats.map(stat => (
                  <div key={stat.eventId} className="event-stat-card fade-in">
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
                        <div key={index} className="sale-row slide-in">
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