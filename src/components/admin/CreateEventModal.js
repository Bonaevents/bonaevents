import { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import './AdminStyles.css';

function CreateEventModal({ onClose, onEventCreated }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [totalTickets, setTotalTickets] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const eventData = {
        name,
        date,
        location,
        price: Number(price),
        totalTickets: Number(totalTickets),
        availableTickets: Number(totalTickets),
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'events'), eventData);
      onEventCreated();
      onClose();
    } catch (error) {
      setError('Errore nella creazione dell\'evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Crea Nuovo Evento</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Evento:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Data:</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Luogo:</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              required
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
            />
          </div>

          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creazione...' : 'Crea Evento'}
            </button>
            <button 
              type="button" 
              className="btn-secondary"
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

export default CreateEventModal; 