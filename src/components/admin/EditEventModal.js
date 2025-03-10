import { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import './AdminStyles.css';

function EditEventModal({ event, onClose, onEventUpdated }) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [price, setPrice] = useState(event.price);
  const [totalTickets, setTotalTickets] = useState(event.totalTickets);
  const [availableTickets, setAvailableTickets] = useState(event.availableTickets);
  const [status, setStatus] = useState(event.status || 'active');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const eventRef = doc(db, 'events', event.id);
      const eventData = {
        name,
        date,
        location,
        price: Number(price),
        totalTickets: Number(totalTickets),
        availableTickets: Number(availableTickets),
        status,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(eventRef, eventData);
      onEventUpdated();
      onClose();
    } catch (error) {
      setError('Errore nella modifica dell\'evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Modifica Evento</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Evento:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Data:</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Luogo:</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Prezzo (€):</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              min="0"
              step="0.01"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Numero Totale Biglietti:</label>
            <input
              type="number"
              value={totalTickets}
              onChange={(e) => setTotalTickets(e.target.value)}
              required
              min="1"
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Biglietti Disponibili:</label>
            <input
              type="number"
              value={availableTickets}
              onChange={(e) => setAvailableTickets(e.target.value)}
              required
              min="0"
              max={totalTickets}
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Stato:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="form-control"
            >
              <option value="active">Attivo</option>
              <option value="inactive">Inattivo</option>
              <option value="completed">Completato</option>
              <option value="cancelled">Cancellato</option>
            </select>
          </div>

          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Annulla
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditEventModal; 