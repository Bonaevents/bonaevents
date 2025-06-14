import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthorization } from '../../hooks/useAuthorization';

function PromoterEventStats({ event, teamLeaderId, onClose }) {
  const { userRole, loading: authLoading } = useAuthorization();
  const [promoterStats, setPromoterStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromoterStats() {
      try {
        // Ottieni tutti i promoter del team leader
        const promotersQuery = query(
          collection(db, 'users'),
          where('teamLeaderId', '==', teamLeaderId)
        );
        const promotersSnapshot = await getDocs(promotersQuery);
        const promoters = promotersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Ottieni le vendite per ogni promoter
        const stats = [];
        for (const promoter of promoters) {
          const ticketsQuery = query(
            collection(db, 'tickets'),
            where('eventId', '==', event.id),
            where('sellerId', '==', promoter.uid)
          );
          const ticketsSnapshot = await getDocs(ticketsQuery);
          
          const promoterSales = ticketsSnapshot.docs.reduce((acc, doc) => {
            const ticket = doc.data();
            return {
              totalTickets: acc.totalTickets + ticket.quantity,
              totalCommissions: (acc.totalCommissions || 0) + (ticket.commissionAmount || 0)
            };
          }, { totalTickets: 0, totalCommissions: 0 });

          stats.push({
            name: promoter.name,
            email: promoter.email,
            ...promoterSales
          });
        }

        setPromoterStats(stats);
        setLoading(false);
      } catch (error) {
        console.error('Errore nel recupero delle statistiche:', error);
        setLoading(false);
      }
    }

    fetchPromoterStats();
  }, [event.id, teamLeaderId]);

  return (
    <div className="modal-overlay">
      <div className="modal-content sub-statistics-modal">
        <div className="modal-header">
          <h3>Dettagli Vendite: {event.name}</h3>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        {loading || authLoading ? (
          <div className="loading">Caricamento dettagli...</div>
        ) : (
          <div className="promoter-stats">
            <table>
              <thead>
                <tr>
                  <th>Promoter</th>
                  <th>Email</th>
                  {userRole === 'admin' && <th>Biglietti Venduti</th>}
                  {userRole === 'admin' && <th>Commissioni</th>}
                </tr>
              </thead>
              <tbody>
                {promoterStats.map((stat, index) => (
                  <tr key={index}>
                    <td>{stat.name}</td>
                    <td>{stat.email}</td>
                    {userRole === 'admin' && <td>{stat.totalTickets}</td>}
                    {userRole === 'admin' && <td>€{(stat.totalCommissions || 0).toFixed(2)}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PromoterEventStats; 