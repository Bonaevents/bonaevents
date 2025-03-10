import { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc, addDoc, collection, increment } from 'firebase/firestore';
import { sendTicketEmail } from '../../utils/emailService';
import { useAuth } from '../../contexts/AuthContext';
import './TicketStyles.css';

function SellTicketModal({ event, onClose, onSold }) {
  const { currentUser } = useAuth();
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalPrice = event ? quantity * event.price : 0;
  const commission = totalPrice * 0.1; // 10% commissione

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Verifica disponibilità biglietti
      if (quantity > event.availableTickets) {
        throw new Error(`Solo ${event.availableTickets} biglietti disponibili`);
      }

      // Genera codice biglietto
      const ticketCode = Math.random().toString(36).substr(2, 8).toUpperCase();

      // Crea il biglietto
      const ticketData = {
        eventId: event.id,
        eventName: event.name,
        eventDate: event.date,
        eventLocation: event.location,
        customerName,
        customerEmail,
        quantity,
        ticketCode,
        totalPrice,
        commission,
        sellerId: currentUser.uid,
        status: 'valid',
        createdAt: new Date().toISOString()
      };

      // Salva il biglietto
      const ticketRef = await addDoc(collection(db, 'tickets'), ticketData);

      // Aggiorna i biglietti disponibili
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        availableTickets: increment(-quantity)
      });

      // Invia email con il biglietto
      await sendTicketEmail({
        ...ticketData,
        id: ticketRef.id
      });

      onSold();
      onClose();
    } catch (error) {
      console.error('Error selling ticket:', error);
      setError('Errore nella vendita del biglietto. Riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Vendi Biglietto - {event?.name}</h2>
        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome Cliente:</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Cliente:</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Quantità:</label>
            <input
              type="number"
              min="1"
              max={event?.availableTickets}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
          </div>

          <div className="ticket-summary">
            <p><strong>Prezzo unitario:</strong> €{event?.price}</p>
            <p><strong>Quantità:</strong> {quantity}</p>
            <p><strong>Totale:</strong> €{totalPrice}</p>
            <p><strong>Commissione:</strong> €{commission.toFixed(2)}</p>
          </div>

          <div className="modal-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Vendita in corso...' : 'Vendi Biglietto'}
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

export default SellTicketModal; 