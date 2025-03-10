function EventCard({ event, onSell }) {
  return (
    <div className="event-card">
      {event.imageUrl && (
        <div className="event-image">
          <img src={event.imageUrl} alt={event.name} />
        </div>
      )}
      <div className="event-content">
        <h3>{event.name}</h3>
        <p>Data: {new Date(event.date).toLocaleDateString()}</p>
        <p>Luogo: {event.location}</p>
        <p>Prezzo: €{event.price}</p>
        <p>Biglietti disponibili: {event.availableTickets}</p>
        <button 
          className="sell-button"
          onClick={() => onSell(event)}
          disabled={event.availableTickets <= 0}
        >
          {event.availableTickets > 0 ? 'Vendi Biglietti' : 'Esaurito'}
        </button>
      </div>
    </div>
  );
} 