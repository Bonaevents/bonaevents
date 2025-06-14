import { FaCalendarAlt, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import { useState, useEffect } from 'react';

function EventList({ events, onEdit, onDelete, onToggleStatus }) {
  const [eventsList, setEventsList] = useState(events);

  // Ascoltatore per aggiornare la UI quando un biglietto viene eliminato/ripristinato
  useEffect(() => {
    const handleTicketUpdate = (event) => {
      console.log('Evento di aggiornamento biglietti ricevuto:', event.detail);
      
      // Aggiorna l'evento specifico nella lista
      setEventsList(prevEvents => 
        prevEvents.map(evt => 
          evt.id === event.detail.eventId 
            ? { ...evt, availableTickets: event.detail.newQuantity }
            : evt
        )
      );
    };

    window.addEventListener('ticketQuantityUpdated', handleTicketUpdate);
    
    return () => {
      window.removeEventListener('ticketQuantityUpdated', handleTicketUpdate);
    };
  }, []);

  // Aggiorna lo stato locale quando cambiano gli eventi da props
  useEffect(() => {
    setEventsList(events);
  }, [events]);

  return (
    <div className="events-grid">
      {eventsList.map(event => (
        <div key={event.id} className="event-card">
          {/* Aggiungiamo la sezione immagine usando posterImageUrl */}
          {event.posterImageUrl && (
            <div className="event-image">
              <img src={event.posterImageUrl} alt={event.name} />
            </div>
          )}
          <div className="event-content">
            <h3>{event.name}</h3>
            {event.isRecurring ? (
              <div className="event-dates">
                <h4><FaCalendarAlt /> Date disponibili:</h4>
                <div className="dates-list">
                  {/* Utilizziamo subEvents invece di dates per eventi ricorrenti */}
                  {event.subEvents && event.subEvents.map((subEvent, index) => (
                    <div key={index} className="date-item">
                      {new Date(subEvent.date.seconds ? new Date(subEvent.date.seconds * 1000) : subEvent.date).toLocaleDateString()} - {subEvent.availableTickets} biglietti
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <p><FaCalendarAlt /> Data: {event.date && new Date(event.date.seconds ? event.date.seconds * 1000 : event.date).toLocaleDateString()}</p>
              </>
            )}
            <p>Luogo: {event.location}</p>
            <p>Prezzo: €{event.price}</p>
            {event.description && (
              <div className="event-description">
                <p>{event.description}</p>
              </div>
            )}
            <div className="event-actions">
              <button onClick={() => onEdit(event)} className="edit-button">
                Modifica
              </button>
              <button onClick={() => onDelete(event.id)} className="delete-button">
                Elimina
              </button>
              <button 
                onClick={() => onToggleStatus(event.id, event.isActive !== false)} 
                className={`toggle-button ${event.isActive !== false ? 'active' : 'inactive'}`}
                title={event.isActive !== false ? "Disattiva Evento" : "Attiva Evento"}
              >
                {event.isActive !== false ? <FaToggleOn /> : <FaToggleOff />}
                {event.isActive !== false ? "Disattiva" : "Attiva"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default EventList; 