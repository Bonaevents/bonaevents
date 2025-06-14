import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import './SalesReports.css'; // Aggiungeremo un file CSS per lo stile
import SellerTicketsDetailModal from './SellerTicketsDetailModal'; // Importa il nuovo modale

// Funzione di utilità per formattare le date (se necessario in futuro)
// const formatDateForDisplay = (dateString) => {
//   if (!dateString) return 'N/A';
//   try {
//     const date = new Date(dateString);
//     return date.toLocaleDateString('it-IT', { year: 'numeric', month: '2-digit', day: '2-digit' });
//   } catch (e) {
//     return dateString; // Ritorna la stringa originale se non è una data valida
//   }
// };

function SalesReports({ usersMap }) { // Ricevi usersMap come prop
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedEventDate, setSelectedEventDate] = useState('');
  const [eventDates, setEventDates] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Stati per il modale dei dettagli biglietti venditore
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedSellerTickets, setSelectedSellerTickets] = useState([]);
  const [selectedSellerNameForModal, setSelectedSellerNameForModal] = useState('');

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        const eventsCollection = collection(db, 'events');
        // Filtra solo gli eventi attivi se necessario, o tutti per l'admin
        const eventSnapshot = await getDocs(eventsCollection);
        const eventsList = eventSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setEvents(eventsList);
        setError('');
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Errore nel caricamento degli eventi.");
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      const selectedEvent = events.find(event => event.id === selectedEventId);
      if (selectedEvent && Array.isArray(selectedEvent.eventDates)) {
        const dates = selectedEvent.eventDates
          .map(ed => ed.date) // Prendi la stringa/timestamp della data
          .filter(Boolean); // Rimuovi eventuali date nulle o vuote
        
        // Ordina le date. Se sono stringhe YYYY-MM-DD, l'ordinamento alfabetico funziona.
        // Se sono timestamp o oggetti Date, potrebbe essere necessario un ordinamento diverso.
        setEventDates([...new Set(dates)].sort()); 
      } else {
        setEventDates([]);
      }
      setSelectedEventDate(''); 
      setReportData(null); 
    }
  }, [selectedEventId, events]);

  useEffect(() => {
    const generateReport = async () => {
      if (selectedEventId && selectedEventDate) {
        setLoading(true);
        setError('');
        setReportData(null);
        try {
          const ticketsQuery = query(
            collection(db, 'tickets'),
            where('eventId', '==', selectedEventId),
            where('eventDate', '==', selectedEventDate),
            where('itemType', '==', 'ticket') // Considera solo i biglietti, non i tavoli per ora
          );
          const ticketSnapshot = await getDocs(ticketsQuery);
          const tickets = ticketSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

          if (tickets.length === 0) {
            setReportData({ aggregated: {}, totals: { tickets: 0, revenue: 0, commissions: 0 }, ticketsBySellerForModal: {} });
            return;
          }

          // Raggruppa i biglietti originali per venditore PRIMA dell'aggregazione per i totali
          const ticketsBySellerForModal = tickets.reduce((acc, ticket) => {
            const sellerId = ticket.sellerId;
            if (!acc[sellerId]) {
              acc[sellerId] = [];
            }
            acc[sellerId].push(ticket);
            return acc;
          }, {});

          const aggregatedReport = tickets.reduce((acc, ticket) => {
            const sellerId = ticket.sellerId;
            const sellerName = usersMap && usersMap[sellerId]?.name ? usersMap[sellerId].name : (ticket.sellerName || 'Venditore Sconosciuto');
            
            if (!acc[sellerId]) {
              acc[sellerId] = {
                sellerName: sellerName,
                totalTicketsSold: 0,
                totalRevenue: 0,
                totalCommissions: 0,
                ticketsByType: {},
                // Non serve aggiungere originalTickets qui se lo passiamo da ticketsBySellerForModal
              };
            }

            const quantity = Number(ticket.quantity) || 0;
            const totalPrice = Number(ticket.totalPrice) || 0;
            // Assicurati che commissionAmount sia un numero, altrimenti 0
            const commissionAmount = Number(ticket.commissionAmount) || 0;
            const ticketTypeName = ticket.itemName || 'Tipo Sconosciuto';

            acc[sellerId].totalTicketsSold += quantity;
            acc[sellerId].totalRevenue += totalPrice;
            acc[sellerId].totalCommissions += commissionAmount;
            acc[sellerId].ticketsByType[ticketTypeName] = (acc[sellerId].ticketsByType[ticketTypeName] || 0) + quantity;
            
            return acc;
          }, {});

          const overallTotals = {
            tickets: Object.values(aggregatedReport).reduce((sum, data) => sum + data.totalTicketsSold, 0),
            revenue: Object.values(aggregatedReport).reduce((sum, data) => sum + data.totalRevenue, 0),
            commissions: Object.values(aggregatedReport).reduce((sum, data) => sum + data.totalCommissions, 0),
          };

          setReportData({ aggregated: aggregatedReport, totals: overallTotals, ticketsBySellerForModal });

        } catch (err) {
          console.error("Error generating report:", err);
          setError("Errore nella generazione del report: " + err.message);
        } finally {
          setLoading(false);
        }
      }
    };

    generateReport();
  }, [selectedEventId, selectedEventDate, usersMap]); // Aggiungi usersMap alle dipendenze

  const handleShowSellerTicketDetails = (sellerId, sellerName) => {
    if (reportData && reportData.ticketsBySellerForModal && reportData.ticketsBySellerForModal[sellerId]) {
      setSelectedSellerTickets(reportData.ticketsBySellerForModal[sellerId]);
      setSelectedSellerNameForModal(sellerName);
      setIsDetailModalOpen(true);
    } else {
      console.warn("Dati biglietti per il venditore non trovati.");
      // Potresti voler mostrare un errore all'utente qui
    }
  };

  return (
    <div className="sales-reports-container">
      <h2 className="main-title">Report Vendite Dettagliato</h2>
      
      {error && <p className="error-message">{error}</p>}

      <div className="filters-section">
        <div className="filter-control">
          <label htmlFor="event-select">Seleziona Evento:</label>
          <select 
            id="event-select" 
            value={selectedEventId} 
            onChange={(e) => setSelectedEventId(e.target.value)}
            disabled={loading || events.length === 0}
          >
            <option value="">-- Seleziona un evento --</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>{event.name}</option>
            ))}
          </select>
        </div>

        {selectedEventId && (
          <div className="filter-control">
            <label htmlFor="date-select">Seleziona Data Evento:</label>
            <select 
              id="date-select" 
              value={selectedEventDate} 
              onChange={(e) => setSelectedEventDate(e.target.value)}
              disabled={loading || eventDates.length === 0}
            >
              <option value="">-- Seleziona una data --</option>
              {eventDates.map(date => (
                // Qui potresti voler formattare la data per la visualizzazione
                <option key={date} value={date}>{date}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="loading-indicator"><p>Caricamento report...</p></div>}

      {reportData && !loading && (
        <div className="report-display-area">
          {Object.keys(reportData.aggregated).length === 0 && selectedEventId && selectedEventDate && (
            <p>Nessun biglietto venduto per l'evento e la data selezionati.</p>
          )}

          {Object.keys(reportData.aggregated).length > 0 && (
            <>
              <h3 className="report-subtitle">Riepilogo Generale</h3>
              <div className="summary-table-container">
                <table className="summary-table">
                  <thead>
                    <tr>
                      <th>Totale Biglietti Venduti</th>
                      <th>Incasso Totale</th>
                      <th>Commissioni Totali</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td data-label="Totale Biglietti Venduti">{reportData.totals.tickets}</td>
                      <td data-label="Incasso Totale">€{reportData.totals.revenue.toFixed(2)}</td>
                      <td data-label="Commissioni Totali">€{reportData.totals.commissions.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <h3 className="report-subtitle">Dettaglio per Venditore</h3>
              {Object.entries(reportData.aggregated).map(([sellerId, data]) => (
                <div key={sellerId} className="seller-report-card">
                  <h4>Venditore: {data.sellerName}</h4>
                  <p><strong>Biglietti Totali Venduti:</strong> {data.totalTicketsSold}</p>
                  <p><strong>Incasso Totale:</strong> €{data.totalRevenue.toFixed(2)}</p>
                  <p><strong>Commissioni Totali:</strong> €{data.totalCommissions.toFixed(2)}</p>
                  <h5>Biglietti Venduti per Tipo:</h5>
                  {Object.keys(data.ticketsByType).length > 0 ? (
                    <ul className="tickets-by-type-list">
                      {Object.entries(data.ticketsByType).map(([typeName, count]) => (
                        <li key={typeName}>{typeName}: {count}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Nessun biglietto specifico trovato.</p>
                  )}
                  <button 
                    className="button button-small button-info"
                    onClick={() => handleShowSellerTicketDetails(sellerId, data.sellerName)}
                  >
                    Dettagli Biglietti Venduti
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {isDetailModalOpen && (
        <SellerTicketsDetailModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          sellerName={selectedSellerNameForModal}
          tickets={selectedSellerTickets}
          eventDate={selectedEventDate} // Passiamo anche la data dell'evento per riferimento
        />
      )}
    </div>
  );
}

export default SalesReports; 