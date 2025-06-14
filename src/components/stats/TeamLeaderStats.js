import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './Stats.css';
import { FaTicketAlt, FaEuroSign } from 'react-icons/fa';
import { useAuthorization } from '../../hooks/useAuthorization';

function TeamLeaderStats({ teamLeaderId, onClose }) {
  const { userRole, loading: authLoading } = useAuthorization();
  const [promoters, setPromoters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    totalCommissions: 0
  });

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
      
      let overallTotalTickets = 0;
      let overallTotalRevenue = 0;
      let overallTotalCommissions = 0;

      // Per ogni promoter, recupera le statistiche di vendita
      const promotersData = await Promise.all(promotersSnapshot.docs.map(async (doc) => {
        const promoter = {
          id: doc.id,
          ...doc.data()
        };

        // Recupera i biglietti venduti da questo promoter
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('sellerId', '==', promoter.id)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);
        
        let promoterTotalTickets = 0;
        let promoterTotalRevenue = 0;
        let promoterTotalCommissions = 0;

        ticketsSnapshot.forEach(ticket => {
          const ticketData = ticket.data();
          promoterTotalTickets += ticketData.quantity || 0;
          promoterTotalRevenue += ticketData.price * (ticketData.quantity || 0);
          promoterTotalCommissions += ticketData.commissionAmount || 0;
        });

        overallTotalTickets += promoterTotalTickets;
        overallTotalRevenue += promoterTotalRevenue;
        overallTotalCommissions += promoterTotalCommissions;

        return {
          ...promoter,
          totalTickets: promoterTotalTickets,
          totalRevenue: promoterTotalRevenue,
          totalCommissions: promoterTotalCommissions
        };
      }));

      setTotals({
        totalTickets: overallTotalTickets,
        totalRevenue: overallTotalRevenue,
        totalCommissions: overallTotalCommissions
      });
      setPromoters(promotersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching promoter stats:', error);
      setLoading(false);
    }
  }

  if (loading || authLoading) {
    return <div className="loading">Caricamento statistiche...</div>;
  }

  return (
    <div className="stats-container">
      <div className="stats-summary">
        {/* {userRole === 'admin' && ( */} 
          <div className="stat-box">
            <FaTicketAlt className="stat-icon" />
            <div className="stat-info">
              <h3>Totale Biglietti Venduti</h3>
              <p className="stat-value">{totals.totalTickets}</p>
            </div>
          </div>
        {/* )} */} 
        {userRole === 'admin' && ( // Manteniamo Commissioni Totali Team (solo admin)
          <div className="stat-box">
            <div className="stat-info">
              <h3>Commissioni Totali Team</h3>
              <p className="stat-value">€{totals.totalCommissions.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="promoters-list">
        <h3>Dettaglio Promoter</h3>
        {promoters.map(promoter => (
          <div key={promoter.id} className="promoter-stats-card">
            <h4>{promoter.name || promoter.email}</h4>
            <div className="promoter-stats">
              {/* {userRole === 'admin' && ( */} 
                <p>Biglietti venduti: {promoter.totalTickets}</p>
              {/* )} */} 
              {userRole === 'admin' && ( // Manteniamo Commissioni promoter (solo admin)
                <p>Commissioni: €{promoter.totalCommissions.toFixed(2)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamLeaderStats; 