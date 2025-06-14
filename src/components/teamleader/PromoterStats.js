import { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { FaSearch, FaTimes } from 'react-icons/fa';
import './TeamLeaderStyles.css';

function PromoterStats({ promoter, onClose }) {
  const [eventStats, setEventStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedEventDetails, setSelectedEventDetails] = useState(null);

  useEffect(() => {
    async function fetchPromoterStats() {
      setLoading(true);
      try {
        const ticketsQuery = query(
          collection(db, 'tickets'),
          where('sellerId', '==', promoter.uid)
        );
        const ticketsSnapshot = await getDocs(ticketsQuery);

        const eventSales = {};
        
        for (const ticketDoc of ticketsSnapshot.docs) {
          const ticket = ticketDoc.data();
          const eventId = ticket.eventId;

          if (!eventId) continue;

          if (!eventSales[eventId]) {
            let eventName = ticket.eventName || 'Evento Sconosciuto';
            let eventDate = ticket.eventDate;
            try {
                const eventRef = doc(db, 'events', eventId);
                const eventSnap = await getDoc(eventRef);
                if (eventSnap.exists()) {
                    eventName = eventSnap.data().name || eventName;
                }
            } catch (eventError) {
                console.warn(`Impossibile recuperare dettagli evento ${eventId}:`, eventError);
            }
            
            eventSales[eventId] = {
              eventId: eventId,
              eventName: eventName,
              eventDate: eventDate,
              totalTickets: 0,
              totalRevenue: 0,
              commission: 0,
              ticketTypes: {}
            };
          }
          
          const commission = ticket.commission ?? ticket.commissionAmount ?? 0;
          eventSales[eventId].totalTickets += ticket.quantity || 0;
          eventSales[eventId].totalRevenue += ticket.totalPrice || 0;
          eventSales[eventId].commission += commission;
          
          const typeKey = typeof ticket.ticketType === 'object' && ticket.ticketType !== null ? (ticket.ticketType.name || 'Standard') : (ticket.ticketType || 'Standard');
          if (!eventSales[eventId].ticketTypes[typeKey]) {
            eventSales[eventId].ticketTypes[typeKey] = {
              name: typeKey,
              quantity: 0,
              unitPrice: ticket.price || 0,
              total: 0,
              commission: 0,
              codes: [],
              tableInfo: ticket.tableInfo || null
            };
          }
          eventSales[eventId].ticketTypes[typeKey].quantity += ticket.quantity || 0;
          eventSales[eventId].ticketTypes[typeKey].unitPrice = ticket.price || 0;
          eventSales[eventId].ticketTypes[typeKey].total += ticket.totalPrice || 0;
          eventSales[eventId].ticketTypes[typeKey].commission += commission;
          eventSales[eventId].ticketTypes[typeKey].codes.push(ticket.code || ticket.ticketCode || 'N/D');
          eventSales[eventId].ticketTypes[typeKey].tableInfo = ticket.tableInfo || null;
        }

        setEventStats(Object.values(eventSales));
      } catch (error) {
        console.error('Errore nel recupero delle statistiche:', error);
      } finally {
        setLoading(false);
      }
    }

    if (promoter?.uid) {
    fetchPromoterStats();
    }
  }, [promoter?.uid]);

  const filteredEventStats = useMemo(() => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!lowerSearchTerm) {
      return eventStats;
    }
    return eventStats.filter(stat => 
      (stat.eventName && stat.eventName.toLowerCase().includes(lowerSearchTerm)) ||
      (stat.eventId && stat.eventId.toLowerCase().includes(lowerSearchTerm))
    );
  }, [eventStats, searchTerm]);

  const totalStats = useMemo(() => {
      return eventStats.reduce((acc, stat) => {
          acc.totalTickets += stat.totalTickets || 0;
          acc.totalRevenue += stat.totalRevenue || 0;
          acc.totalCommission += stat.commission || 0;
          return acc;
      }, { totalTickets: 0, totalRevenue: 0, totalCommission: 0 });
  }, [eventStats]);

  const handleOpenDetailModal = (eventData) => {
    setSelectedEventDetails(eventData);
    setIsDetailModalOpen(true);
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedEventDetails(null);
  };

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
            <div className="promoter-summary stats-grid">
               <div className="summary-stat-item">
                  <span className="summary-label">Email</span>
                  <span className="summary-value email">{promoter.email || 'N/D'}</span>
              </div>
               <div className="summary-stat-item">
                  <span className="summary-label">Eventi Unici</span>
                  <span className="summary-value">{eventStats.length}</span>
              </div>
               <div className="summary-stat-item">
                  <span className="summary-label">Biglietti Totali</span>
                  <span className="summary-value">{totalStats.totalTickets}</span>
              </div>
               <div className="summary-stat-item">
                  <span className="summary-label">Incasso Totale</span>
                  <span className="summary-value">€{totalStats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="summary-stat-item">
                  <span className="summary-label">Commissione Totale</span>
                  <span className="summary-value">€{totalStats.totalCommission.toFixed(2)}</span>
              </div>
            </div>

            <h3>Vendite per Evento</h3>

            <div className="search-filter-container">
              <FaSearch className="search-icon" />
              <input 
                type="text"
                placeholder="Cerca per nome o codice evento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="stats-search-input"
              />
            </div>

            {filteredEventStats.length > 0 ? (
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
                    {filteredEventStats.map((stat, index) => (
                      <tr key={stat.eventId || index} className="event-row clickable-row" onClick={() => handleOpenDetailModal(stat)}>
                        <td data-label="Evento">{stat.eventName}</td>
                        <td data-label="Data">{new Date(stat.eventDate?.seconds * 1000 || stat.eventDate).toLocaleDateString()}</td>
                        <td data-label="Biglietti">{stat.totalTickets}</td>
                        <td data-label="Incasso">€{stat.totalRevenue.toFixed(2)}</td>
                        <td data-label="Commissione">€{stat.commission.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">
                {searchTerm 
                  ? 'Nessun evento trovato per la ricerca.' 
                  : 'Nessuna vendita registrata per questo promoter.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* === Modale Dettaglio Evento === */}
      {isDetailModalOpen && selectedEventDetails && (
          <div className="modal-overlay event-detail-modal-overlay" onClick={handleCloseDetailModal}>
              <div className="modal-content event-detail-modal-content" onClick={(e) => e.stopPropagation()}>
                 {/* Header del Modale Dettaglio */}
                 <div className="modal-header">
                    <h2>Dettaglio Vendite: {selectedEventDetails.eventName}</h2>
                    <button onClick={handleCloseDetailModal} className="close-button" title="Chiudi">
                        <FaTimes />
                    </button>
                 </div>

                 {/* Tabella Dettaglio Tipi Biglietto (riutilizziamo la struttura) */}
                 <div className="ticket-type-detail-table-wrapper modal-table-wrapper">
                    <table className="ticket-type-detail-table">
                        <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Quantità</th>
                            <th>Prezzo Unitario</th>
                            <th>Incasso</th>
                            <th>Commissione</th>
                            <th>Codici</th>
                            <th>Tavolo</th>
                        </tr>
                        </thead>
                        <tbody>
                        {Object.values(selectedEventDetails.ticketTypes).map((type, i) => (
                            <tr key={i}>
                            <td data-th="Tipo"><span>{type.name}</span></td>
                            <td data-th="Quantità"><span>{type.quantity}</span></td>
                            <td data-th="Prezzo Unitario"><span>€{Number(type.unitPrice).toFixed(2)}</span></td>
                            <td data-th="Incasso"><span>€{Number(type.total).toFixed(2)}</span></td>
                            <td data-th="Commissione"><span>€{Number(type.commission).toFixed(2)}</span></td>
                            <td data-th="Codici"><span>{type.codes.join(', ')}</span></td>
                            <td data-th="Tavolo"><span>{type.tableInfo ? (type.tableInfo.type?.name || 'Tavolo') : '-'}</span></td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                 </div>
              </div>
          </div>
      )}
    </div>
  );
}

export default PromoterStats; 