import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../common/Header';
import SellTicketModal from '../tickets/SellTicketModal';
import TicketHistory from '../tickets/TicketHistory';
import PromoterStats from './PromoterStats';
import EventCard from '../promoter/EventCard';
import { FaTicketAlt, FaEuroSign, FaUsers, FaCalendarAlt, FaMapMarkerAlt } from 'react-icons/fa';
import './TeamLeaderDashboard.css';

function TeamLeaderDashboard() {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDateItem, setSelectedDateItem] = useState(null);
  const [showSellModal, setShowSellModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalSales: 0,
    totalCommissions: 0,
    promoterSales: 0,
    promoterCommissions: 0
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [promoters, setPromoters] = useState([]);
  const [selectedPromoter, setSelectedPromoter] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchEvents(), 
      fetchStats(), 
      fetchPromoters()
    ]).catch(error => {
        console.error("Errore caricamento dati Team Leader:", error);
        setError('Errore nel caricamento dei dati.');
    }).finally(() => {
        setLoading(false);
    });
  }, [currentUser]);

  const fetchEvents = async () => {
    try {
      const eventsRef = collection(db, 'events');
      const q = query(eventsRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);
      const eventsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      .filter(event => event.eventDates && event.eventDates.length > 0);
      
      setEvents(eventsData);
    } catch (error) {
      console.error('Errore nel caricamento degli eventi:', error);
      setError('Errore nel caricamento degli eventi');
      throw error;
    }
  };

  const fetchStats = async () => {
    try {
      const leaderTicketsQuery = query(
        collection(db, 'tickets'),
        where('sellerId', '==', currentUser.uid)
      );
      const leaderSnapshot = await getDocs(leaderTicketsQuery);
      let leaderSales = 0;
      let leaderCommissions = 0;
      leaderSnapshot.forEach(doc => {
        const ticket = doc.data();
        leaderSales += ticket.quantity || 0;
        leaderCommissions += ticket.commissionAmount || 0;
      });

      const promotersSnapshot = await getDocs(query(collection(db, 'users'), where('teamLeaderId', '==', currentUser.uid)));
      const promoterIds = promotersSnapshot.docs.map(doc => doc.id);

      let teamSales = 0;
      let teamCommissions = 0;
      if (promoterIds.length > 0) {
        const teamTicketsQuery = query(
          collection(db, 'tickets'),
          where('sellerId', 'in', promoterIds)
        );
        const teamSnapshot = await getDocs(teamTicketsQuery);
        teamSnapshot.forEach(doc => {
          const ticket = doc.data();
          teamSales += ticket.quantity || 0;
          teamCommissions += ticket.commissionAmount || 0;
        });
      }

      setStats({
        totalSales: leaderSales + teamSales,
        totalCommissions: leaderCommissions + teamCommissions,
        promoterSales: teamSales,
        promoterCommissions: teamCommissions
      });
    } catch (error) {
      console.error('Errore nel recupero delle statistiche TL:', error);
      setError('Errore nel calcolo delle statistiche.');
      throw error;
    }
  };

  const fetchPromoters = async () => {
    try {
      const promotersRef = collection(db, 'users');
      const q = query(
        promotersRef,
        where('teamLeaderId', '==', currentUser.uid),
        where('role', '==', 'promoter')
      );
      const querySnapshot = await getDocs(q);
      
      const promotersData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const promoterData = doc.data();
        
        const ticketsRef = collection(db, 'tickets');
        const promoterTicketsQuery = query(
          ticketsRef,
          where('sellerId', '==', doc.id)
        );
        
        const ticketsSnapshot = await getDocs(promoterTicketsQuery);
        let totalSales = 0;
        let totalCommissions = 0;
        
        ticketsSnapshot.forEach(ticketDoc => {
          const ticket = ticketDoc.data();
          totalSales += ticket.quantity || 0;
          totalCommissions += ticket.commissionAmount || 0;
        });

        return {
          id: doc.id,
          ...promoterData,
          totalSales,
          totalCommissions
        };
      }));
      
      setPromoters(promotersData);
    } catch (error) {
      console.error('Errore nel caricamento dei promoter:', error);
      setError("Errore caricamento promoter.");
      throw error;
    }
  };

  const handleSellTicket = (event, dateItem) => {
    if (!event || !dateItem) {
        console.error("Tentativo di vendita senza evento o data valida", event, dateItem);
        setError("Errore interno: evento o data non validi per la vendita.");
        return;
    }
    setSelectedEvent(event);
    setSelectedDateItem(dateItem);
  };

  const handleModalClose = () => {
    setSelectedEvent(null);
    setSelectedDateItem(null);
  };

  const handleTicketSold = () => {
    fetchStats();
    handleModalClose();
  };

  const handlePromoterClick = (promoter) => {
    setSelectedPromoter(promoter);
  };

  const handleClosePromoterStats = () => {
    setSelectedPromoter(null);
  };

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div>Caricamento dashboard...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="team-leader-dashboard">
      <Header />
      <div className="dashboard-header">
        <h1 className="header-title">Dashboard Team Leader</h1>
        <p className="header-subtitle">Gestisci il tuo team e monitora le vendite</p>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab-button ${activeTab === 'sell' ? 'active' : ''}`}
          onClick={() => setActiveTab('sell')}
        >
          Vendi Biglietti
        </button>
        <button
          className={`tab-button ${activeTab === 'promoters' ? 'active' : ''}`}
          onClick={() => setActiveTab('promoters')}
        >
          I Miei Promoter
        </button>
        <button
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Storico Vendite
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'dashboard' && (
          <div className="dashboard-overview">
            <div className="stats-overview">
              <div className="stat-card">
                <FaTicketAlt />
                <div>
                  <h3>Biglietti Totali (Team)</h3>
                  <p>{stats.totalSales}</p>
                </div>
              </div>
              <div className="stat-card">
                <FaEuroSign />
                <div>
                  <h3>Commissioni Totali (Team)</h3>
                  <p>€ {stats.totalCommissions.toFixed(2)}</p>
                </div>
              </div>
              <div className="stat-card">
                <FaUsers />
                <div>
                  <h3>Vendite Promoter</h3>
                  <p>{stats.promoterSales}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sell' && (
          <div className="sell-tickets-container">
            <h2>Seleziona un Evento e una Data per la Vendita</h2>
            <div className="events-grid promoter-events-grid">
              {events.length > 0 ? (
                events.map((event) => (
                  <EventCard 
                    key={event.id} 
                    event={event} 
                    onSell={handleSellTicket}
                  />
                ))
              ) : (
                <p>Nessun evento disponibile per la vendita al momento.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'promoters' && (
          <div className="promoters-section">
            <h2>I Miei Promoter</h2>
            <div className="promoters-grid">
              {promoters.map(promoter => (
                <div 
                  key={promoter.id} 
                  className="promoter-card"
                  onClick={() => handlePromoterClick(promoter)}
                >
                  <div className="promoter-header">
                    <div className="avatar-circle">
                      {promoter.name?.charAt(0)?.toUpperCase() || 'P'}
                    </div>
                    <div className="promoter-info">
                      <h3>{promoter.name}</h3>
                      <p>{promoter.email}</p>
                    </div>
                  </div>
                  <div className="promoter-stats">
                    <div className="stat-item">
                      <div className="stat-label">Vendite Totali</div>
                      <div className="stat-value">{promoter.totalSales}</div>
                    </div>
                    <div className="stat-item">
                      <div className="stat-label">Commissioni Totali</div>
                      <div className="stat-value">€{promoter.totalCommissions.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <TicketHistory userId={currentUser.uid} showSellerFilter={true} />
        )}
      </div>

      {selectedEvent && selectedDateItem && (
        <SellTicketModal
          event={selectedEvent}
          selectedDateItem={selectedDateItem}
          onClose={handleModalClose}
          onSold={handleTicketSold}
        />
      )}

      {selectedPromoter && (
        <PromoterStats
          promoter={selectedPromoter}
          onClose={handleClosePromoterStats}
        />
      )}
    </div>
  );
}

export default TeamLeaderDashboard; 