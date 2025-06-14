import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaMapMarkerAlt, FaTicketAlt, FaEuroSign } from 'react-icons/fa';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import it from 'date-fns/locale/it';
import './EventCard.css';

// Registra la localizzazione italiana
registerLocale('it', it);

function EventCard({ event, onSell }) {
  const [sortedDates, setSortedDates] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);

  useEffect(() => {
    if (event?.eventDates && Array.isArray(event.eventDates)) {
      const validDates = event.eventDates
        .map(dateItem => ({ ...dateItem, dateObj: new Date(dateItem.date) })) 
        .filter(dateItem => !isNaN(dateItem.dateObj.getTime())) 
        .sort((a, b) => a.dateObj - b.dateObj); 
      setSortedDates(validDates);
      
      // Pre-calcola le date con disponibilità per il DatePicker
      const datesWithAvailability = validDates
        .filter(dateItem => calculateAvailabilityForDate(dateItem) > 0)
        .map(dateItem => dateItem.dateObj); // Array di oggetti Date
      setAvailableDates(datesWithAvailability);
    } else {
      setSortedDates([]);
      setAvailableDates([]);
    }
  }, [event]);

  const handleDirectSell = () => {
    if (hasSingleDate) {
      // Trova l'oggetto dateItem completo per la data singola disponibile
      const singleAvailableDateItem = sortedDates.find(d => d.dateObj.getTime() === availableDates[0].getTime());
      if(singleAvailableDateItem) {
        onSell(event, singleAvailableDateItem);
      }
    }
  };

  const handleDateSelectFromPicker = (selectedDateObj) => {
    if (!selectedDateObj) return;
    console.log(`[DatePicker onChange] Data selezionata RAW: ${selectedDateObj.toISOString()}, Time: ${selectedDateObj.getTime()}`);

    // Normalizza la data selezionata a mezzanotte UTC
    const normalizedSelectedDate = new Date(Date.UTC(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate()));
    const normalizedSelectedTime = normalizedSelectedDate.getTime();
    console.log(`[DatePicker onChange] Data selezionata NORMALIZZATA a UTC 00:00: ${normalizedSelectedDate.toISOString()}, Time: ${normalizedSelectedTime}`);

    // Trova l'oggetto dateItem originale confrontando le date normalizzate
    const selectedDateItem = sortedDates.find(item => {
      const itemDate = item.dateObj;
      
      // Normalizza la data dell'item a mezzanotte UTC
      const normalizedItemDate = new Date(Date.UTC(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate()));
      const normalizedItemTime = normalizedItemDate.getTime();

      // Log di confronto per ogni data in sortedDates (con date normalizzate)
      console.log(`--- Confronto Normalizzato: Item ${normalizedItemDate.toISOString()} (${normalizedItemTime}) vs Sel ${normalizedSelectedDate.toISOString()} (${normalizedSelectedTime})`);
      
      return normalizedItemTime === normalizedSelectedTime;
    });

    if (selectedDateItem) {
      console.log("[DatePicker onChange] Corrispondenza TROVATA (normalizzata):", selectedDateItem);
      onSell(event, selectedDateItem);
    } else {
      console.error("[DatePicker onChange] NESSUNA corrispondenza trovata (normalizzata) in sortedDates per la data selezionata!");
      console.log("Date disponibili (sortedDates):");
      sortedDates.forEach(d => {
        const normalized = new Date(Date.UTC(d.dateObj.getFullYear(), d.dateObj.getMonth(), d.dateObj.getDate()));
        console.log(`- Originale: ${d.dateObj.toISOString()}, Normalizzata UTC 00:00: ${normalized.toISOString()}, Time Norm: ${normalized.getTime()}`);
      });
    }
  };

  const hasSingleDate = sortedDates.length === 1 && availableDates.length === 1;
  const hasMultipleDates = sortedDates.length > 1 && availableDates.length > 0;

  const calculateAvailabilityForDate = (dateItem) => {
    if (!dateItem || !Array.isArray(dateItem.ticketTypes)) {
      return 0;
    }
    return dateItem.ticketTypes.reduce((sum, ticketType) => {
      const qty = parseInt(ticketType.quantity, 10);
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);
  };

  const totalAvailableTickets = sortedDates.reduce((totalSum, dateItem) => {
    return totalSum + calculateAvailabilityForDate(dateItem);
  }, 0);
  
  const isSoldOut = totalAvailableTickets === 0 && sortedDates.length > 0;

  if (!event || !event.eventDates || event.eventDates.length === 0) {
    return null;
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Data/Ora non disponibile';
    try {
      return new Date(dateString).toLocaleString('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      });
    } catch (error) {
      console.error("Errore formattazione data/ora:", dateString, error);
      return 'Data/Ora invalida';
    }
  };

  const getOverallPriceRange = () => {
    let minPrice = Infinity;
    let maxPrice = 0;
    let hasAnyTickets = false;

    event.eventDates.forEach(dateItem => {
      dateItem.ticketTypes?.forEach(ticket => {
        const price = Number(ticket.price);
        if (!isNaN(price)) {
          hasAnyTickets = true;
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        }
      });
      if (dateItem.hasTablesForDate) {
        dateItem.tableTypes?.forEach(table => {
          const price = Number(table.price);
          if (!isNaN(price)) {
            hasAnyTickets = true;
            minPrice = Math.min(minPrice, price);
            maxPrice = Math.max(maxPrice, price);
          }
        });
      }
    });

    if (!hasAnyTickets) return { min: 0, max: 0, text: "N/D" };
    if (minPrice === maxPrice) return { min: minPrice, max: maxPrice, text: `€${minPrice.toFixed(2)}` };
    return { min: minPrice, max: maxPrice, text: `da €${minPrice.toFixed(2)} a €${maxPrice.toFixed(2)}` };
  };

  const priceInfo = getOverallPriceRange();

  return (
    <div className={`event-card-promoter ${isSoldOut ? 'sold-out' : ''}`}>
      {event.posterImageUrl && (
        <div className="event-image-promoter">
          <img src={event.posterImageUrl} alt={event.name} />
        </div>
      )}
      <div className="event-content-promoter">
        <h3>{event.name || 'Nome Evento Mancante'}</h3>
        <p className="location"><FaMapMarkerAlt /> {event.location || 'Luogo non specificato'}</p>
        
        <div className="dates-info">
          <p><FaCalendarAlt /> Date totali: {sortedDates.length}</p>
          </div>

        <div className="ticket-types-preview">
          {event.ticketTypes?.length > 0 && (
            <p><FaTicketAlt /> {event.ticketTypes.length} tipi di biglietto</p>
          )}
          {event.tableTypes?.length > 0 && (
            <p><i className="fas fa-chair"></i> {event.tableTypes.length} tipi di tavolo</p>
          )}
        </div>
        
        {isSoldOut && (
          <p className="status-tag sold-out-tag">Esaurito</p>
        )}

        <div className="event-actions-promoter">
          {hasSingleDate && !isSoldOut && (
            <button 
              onClick={handleDirectSell} 
              className="sell-button single-date"
            >
              Vendi ({availableDates[0].toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit' })}) - {calculateAvailabilityForDate(sortedDates.find(d=>d.dateObj.getTime() === availableDates[0].getTime()))} disp.
            </button>
          )}

          {hasMultipleDates && !isSoldOut && (
            <div className="date-picker-container">
              <DatePicker
                selected={null}
                onChange={handleDateSelectFromPicker}
                includeDates={availableDates}
                dateFormat="dd/MM/yyyy"
                placeholderText={`Seleziona data (${availableDates.length} opz.)`}
                locale="it"
                className="date-picker-input"
                calendarClassName="custom-calendar"
                minDate={new Date()}
                inline={false}
                popperPlacement="top-start"
              />
          </div>
        )}
        
          {isSoldOut && (
            <button className="sell-button sold-out" disabled>Esaurito</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventCard; 