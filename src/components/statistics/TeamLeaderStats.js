import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './TeamLeaderStatistics.css';

function TeamLeaderStats({ teamLeader, onClose }) {
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    recentSales: [],
    eventStats: [],
    promoters: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamLeaderStats();
  }, [teamLeader.id]);

  async function fetchTeamLeaderStats() {
    try {
      // Recupera tutti i promoter di questo team leader
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', teamLeader.id),
        where('role', '==', 'promoter')
      );
      
      const promotersSnapshot = await getDocs(promotersQuery);
      const promoters = promotersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Recupera tutte le vendite dei promoter di questo team
      const promoterIds = promoters.map(p => p.id);
      const salesQuery = query(
          collection(db, 'tickets'),
          where('sellerId', 'in', promoterIds)
        );
      
      const salesSnapshot = await getDocs(salesQuery);
      const sales = salesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Calcola statistiche generali
      const totalTickets = sales.reduce((acc, sale) => acc + (sale.quantity || 0), 0);
      const totalRevenue = sales.reduce((acc, sale) => acc + ((sale.price || 0) * (sale.quantity || 0)), 0);

      // Calcola statistiche per evento
      const eventStatsMap = sales.reduce((acc, sale) => {
        const eventId = sale.eventId;
        if (!acc[eventId]) {
          acc[eventId] = {
            eventId,
            eventName: sale.eventName,
            totalTickets: 0,
            totalRevenue: 0,
            sales: []
          };
        }
        acc[eventId].totalTickets += sale.quantity || 0;
        acc[eventId].totalRevenue += (sale.price || 0) * (sale.quantity || 0);
        acc[eventId].sales.push(sale);
        return acc;
      }, {});

      // Converti la mappa in array e ordina per ricavo
      const eventStats = Object.values(eventStatsMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      setStats({
        totalTickets,
        totalRevenue,
        recentSales: sales
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5),
        eventStats,
        promoters
      });
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      setLoading(false);
    }
  }

  if (loading) return <div>Caricamento statistiche...</div>;

  return (
    <div className="stats-modal-overlay">
      <div className="stats-modal-content">
        <button className="close-button" onClick={onClose}>×</button>
        <div className="team-leader-stats">
          <h3>{teamLeader.name}</h3>
          
          <div className="stats-summary">
            <div className="stat-box">
              <span className="stat-label">Biglietti Venduti</span>
              <span className="stat-value">{stats.totalTickets}</span>
        </div>
            <div className="stat-box">
              <span className="stat-label">Incasso Totale</span>
              <span className="stat-value">€{stats.totalRevenue.toFixed(2)}</span>
            </div>
            </div>

          <div className="events-stats">
            <h4>Vendite per Evento</h4>
            {stats.eventStats.map(event => (
              <div key={event.eventId} className="event-stat-card">
                <div className="event-stat-header">
                  <h5>{event.eventName}</h5>
                  <div className="event-totals">
                    <span>{event.totalTickets} biglietti</span>
                    <span>€{event.totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
            </div>

          <div className="recent-sales">
            <h4>Ultime vendite</h4>
            {stats.recentSales.map(sale => (
              <div key={sale.id} className="sale-row">
                <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                <span>{sale.eventName}</span>
                <span>{sale.quantity} biglietti</span>
                <span>€{((sale.price || 0) * (sale.quantity || 0)).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamLeaderStats; 