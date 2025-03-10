import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FaCalendarAlt, FaChartLine, FaTicketAlt, FaHistory, FaEuroSign, FaUsers, FaQrcode } from 'react-icons/fa';
import './PromoterDashboard.css';
import SellTicketModal from '../tickets/SellTicketModal';

console.log("SONO IL PROMOTER DASHBOARD IN /dashboard");

function SalesSummaryCard({ salesData }) {
  return (
    <div className="summary-cards">
      <div className="card summary-card">
        <div className="summary-icon">
          <FaTicketAlt />
        </div>
        <div className="summary-content">
          <h3>{salesData.totalSales}</h3>
          <p>Biglietti Venduti</p>
        </div>
      </div>

      <div className="card summary-card">
        <div className="summary-icon">
          <FaEuroSign />
        </div>
        <div className="summary-content">
          <h3>€{salesData.totalRevenue}</h3>
          <p>Ricavo Totale</p>
        </div>
      </div>

      <div className="card summary-card">
        <div className="summary-icon">
          <FaUsers />
        </div>
        <div className="summary-content">
          <h3>{Object.keys(salesData.salesByEvent).length}</h3>
          <p>Eventi Venduti</p>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onSell }) {
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
        <div className="detail-item">
          <FaCalendarAlt className="icon" />
          <span>{new Date(event.date).toLocaleDateString()}</span>
        </div>
        <div className="detail-item">
          <FaEuroSign className="icon" />
          <span>{event.price} €</span>
        </div>
        <div className="detail-item">
          <FaTicketAlt className="icon" />
          <span>{event.location}</span>
        </div>
      </div>

      <button 
        className="btn btn-primary sell-button"
        onClick={() => onSell(event)}
        disabled={event.availableTickets <= 0}
      >
        {event.availableTickets > 0 ? 'Vendi Biglietti' : 'Esaurito'}
      </button>
    </div>
  );
}

function SalesHistoryCard({ sale }) {
  return (
    <div className="card sale-card">
      <div className="sale-header">
        <h4>{sale.eventName}</h4>
        <span className="sale-date">{new Date(sale.date).toLocaleDateString()}</span>
      </div>
      <div className="sale-details">
        <div className="sale-info">
          <FaTicketAlt className="icon" />
          <span>{sale.quantity} biglietti</span>
        </div>
        <div className="sale-info">
          <FaEuroSign className="icon" />
          <span>{sale.totalPrice} €</span>
        </div>
        <div className="sale-info">
          <FaQrcode className="icon" />
          <span>Codice: {sale.ticketCode}</span>
        </div>
        <div className="sale-customer">
          <small>Cliente: {sale.customerEmail}</small>
        </div>
      </div>
    </div>
  );
}

function PromoterDashboard() {
  const { currentUser } = useAuth();
  const [salesData, setSalesData] = useState({
    totalSales: 0,
    totalRevenue: 0,
    salesByEvent: {},
    monthlySales: {}
  });
  const [events, setEvents] = useState([]);
  const [recentSales, setRecentSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  async function fetchData() {
    try {
      // Recupera eventi disponibili
      const eventsQuery = query(
        collection(db, 'events'),
        where('status', '==', 'active')
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      setEvents(eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Recupera vendite del promoter
      const salesQuery = query(
        collection(db, 'sales'),
        where('promoterId', '==', currentUser.uid)
      );
      const salesSnapshot = await getDocs(salesQuery);
      
      let total = 0;
      let revenue = 0;
      const byEvent = {};
      const byMonth = {};
      const sales = [];

      salesSnapshot.docs.forEach(doc => {
        const sale = { id: doc.id, ...doc.data() };
        sales.push(sale);
        total += sale.quantity;
        revenue += sale.totalPrice;
        
        byEvent[sale.eventId] = (byEvent[sale.eventId] || 0) + sale.quantity;
        
        const month = new Date(sale.date).toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        byMonth[month] = (byMonth[month] || 0) + sale.quantity;
      });

      setSalesData({
        totalSales: total,
        totalRevenue: revenue,
        salesByEvent: byEvent,
        monthlySales: byMonth
      });

      // Ordina le vendite per data e prendi le ultime 5
      setRecentSales(
        sales.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
      );

      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei dati:', error);
      setLoading(false);
    }
  }

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard Promoter</h2>
        <div className="header-subtitle">
          <FaChartLine /> Panoramica delle vendite
        </div>
      </div>

      <SalesSummaryCard salesData={salesData} />

      <section className="dashboard-section">
        <h3><FaCalendarAlt /> Eventi Disponibili</h3>
        <div className="grid">
          {events.map(event => (
            <EventCard 
              key={event.id} 
              event={event}
              onSell={(event) => setSelectedEvent(event)}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <h3><FaHistory /> Ultime Vendite</h3>
        <div className="grid">
          {recentSales.map(sale => (
            <SalesHistoryCard key={sale.id} sale={sale} />
          ))}
        </div>
      </section>

      {selectedEvent && (
        <SellTicketModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSold={() => {
            fetchData();
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

export default PromoterDashboard; 