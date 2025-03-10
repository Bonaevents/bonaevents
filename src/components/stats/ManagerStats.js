import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './Stats.css';

function ManagerStats({ managerId, onClose }) {
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamLeaderStats();
  }, [managerId]);

  async function fetchTeamLeaderStats() {
    try {
      // Recupera tutti i team leader assegnati a questo manager
      const teamLeadersQuery = query(
        collection(db, 'users'),
        where('managerId', '==', managerId),
        where('role', '==', 'teamLeader')
      );
      
      const teamLeadersSnapshot = await getDocs(teamLeadersQuery);
      const teamLeadersData = [];

      for (const doc of teamLeadersSnapshot.docs) {
        const teamLeader = { id: doc.id, ...doc.data() };
        
        // Recupera le vendite per questo team leader
        const salesQuery = query(
          collection(db, 'tickets'),
          where('teamLeaderId', '==', doc.id)
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

        teamLeadersData.push({
          ...teamLeader,
          totalTickets,
          totalRevenue,
          recentSales
        });
      }

      setTeamLeaders(teamLeadersData);
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
        <div className="stats-container">
          {teamLeaders.map(leader => (
            <div key={leader.id} className="leader-stats-card">
              <h3>{leader.name}</h3>
              
              <div className="stats-summary">
                <div className="stat-box">
                  <span className="stat-value">{leader.totalTickets}</span>
                  <span className="stat-label">biglietti</span>
        </div>
                <div className="stat-box">
                  <span className="stat-value">€{leader.totalRevenue.toFixed(2)}</span>
                  <span className="stat-label">incasso</span>
        </div>
      </div>

              <div className="recent-sales">
                <h4>Ultime vendite</h4>
                {leader.recentSales.map(sale => (
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
    </div>
  );
}

export default ManagerStats; 