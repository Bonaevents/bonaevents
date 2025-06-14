import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import TicketViewer from './TicketViewer';
import { IoCalendarOutline, IoPeopleOutline, IoTicketOutline, IoCashOutline } from 'react-icons/io5';
import './PromoterDashboard.css';

const PromoterDashboard = () => {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalTickets: 0,
    totalRevenue: 0,
    totalCustomers: 0
  });

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventsRef = collection(db, 'events');
        const q = query(eventsRef, where('status', '==', 'active'));
        const querySnapshot = await getDocs(q);
        
        const eventsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setEvents(eventsData);
        
        // Calcola le statistiche
        const ticketsRef = collection(db, 'tickets');
        const ticketsSnapshot = await getDocs(ticketsRef);
        
        const totalTickets = ticketsSnapshot.size;
        const totalRevenue = ticketsSnapshot.docs.reduce((sum, doc) => {
          const ticket = doc.data();
          return sum + (parseFloat(ticket.price) || 0);
        }, 0);
        
        const uniqueCustomers = new Set(ticketsSnapshot.docs.map(doc => doc.data().customerId)).size;
        
        setStats({
          totalEvents: eventsData.length,
          totalTickets,
          totalRevenue,
          totalCustomers: uniqueCustomers
        });
      } catch (err) {
        console.error('Errore nel recupero degli eventi:', err);
        setError('Errore nel caricamento degli eventi');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="promoter-dashboard-loading">Caricamento dashboard...</div>;
  }

  if (error) {
    return <div className="promoter-dashboard-error">{error}</div>;
  }

  return (
    <div className="promoter-dashboard">
      <div className="dashboard-header">
        <h1>Dashboard Promoter</h1>
        <div className="stats-grid">
          <div className="stat-card">
            <IoCalendarOutline size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.totalEvents}</span>
              <span className="stat-label">Eventi Attivi</span>
            </div>
          </div>
          <div className="stat-card">
            <IoTicketOutline size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.totalTickets}</span>
              <span className="stat-label">Biglietti Venduti</span>
            </div>
          </div>
          <div className="stat-card">
            <IoCashOutline size={24} />
            <div className="stat-info">
              <span className="stat-value">€{stats.totalRevenue.toFixed(2)}</span>
              <span className="stat-label">Incasso Totale</span>
            </div>
          </div>
          <div className="stat-card">
            <IoPeopleOutline size={24} />
            <div className="stat-info">
              <span className="stat-value">{stats.totalCustomers}</span>
              <span className="stat-label">Clienti Unici</span>
            </div>
          </div>
        </div>
      </div>

      <div className="events-section">
        <h2>Seleziona un Evento</h2>
        <div className="events-grid">
          {events.map(event => (
            <div
              key={event.id}
              className={`event-card ${selectedEvent?.id === event.id ? 'selected' : ''}`}
              onClick={() => setSelectedEvent(event)}
            >
              <h3>{event.name}</h3>
              <p>{event.location}</p>
              <p>{new Date(event.date.seconds * 1000).toLocaleDateString('it-IT')}</p>
            </div>
          ))}
        </div>
      </div>

      {selectedEvent && (
        <div className="tickets-section">
          <TicketViewer eventId={selectedEvent.id} />
        </div>
      )}
    </div>
  );
};

export default PromoterDashboard; 