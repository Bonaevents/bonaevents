import { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';

function EditEvent({ event, onClose, onEventUpdated }) {
  const [name, setName] = useState(event.name);
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [price, setPrice] = useState(event.price);
  const [availableTickets, setAvailableTickets] = useState(event.availableTickets);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        name,
        date,
        location,
        price: Number(price),
        availableTickets: Number(availableTickets),
        updatedAt: new Date().toISOString()
      });

      onEventUpdated();
    } catch (error) {
      setError('Errore durante l\'aggiornamento dell\'evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3>Modifica Evento</h3>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer'
          }}
        >
          ×
        </button>
      </div>

      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nome Evento:</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Data:</label>
          <input 
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Luogo:</label>
          <input 
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Prezzo (€):</label>
          <input 
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            min="0"
            step="0.01"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Biglietti Disponibili:</label>
          <input 
            type="number"
            value={availableTickets}
            onChange={(e) => setAvailableTickets(e.target.value)}
            required
            min="1"
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? 'Salvataggio...' : 'Salva Modifiche'}
          </button>
          
          <button 
            type="button"
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#9e9e9e',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Annulla
          </button>
        </div>
      </form>
    </div>
  );
}

export default EditEvent; 