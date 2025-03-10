function EventList({ events, onEdit, onDelete }) {
  return (
    <div className="events-grid">
      {events.map(event => (
        <div key={event.id} className="event-card">
          {/* Aggiungiamo la sezione immagine */}
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
            <div className="event-actions">
              <button onClick={() => onEdit(event)} className="edit-button">
                Modifica
              </button>
              <button onClick={() => onDelete(event.id)} className="delete-button">
                Elimina
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 