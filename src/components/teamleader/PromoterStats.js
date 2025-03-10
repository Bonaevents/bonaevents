import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import './TeamLeaderStyles.css';

function PromoterStats({ promoter, onClose }) {
  const [eventStats, setEventStats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromoterStats() {
      try {
        // Ottieni tutti i biglietti venduti dal promoter
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('sellerId', '==', promoter.uid)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);

        // Raggruppa i biglietti per evento
        const eventSales = {};
        
        for (const doc of ticketsSnapshot.docs) {
          const ticket = doc.data();
          if (!eventSales[ticket.eventId]) {
            // Ottieni i dettagli dell'evento
            const eventDoc = await getDocs(
              query(collection(db, 'events'), where('id', '==', ticket.eventId))
            );
            const eventData = eventDoc.docs[0]?.data() || {};
            
            eventSales[ticket.eventId] = {
              eventName: ticket.eventName,
              eventDate: ticket.eventDate,
              totalTickets: 0,
              totalRevenue: 0,
              commission: 0
            };
          }
          
          eventSales[ticket.eventId].totalTickets += ticket.quantity;
          eventSales[ticket.eventId].totalRevenue += ticket.totalPrice;
          eventSales[ticket.eventId].commission += ticket.commission || 0;
        }

        setEventStats(Object.values(eventSales));
        setLoading(false);
      } catch (error) {
        console.error('Errore nel recupero delle statistiche:', error);
        setLoading(false);
      }
    }

    fetchPromoterStats();
  }, [promoter.uid]);

  return (
    <div className="modal-overlay">
      <div className="modal-content statistics-modal">
        <div className="modal-header">
          <h2>Statistiche Promoter: {promoter.name}</h2>
          <button className="close-button" onClick={onClose}>&times;</button>
        </div>

        {loading ? (
          <div className="loading">Caricamento statistiche...</div>
        ) : (
          <div className="statistics-content">
            <div className="promoter-summary">
              <p><strong>Email:</strong> {promoter.email}</p>
              <p><strong>Totale Eventi:</strong> {eventStats.length}</p>
              <p><strong>Totale Biglietti Venduti:</strong> {
                eventStats.reduce((acc, stat) => acc + stat.totalTickets, 0)
              }</p>
              <p><strong>Incasso Totale:</strong> €{
                eventStats.reduce((acc, stat) => acc + stat.totalRevenue, 0).toFixed(2)
              }</p>
            </div>

            <h3>Vendite per Evento</h3>
            {eventStats.length > 0 ? (
              <div className="events-stats-table">
                <table>
                  <thead>
                    <tr>
                      <th>Evento</th>
                      <th>Data</th>
                      <th>Biglietti</th>
                      <th>Incasso</th>
                      <th>Commissione</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventStats.map((stat, index) => (
                      <tr key={index}>
                        <td>{stat.eventName}</td>
                        <td>{new Date(stat.eventDate).toLocaleDateString()}</td>
                        <td>{stat.totalTickets}</td>
                        <td>€{stat.totalRevenue.toFixed(2)}</td>
                        <td>€{stat.commission.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">Nessuna vendita registrata per questo promoter.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default PromoterStats; 