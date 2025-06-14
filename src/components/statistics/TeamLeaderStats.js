import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { FaUsers } from 'react-icons/fa';
import TeamLeaderPromoters from './TeamLeaderPromoters';
import './TeamLeaderStats.css';

function TeamLeaderStats({ teamLeader, onClose }) {
  const [stats, setStats] = useState({
    totalTickets: 0,
    totalRevenue: 0,
    eventStats: [],
    promoters: [],
    promoterSalesDetails: {},
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  const [showPromoters, setShowPromoters] = useState(false);

  useEffect(() => {
    if (teamLeader?.id) {
    fetchTeamLeaderStats();
    }
  }, [teamLeader?.id]);

  async function fetchTeamLeaderStats() {
    setLoading(true);
    try {
      // 1. Recupera i promoter del team leader
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', teamLeader.id),
        where('role', '==', 'promoter')
      );
      const promotersSnapshot = await getDocs(promotersQuery);
      const promoters = promotersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const promoterIds = promoters.map(p => p.id);

      let totalTicketsTeam = 0;
      let totalRevenueTeam = 0;
      const eventStatsMap = {};
      const promoterSalesDetails = {};
      let allSalesRaw = [];

      if (promoterIds.length > 0) {
        // 2. Recupera TUTTE le vendite dei promoter del team
      const salesQuery = query(
          collection(db, 'tickets'),
          where('sellerId', 'in', promoterIds)
        );
      const salesSnapshot = await getDocs(salesQuery);
        allSalesRaw = salesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); // Popoliamo allSalesRaw

        // 3. Processa le vendite per calcolare statistiche aggregate E dettagli per promoter
        allSalesRaw.forEach(sale => {
        const eventId = sale.eventId;
          const promoterId = sale.sellerId;
          const ticketTypeRaw = sale.ticketType; // Valore grezzo
          const quantity = sale.quantity || 0;
          const totalPrice = sale.totalPrice || 0;

          if (!eventId || !promoterId) return;

          // --- Determina ID e Nome (stringhe sicure) --- 
          let ticketTypeIdString = 'standard'; 
          let ticketTypeNameString = 'Standard'; 
          if (typeof ticketTypeRaw === 'string') {
              ticketTypeIdString = ticketTypeRaw;
              ticketTypeNameString = ticketTypeRaw.charAt(0).toUpperCase() + ticketTypeRaw.slice(1); // Capitalizza ID se è solo stringa
          } else if (typeof ticketTypeRaw === 'object' && ticketTypeRaw !== null) {
              ticketTypeIdString = ticketTypeRaw.id || 'unknown_id'; 
              ticketTypeNameString = ticketTypeRaw.name || ticketTypeIdString;
          }
          // ------------------------------------------------

          // Aggiorna totali team
          totalTicketsTeam += quantity;
          totalRevenueTeam += totalPrice;

          // Inizializza/Aggiorna statistiche aggregate per evento
          if (!eventStatsMap[eventId]) {
            eventStatsMap[eventId] = {
            eventId,
              eventName: sale.eventName || 'Evento Sconosciuto',
              totalTickets: 0,
              totalRevenue: 0,
              ticketTypeSales: {}
            };
          }
          eventStatsMap[eventId].totalTickets += quantity;
          eventStatsMap[eventId].totalRevenue += totalPrice;
          // Usa ticketTypeIdString come chiave e salva ticketTypeNameString
          if (!eventStatsMap[eventId].ticketTypeSales[ticketTypeIdString]) {
            eventStatsMap[eventId].ticketTypeSales[ticketTypeIdString] = { name: ticketTypeNameString, quantity: 0, revenue: 0 };
          }
          eventStatsMap[eventId].ticketTypeSales[ticketTypeIdString].quantity += quantity;
          eventStatsMap[eventId].ticketTypeSales[ticketTypeIdString].revenue += totalPrice;

          // Inizializza/Aggiorna statistiche dettagliate per promoter
          if (!promoterSalesDetails[promoterId]) {
            promoterSalesDetails[promoterId] = {
                totalTickets: 0,
                totalRevenue: 0,
                eventSales: {}
            };
          }
          promoterSalesDetails[promoterId].totalTickets += quantity;
          promoterSalesDetails[promoterId].totalRevenue += totalPrice;
          if (!promoterSalesDetails[promoterId].eventSales[eventId]) {
             promoterSalesDetails[promoterId].eventSales[eventId] = {
                eventName: sale.eventName || 'Evento Sconosciuto',
            totalTickets: 0,
            totalRevenue: 0,
                ticketTypeSales: {}
            };
          }
           promoterSalesDetails[promoterId].eventSales[eventId].totalTickets += quantity;
           promoterSalesDetails[promoterId].eventSales[eventId].totalRevenue += totalPrice;
          // Usa ticketTypeIdString come chiave e salva ticketTypeNameString
          if (!promoterSalesDetails[promoterId].eventSales[eventId].ticketTypeSales[ticketTypeIdString]) {
             promoterSalesDetails[promoterId].eventSales[eventId].ticketTypeSales[ticketTypeIdString] = { name: ticketTypeNameString, quantity: 0, revenue: 0 };
          }
           promoterSalesDetails[promoterId].eventSales[eventId].ticketTypeSales[ticketTypeIdString].quantity += quantity;
           promoterSalesDetails[promoterId].eventSales[eventId].ticketTypeSales[ticketTypeIdString].revenue += totalPrice;
        });
      }

      // Converti mappa eventStats in array e ordina
      const eventStatsArray = Object.values(eventStatsMap)
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Calcola recentSales DALL'ARRAY RACCOLTO
      const recentSalesCalculated = allSalesRaw
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)) // Ordina per data decrescente
          .slice(0, 5); // Prendi le ultime 5

      setStats({
        totalTickets: totalTicketsTeam,
        totalRevenue: totalRevenueTeam,
        eventStats: eventStatsArray,
        promoters: promoters,
        promoterSalesDetails: promoterSalesDetails,
        recentSales: recentSalesCalculated
      });

    } catch (error) {
      console.error('Errore nel recupero delle statistiche del team leader:', error);
      setStats(prev => ({ ...prev, promoters: [], eventStats: [], recentSales: [], promoterSalesDetails: {} }));
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="loading">Caricamento statistiche...</div>;

  const recentSalesToShow = stats.recentSales || [];

  return (
    <div className="stats-modal-overlay">
      <div className="stats-modal-content">
        <button className="close-button" onClick={onClose}>×</button>
        <div className="team-leader-stats">
          <div className="stats-header">
            <h3>{teamLeader.name}</h3>
            <button 
              className={`toggle-promoters-btn ${showPromoters ? 'active' : ''}`}
              onClick={() => setShowPromoters(!showPromoters)}
            >
              <FaUsers /> {showPromoters ? 'Nascondi Promoter' : 'Mostra Promoter'}
            </button>
          </div>
          
          {!showPromoters ? (
            <>
              <div className="stats-summary">
                <div className="stat-box">
                  <span className="stat-label">Biglietti Venduti</span>
                  <span className="stat-value">{stats.totalTickets}</span>
                </div>
                <div className="stat-box">
                  <span className="stat-label">Incasso Totale</span>
                  <span className="stat-value">€{stats.totalRevenue.toFixed(2)}</span>
                </div>
              </div>

              <div className="events-stats">
                <h4>Vendite per Evento</h4>
                {stats.eventStats && stats.eventStats.length > 0 ? (
                    stats.eventStats.map(event => (
                  <div key={event.eventId} className="event-stat-card">
                    <div className="event-stat-header">
                      <h5>{event.eventName}</h5>
                      <div className="event-totals">
                        <span>{event.totalTickets} biglietti</span>
                        <span>€{event.totalRevenue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                    ))
                ) : (
                    <p className="no-data-inline">Nessuna vendita per evento.</p>
                )}
              </div>

              <div className="recent-sales">
                <h4>Ultime vendite</h4>
                {recentSalesToShow.length > 0 ? (
                    recentSalesToShow.map(sale => (
                  <div key={sale.id} className="sale-row">
                        <span>{sale.createdAt ? new Date(sale.createdAt.seconds * 1000).toLocaleDateString() : 'Data N/D'}</span>
                        <span>{sale.eventName || 'Evento N/D'}</span>
                        <span>{sale.quantity || 0} biglietti</span>
                        <span>€{sale.totalPrice?.toFixed(2) || '0.00'}</span>
                  </div>
                    ))
                ) : (
                    <p className="no-data-inline">Nessuna vendita recente.</p>
                )}
              </div>
            </>
          ) : (
            <TeamLeaderPromoters 
              promoters={stats.promoters} 
              salesDetails={stats.promoterSalesDetails} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamLeaderStats; 