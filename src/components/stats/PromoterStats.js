import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './Stats.css';

function PromoterStats({ promoterId }) {
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    recentSales: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [promoterId]);

  async function fetchStats() {
    try {
      // Recupera i biglietti venduti
      const ticketsQuery = query(
        collection(db, 'tickets'),
        where('sellerId', '==', promoterId)
      );
      const ticketsSnapshot = await getDocs(ticketsQuery);
      
      let totalTickets = 0;
      let totalRevenue = 0;
      let totalCommissions = 0;
      const recentSales = [];

      ticketsSnapshot.forEach(doc => {
        const ticket = doc.data();
        totalTickets++;
        totalRevenue += ticket.price;
        totalCommissions += ticket.commission;
        recentSales.push({
          id: doc.id,
          ...ticket,
          date: new Date(ticket.createdAt).toLocaleDateString()
        });
      });

      setStats({
        totalTickets,
        totalRevenue,
        totalCommissions,
        recentSales: recentSales.sort((a, b) => b.createdAt - a.createdAt).slice(0, 10)
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  }

  if (loading) return <div>Caricamento statistiche...</div>;

  return (
    <div className="stats-container">
      <div className="stats-summary">
        <div className="stat-card">
          <h3>Biglietti Venduti</h3>
          <p className="stat-value">{stats.totalTickets}</p>
        </div>
        <div className="stat-card">
          <h3>Ricavo Totale</h3>
          <p className="stat-value">€{stats.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="stat-card">
          <h3>Commissioni Totali</h3>
          <p className="stat-value">€{stats.totalCommissions.toFixed(2)}</p>
        </div>
      </div>

      <div className="recent-sales">
        <h3>Vendite Recenti</h3>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Evento</th>
              <th>Prezzo</th>
              <th>Commissione</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentSales.map(sale => (
              <tr key={sale.id}>
                <td>{sale.date}</td>
                <td>{sale.eventName}</td>
                <td>€{sale.price}</td>
                <td>€{sale.commission}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PromoterStats; 