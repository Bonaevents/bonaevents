import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './Stats.css';

function TeamLeaderStats({ teamLeaderId, onClose }) {
  const [promoters, setPromoters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromoterStats();
  }, [teamLeaderId]);

  async function fetchPromoterStats() {
    try {
      // Recupera tutti i promoter assegnati a questo team leader
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', teamLeaderId),
        where('role', '==', 'promoter')
      );
      
      const promotersSnapshot = await getDocs(promotersQuery);
      const promotersData = [];

      for (const doc of promotersSnapshot.docs) {
        const promoter = { id: doc.id, ...doc.data() };
        
        // Recupera le vendite per questo promoter
        const salesQuery = query(
          collection(db, 'tickets'),
          where('sellerId', '==', doc.id)
        );
        
        const salesSnapshot = await getDocs(salesQuery);
        const sales = salesSnapshot.docs.map(sale => ({
          id: sale.id,
          ...sale.data()
        }));

        // Calcola le statistiche
        const totalTickets = sales.reduce((acc, sale) => acc + (sale.quantity || 0), 0);
        const totalRevenue = sales.reduce((acc, sale) => acc + ((sale.price || 0) * (sale.quantity || 0)), 0);

        // Prendi solo le ultime 5 vendite, ordinate per data
        const recentSales = sales
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);

        promotersData.push({
          ...promoter,
          totalTickets,
          totalRevenue,
          recentSales
        });
      }

      setPromoters(promotersData);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      setLoading(false);
    }
  }

  if (loading) return <div>Caricamento statistiche...</div>;

  return (
    <div className="team-leader-stats">
      <button className="close-button" onClick={onClose}>×</button>
      <div className="stats-container">
        {promoters.map(promoter => (
          <div key={promoter.id} className="leader-stats-card">
            <h3>{promoter.name}</h3>
            
            <div className="stats-summary">
              <div className="stat-box">
                <span className="stat-value">{promoter.totalTickets}</span>
                <span className="stat-label">biglietti</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">€{promoter.totalRevenue.toFixed(2)}</span>
                <span className="stat-label">incasso</span>
              </div>
            </div>

            <div className="recent-sales">
              <h4>Ultime vendite</h4>
              {promoter.recentSales.map(sale => (
                <div key={sale.id} className="sale-row">
                  <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
                  <span>{sale.quantity} biglietti</span>
                  <span>€{((sale.price || 0) * (sale.quantity || 0)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamLeaderStats; 