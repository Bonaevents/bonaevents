import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { FaTimes, FaUserTag, FaTicketAlt, FaEuroSign } from 'react-icons/fa';
import './TeamDetailsModal.css'; // Creeremo questo CSS

// Funzione helper per formattare valute
const formatCurrency = (value) => {
    return (parseFloat(value) || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

function TeamDetailsModal({ teamLeader, onClose }) {
    const [promoters, setPromoters] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // ... (fetchPromoterDetails logic) ...
         if (!teamLeader?.id) {
             setError("ID Team Leader non valido.");
             setLoading(false);
             return;
         }
 
         const fetchPromoterDetails = async () => {
             setLoading(true);
             setError(null);
             try {
                 const promotersQuery = query(
                     collection(db, 'users'),
                     where('role', '==', 'promoter'),
                     where('assignedTeamLeaderId', '==', teamLeader.id)
                 );
                 const promotersSnapshot = await getDocs(promotersQuery);
                 const promoterBaseData = promotersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
 
                 if (promoterBaseData.length === 0) {
                     setPromoters([]);
                     setLoading(false);
                     return;
                 }
 
                 const promoterIds = promoterBaseData.map(p => p.id);
                 if (promoterIds.length === 0) {
                    setPromoters([]);
                    setLoading(false);
                    return;
                 }
                 const ticketsQuery = query(collection(db, 'tickets'), where('sellerId', 'in', promoterIds));
                 const ticketsSnapshot = await getDocs(ticketsQuery);
                 const ticketsData = ticketsSnapshot.docs.map(doc => doc.data());
 
                 const promoterStats = ticketsData.reduce((acc, ticket) => {
                     const sellerId = ticket.sellerId;
                     if (!sellerId) return acc;
                     if (!acc[sellerId]) {
                         acc[sellerId] = { totalTickets: 0, totalRevenue: 0 };
                     }
                     acc[sellerId].totalTickets += (parseInt(ticket.quantity, 10) || 1);
                     acc[sellerId].totalRevenue += (parseFloat(ticket.totalPrice) || 0);
                     return acc;
                 }, {});
 
                 const detailedPromoters = promoterBaseData.map(promoter => ({
                     ...promoter,
                     totalTicketsSold: promoterStats[promoter.id]?.totalTickets || 0,
                     totalRevenue: promoterStats[promoter.id]?.totalRevenue || 0,
                 })).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
 
                 setPromoters(detailedPromoters);
 
             } catch (err) {
                 console.error(`Errore nel recupero dettagli promoter per ${teamLeader.id}:`, err);
                 setError("Impossibile caricare i dettagli dei promoter.");
             } finally {
                 setLoading(false);
             }
         };
 
         fetchPromoterDetails();

    }, [teamLeader]);

    return (
        <div className="modal-overlay team-details-modal-overlay" onClick={onClose}>
            <div className="modal-content team-details-modal-content" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close-button" onClick={onClose} title="Chiudi">
                    <FaTimes />
                </button>
                
                <h2>Dettagli Team - {teamLeader.name || 'Team Leader'}</h2>
                <p className="team-leader-info">ID: {teamLeader.id} | Email: {teamLeader.email || 'N/D'}</p>

                {loading && <div className="loading-container"><div className="loading-spinner"></div> Caricamento promoter...</div>}
                {error && <div className="error-message">{error}</div>}

                {!loading && !error && (
                  <div className="promoters-table-container modal-table-container table-responsive-wrapper">
                    {promoters.length > 0 ? (
                      <table className="promoters-table modal-table">
                          <thead>
                              <tr>
                                  <th><FaUserTag /> Promoter</th>
                                  <th>Email</th>
                                  <th><FaTicketAlt /> Biglietti Venduti</th>
                                  <th><FaEuroSign /> Incasso Lordo</th>
                              </tr>
                          </thead>
                          <tbody>
                              {promoters.map(promoter => (
                                  <tr key={promoter.id}>
                                      <td>{promoter.name || '-'}</td>
                                      <td>{promoter.email || '-'}</td>
                                      <td className="number-cell">{promoter.totalTicketsSold}</td>
                                      <td className="number-cell">€ {formatCurrency(promoter.totalRevenue)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                    ) : (
                      <p className="no-promoters-message">Nessun promoter assegnato a questo Team Leader.</p>
                    )}
                  </div>
                )}
            </div> {/* Chiusura di modal-content */} 
        </div> // Chiusura di modal-overlay
    );
}

export default TeamDetailsModal; 