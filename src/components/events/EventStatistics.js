import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './EventStatistics.css';
import { useAuthorization } from '../../hooks/useAuthorization';

function EventStatistics({ event, onClose }) {
  const { userRole, loading: authLoading } = useAuthorization();
  const [promoterStats, setPromoterStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEventStats() {
      try {
        // Query per ottenere tutti i biglietti venduti per questo evento
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('eventId', '==', event.id)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);

        // Raggruppa i biglietti per promoter
        const promoterSales = {};
        
        for (const doc of ticketsSnapshot.docs) {
          const ticket = doc.data();
          if (!promoterSales[ticket.sellerId]) {
            // Ottieni i dettagli del promoter
            const promoterDoc = await getDocs(
              query(collection(db, 'users'), where('uid', '==', ticket.sellerId))
            );
            const promoterData = promoterDoc.docs[0]?.data() || {};
            
            promoterSales[ticket.sellerId] = {
              name: promoterData.name || 'N/A',
              email: promoterData.email || 'N/A',
              totalTickets: 0,
              totalCommissions: 0
            };
          }
          
          promoterSales[ticket.sellerId].totalTickets += ticket.quantity;
          promoterSales[ticket.sellerId].totalCommissions += ticket.commissionAmount || 0;
        }

        setPromoterStats(Object.values(promoterSales));
        setLoading(false);
      } catch (error) {
        console.error('Errore nel recupero delle statistiche:', error);
        setLoading(false);
      }
    }

    fetchEventStats();
  }, [event.id]);

  return (
    <div className="modal-overlay">
      <div className="modal-content statistics-modal">
        <div className="modal-header">
          <h2>Statistiche Evento: {event.name}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        {loading || authLoading ? (
          <div className="loading">Caricamento statistiche...</div>
        ) : (
          <div className="statistics-content">
            <div className="event-summary">
              <p><strong>Data:</strong> {new Date(event.date).toLocaleDateString()}</p>
              <p><strong>Luogo:</strong> {event.location}</p>
              <p><strong>Prezzo:</strong> €{event.price}</p>
              {/* {userRole === 'admin' && */} <p><strong>Biglietti Venduti:</strong> {event.soldTickets || 0}</p> {/* } */}
              <p><strong>Biglietti Disponibili:</strong> {event.availableTickets}</p>
            </div>

            <h3>Vendite per Promoter</h3>
            {promoterStats.length > 0 ? (
              <div className="promoter-stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>Promoter</th>
                      <th>Email</th>
                      {/* {userRole === 'admin' && */} <th>Biglietti Venduti</th> {/* } */}
                      {userRole === 'admin' && <th>Commissioni Totali</th>} {/* Sostituisci Incasso */}
                    </tr>
                  </thead>
                  <tbody>
                    {promoterStats.map((stat, index) => (
                      <tr key={index}>
                        <td>{stat.name}</td>
                        <td>{stat.email}</td>
                        {/* {userRole === 'admin' && */} <td>{stat.totalTickets}</td> {/* } */}
                        {userRole === 'admin' && <td>€{(stat.totalCommissions || 0).toFixed(2)}</td>} {/* Mostra commissioni */}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">Nessuna vendita registrata per questo evento.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventStatistics; 