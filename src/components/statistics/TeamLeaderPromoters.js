import React, { useState } from 'react';
import { FaUser, FaTicketAlt, FaEuroSign, FaAngleDown, FaAngleUp, FaSearch } from 'react-icons/fa';
import './TeamLeaderPromoters.css';

function PromoterCard({ promoter, salesData }) {
  const [expandedEvents, setExpandedEvents] = useState({});

  const toggleEventExpansion = (eventId) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const hasSalesData = salesData && salesData.eventSales && Object.keys(salesData.eventSales).length > 0;

  return (
    <div className="promoter-card-details">
      <div className="promoter-header">
        <div className="promoter-info">
          <FaUser className="icon" />
          <div>
            <h4>{promoter.name}</h4>
            <p>{promoter.email}</p>
          </div>
        </div>
        <div className="promoter-stats">
          <div className="stat-item">
            <FaTicketAlt className="icon" />
            <span>{salesData?.totalTickets || 0} biglietti</span>
          </div>
          <div className="stat-item">
            <FaEuroSign className="icon" />
            <span>€{(salesData?.totalRevenue || 0).toFixed(2)}</span>
          </div>
        </div>
      </div>
      
      {hasSalesData ? (
        <div className="promoter-events-detailed">
          <h5>Vendite Dettagliate per Evento</h5>
          {Object.entries(salesData.eventSales).map(([eventId, eventData]) => {
            const isExpanded = !!expandedEvents[eventId];
            const hasTicketDetails = eventData.ticketTypeSales && Object.keys(eventData.ticketTypeSales).length > 0;

            return (
              <div key={eventId} className="event-sale-item">
                <div className="event-summary-header" onClick={() => hasTicketDetails && toggleEventExpansion(eventId)} style={{ cursor: hasTicketDetails ? 'pointer' : 'default' }}>
                  <span className="event-name">
                    {typeof eventData.eventName === 'string' ? eventData.eventName : 'Nome Evento Invalido'}
                  </span>
                  <div className="event-totals">
                    <span className="event-tickets">{eventData.totalTickets} T</span>
                    <span className="event-revenue">€{eventData.totalRevenue.toFixed(2)}</span>
                  </div>
                  {hasTicketDetails && (
                      <button className="expand-button">
                        {isExpanded ? <FaAngleUp /> : <FaAngleDown />}
                      </button>
                  )}
                </div>
                
                {isExpanded && hasTicketDetails && (
                  <div className="ticket-type-details">
                     <div className="type-sale-header">
                        <span>Tipo Biglietto</span>
                        <span>Quantità</span>
                        <span>Incasso</span>
                      </div>
                    {Object.entries(eventData.ticketTypeSales)
                      .sort(([, a], [, b]) => b.revenue - a.revenue)
                      .map(([typeId, typeData]) => (
                      <div key={typeId} className="type-sale-row">
                        <span className="type-name">
                           {(typeData && typeof typeData.name === 'string') ? typeData.name : (typeId || 'Sconosciuto')}
                        </span>
                        <span className="type-quantity">{typeData.quantity}</span>
                        <span className="type-revenue">€{typeData.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
          <p className="no-sales-message">Nessuna vendita registrata.</p>
      )}
    </div>
  );
}

function TeamLeaderPromoters({ promoters, salesDetails }) {
  const [promoterSearchTerm, setPromoterSearchTerm] = useState('');

  const filteredPromoters = promoters.filter(promoter => 
        (promoter.name?.toLowerCase() || '').includes(promoterSearchTerm.toLowerCase()) ||
        (promoter.email?.toLowerCase() || '').includes(promoterSearchTerm.toLowerCase())
      );

  return (
    <div className="promoters-container">
      <div className="search-container">
        <input
          type="text"
          placeholder="Cerca promoter..."
          value={promoterSearchTerm}
          onChange={(e) => setPromoterSearchTerm(e.target.value)}
          className="search-input"
        />
        <FaSearch className="search-icon" />
      </div>
      
      {promoters.length === 0 ? (
        <p className="no-promoters-message">Nessun promoter trovato in questo team.</p>
      ) : filteredPromoters.length === 0 ? (
        <p className="no-promoters-message">Nessun promoter trovato per la ricerca.</p>
      ) : (
        filteredPromoters.map(promoter => (
          <PromoterCard 
            key={promoter.id} 
            promoter={promoter} 
            salesData={salesDetails ? salesDetails[promoter.id] : null}
          />
          ))
      )}
    </div>
  );
}

export default TeamLeaderPromoters; 