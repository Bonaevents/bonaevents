import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { uploadImage } from '../../services/ImageService';
import EventStatistics from '../events/EventStatistics';
import EditEventModal from '../admin/EditEventModal';
import './AdminStyles.css';

function EventManagement() {
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    totalTickets: '',
    ticketPrice: '',
  });
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Errore nel caricamento degli eventi');
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5000000) { // 5MB limit
        setError('L\'immagine non può superare i 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let imageUrl = null;
      if (image) {
        const formData = new FormData();
        formData.append('image', image);
        formData.append('key', 'd9f963c744bc9f72f5333ee95d2232cf');

        const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData
        });

        const data = await response.json();
        if (data.success) {
          imageUrl = data.data.url;
        } else {
          throw new Error('Errore nel caricamento dell\'immagine');
        }
      }

      const eventData = {
        ...formData,
        totalTickets: parseInt(formData.totalTickets),
        availableTickets: parseInt(formData.totalTickets),
        ticketPrice: parseFloat(formData.ticketPrice),
        imageUrl,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'events'), eventData);
      
      // Reset form
      setFormData({
        name: '',
        date: '',
        location: '',
        totalTickets: '',
        ticketPrice: '',
      });
      setImage(null);
      setImagePreview(null);
      setShowCreateModal(false);
      
      // Refresh events list
      fetchEvents();
    } catch (error) {
      setError('Errore nella creazione dell\'evento: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (window.confirm('Sei sicuro di voler eliminare questo evento?')) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
        fetchEvents();
      } catch (error) {
        setError('Errore nell\'eliminazione dell\'evento');
      }
    }
  };

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h2>Gestione Eventi</h2>
        <button 
          className="create-button"
          onClick={() => setShowCreateModal(true)}
        >
          Nuovo Evento
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Lista degli eventi */}
      <div className="events-grid">
        {events.map(event => (
          <div key={event.id} className="event-card">
            {event.imageUrl && (
              <div className="event-image">
                <img src={event.imageUrl} alt={event.name} />
              </div>
            )}
            <div className="event-content">
              <h3>{event.name}</h3>
              <p>Data: {new Date(event.date).toLocaleDateString()}</p>
              <p>Luogo: {event.location}</p>
              <p>Prezzo: €{event.ticketPrice}</p>
              <p>Biglietti disponibili: {event.availableTickets}</p>
            <div className="event-actions">
              <button 
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowStatsModal(true);
                  }} 
                  className="stats-button"
                >
                  Statistiche
                </button>
                <button 
                  onClick={() => setSelectedEvent(event)} 
                  className="edit-button"
              >
                Modifica
              </button>
              <button 
                onClick={() => handleDeleteEvent(event.id)}
                  className="delete-button"
              >
                Elimina
              </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal creazione evento */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Crea Nuovo Evento</h2>
            <form onSubmit={handleSubmit}>
              {/* Sezione Upload Immagine */}
              <div className="form-group">
                <label>Locandina Evento:</label>
                <div className="image-upload-container">
                  {imagePreview ? (
                    <div className="image-preview">
                      <img src={imagePreview} alt="Preview" />
                      <button 
                        type="button" 
                        className="remove-image"
                        onClick={() => {
                          setImage(null);
                          setImagePreview(null);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="upload-placeholder">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        id="event-image"
                        className="hidden-input"
                      />
                      <label htmlFor="event-image" className="upload-label">
                        Carica Locandina
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Altri campi del form */}
              <div className="form-group">
                <label>Nome Evento:</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Data:</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Luogo:</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Prezzo Biglietto (€):</label>
                <input
                  type="number"
                  value={formData.ticketPrice}
                  onChange={(e) => setFormData({...formData, ticketPrice: e.target.value})}
                  required
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Numero Totale Biglietti:</label>
                <input
                  type="number"
                  value={formData.totalTickets}
                  onChange={(e) => setFormData({...formData, totalTickets: e.target.value})}
                  required
                  min="1"
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creazione in corso...' : 'Crea Evento'}
                </button>
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal statistiche evento */}
      {showStatsModal && selectedEvent && (
        <EventStatistics
          event={selectedEvent}
          onClose={() => {
            setShowStatsModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Modal modifica evento */}
      {selectedEvent && !showStatsModal && (
        <EditEventModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onEventUpdated={() => {
            fetchEvents();
            setSelectedEvent(null);
          }}
        />
      )}
    </div>
  );
}

export default EventManagement; 