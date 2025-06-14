import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FaCalendar, FaTicketAlt, FaEuroSign, FaChartLine } from 'react-icons/fa';
import './PromoterStatistics.css';

function PromoterStatistics({ promoterId, onClose }) {
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchStatistics();
  }, [promoterId]);

  async function fetchStatistics() {
    try {
      // Recupera tutte le vendite del promoter
      const salesQuery = query(
        collection(db, 'sales'),
        where('promoterId', '==', promoterId)
      );
      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Raggruppa vendite per evento con dettagli temporali
      const eventStats = sales.reduce((acc, sale) => {
        if (!acc[sale.eventId]) {
          acc[sale.eventId] = {
            eventName: sale.eventName,
            totalSales: 0,
            totalRevenue: 0,
            totalTickets: 0,
            monthlySales: {},
            dailySales: {},
            salesHistory: []
          };
        }

        const saleDate = new Date(sale.date);
        const monthKey = saleDate.toLocaleString('it-IT', { month: 'long', year: 'numeric' });
        const dayKey = saleDate.toLocaleDateString();

        // Aggiorna statistiche generali dell'evento
        acc[sale.eventId].totalSales++;
        acc[sale.eventId].totalRevenue += sale.totalPrice;
        acc[sale.eventId].totalTickets += sale.quantity;

        // Aggiorna vendite mensili
        if (!acc[sale.eventId].monthlySales[monthKey]) {
          acc[sale.eventId].monthlySales[monthKey] = {
            tickets: 0,
            revenue: 0
          };
        }
        acc[sale.eventId].monthlySales[monthKey].tickets += sale.quantity;
        acc[sale.eventId].monthlySales[monthKey].revenue += sale.totalPrice;

        // Aggiorna vendite giornaliere
        if (!acc[sale.eventId].dailySales[dayKey]) {
          acc[sale.eventId].dailySales[dayKey] = {
            tickets: 0,
            revenue: 0
          };
        }
        acc[sale.eventId].dailySales[dayKey].tickets += sale.quantity;
        acc[sale.eventId].dailySales[dayKey].revenue += sale.totalPrice;

        // Aggiungi alla cronologia vendite
        acc[sale.eventId].salesHistory.push({
          id: sale.id,
          date: sale.date,
          quantity: sale.quantity,
          totalPrice: sale.totalPrice,
          customerEmail: sale.customerEmail
        });

        return acc;
      }, {});

      setStatistics({
        eventStats,
        totalEvents: Object.keys(eventStats).length,
        totalRevenue: Object.values(eventStats).reduce((acc, event) => acc + event.totalRevenue, 0),
        totalTickets: Object.values(eventStats).reduce((acc, event) => acc + event.totalTickets, 0)
      });

      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      setLoading(false);
    }
  }

  if (loading) return <div className="loading-spinner" />;

  return (
    <div className="promoter-stats">
      <button className="close-button" onClick={onClose}>×</button>
      <div className="modal-header">
        <h3>Statistiche di {promoterId}</h3>
      </div>

      <div className="statistics-summary">
        <div className="summary-card">
          <FaTicketAlt />
          <div>
            <h4>{statistics.totalTickets}</h4>
            <p>Biglietti Totali</p>
          </div>
        </div>
        <div className="summary-card">
          <FaEuroSign />
          <div>
            <h4>€{statistics.totalRevenue.toFixed(2)}</h4>
            <p>Ricavo Totale</p>
          </div>
        </div>
        <div className="summary-card">
          <FaCalendar />
          <div>
            <h4>{statistics.totalEvents}</h4>
            <p>Eventi Venduti</p>
          </div>
        </div>
      </div>

      <div className="events-list">
        <h4>Dettagli per Evento</h4>
        {Object.entries(statistics.eventStats).map(([eventId, eventData]) => (
          <div key={eventId} className="event-stats-card">
            <div className="event-header" onClick={() => setSelectedEvent(selectedEvent === eventId ? null : eventId)}>
              <h5>{eventData.eventName}</h5>
              <div className="event-summary">
                <span>{eventData.totalTickets} biglietti</span>
                <span>€{eventData.totalRevenue.toFixed(2)}</span>
              </div>
            </div>

            {selectedEvent === eventId && (
              <div className="event-details">
                <div className="monthly-stats">
                  <h6>Vendite Mensili</h6>
                  {Object.entries(eventData.monthlySales)
                    .sort((a, b) => new Date(b[0]) - new Date(a[0]))
                    .map(([month, data]) => (
                      <div key={month} className="stat-row">
                        <span>{month}</span>
                        <span>{data.tickets} biglietti</span>
                        <span>€{data.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                </div>

                <div className="sales-history">
                  <h6>Ultime Vendite</h6>
                  {eventData.salesHistory
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5)
                    .map(sale => (
                      <div key={sale.id} className="sale-row">
                        <div>{new Date(sale.date).toLocaleDateString()}</div>
                        <div>{sale.quantity} biglietti</div>
                        <div>€{sale.totalPrice.toFixed(2)}</div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromoterStatistics; 