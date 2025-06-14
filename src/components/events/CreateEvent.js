import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import './CreateEvent.css';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

function CreateEvent() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Stato base dell'evento
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    location: '',
    price: '',
    isRecurring: false,
    date: '',
    availableTickets: '',
    subEvents: [],
    imageUrl: ''
  });
  
  // Stato per la nuova data da aggiungere
  const [newSubEvent, setNewSubEvent] = useState({
    date: '',
    availableTickets: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Gestisco i cambi nei campi principali
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEventData({
      ...eventData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Gestisco i cambi nei campi del nuovo sotto-evento
  const handleSubEventChange = (e) => {
    const { name, value } = e.target;
    setNewSubEvent({
      ...newSubEvent,
      [name]: value
    });
  };

  // Aggiungo un nuovo sotto-evento alla lista
  const addSubEvent = () => {
    // Validazione
    if (!newSubEvent.date || !newSubEvent.availableTickets) {
      setError('Inserisci sia la data che il numero di biglietti per il sotto-evento');
      return;
    }
    
    // Verifico che la data non sia già presente
    if (eventData.subEvents.some(event => event.date === newSubEvent.date)) {
      setError('Questa data è già stata inserita');
      return;
    }
    
    // Aggiungo il nuovo sotto-evento
    setEventData({
      ...eventData,
      subEvents: [...eventData.subEvents, { ...newSubEvent }]
    });
    
    // Resetto il form per il nuovo sotto-evento
    setNewSubEvent({
      date: '',
      availableTickets: ''
    });
    
    setError('');
  };

  // Rimuovo un sotto-evento dalla lista
  const removeSubEvent = (index) => {
    const updatedSubEvents = [...eventData.subEvents];
    updatedSubEvents.splice(index, 1);
    setEventData({
      ...eventData,
      subEvents: updatedSubEvents
    });
  };

  // Invio del form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Validazione
      if (!eventData.name || !eventData.location || !eventData.price) {
        throw new Error('Inserisci i campi obbligatori: nome, luogo e prezzo');
      }
      
      if (eventData.isRecurring) {
        // Per eventi ricorrenti, verifica che ci sia almeno una data
        if (eventData.subEvents.length === 0) {
          throw new Error('Aggiungi almeno una data per l\'evento ricorrente');
        }
      } else {
        // Per eventi singoli, verifica che ci sia una data
        if (!eventData.date) {
          throw new Error('Inserisci la data dell\'evento');
        }
        if (!eventData.availableTickets) {
          throw new Error('Inserisci il numero di biglietti disponibili');
        }
      }

      // Prepare event data
      const eventToSave = {
        name: eventData.name,
        description: eventData.description || '',
        location: eventData.location,
        price: parseFloat(eventData.price),
        createdBy: currentUser.uid,
        createdAt: new Date(),
        isRecurring: eventData.isRecurring,
        imageUrl: eventData.imageUrl || ''
      };

      // Add specific data based on event type
      if (eventData.isRecurring) {
        // For recurring events, include sub-events
        eventToSave.subEvents = eventData.subEvents.map(subEvent => ({
          date: new Date(subEvent.date),
          availableTickets: parseInt(subEvent.availableTickets, 10)
        }));
      } else {
        // For single events, include date and tickets
        eventToSave.date = new Date(eventData.date);
        eventToSave.availableTickets = parseInt(eventData.availableTickets, 10);
      }

      // Save to Firestore
      await addDoc(collection(db, 'events'), eventToSave);
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error creating event:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-container">
      <h2>Crea Nuovo Evento</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">Evento creato con successo!</div>}
      
      <form onSubmit={handleSubmit} className="event-form">
        <div className="form-group">
          <label htmlFor="name">Nome Evento*</label>
          <input
            type="text"
            id="name"
            name="name"
            value={eventData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="description">Descrizione</label>
          <textarea
            id="description"
            name="description"
            value={eventData.description}
            onChange={handleChange}
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="location">Luogo*</label>
          <input
            type="text"
            id="location"
            name="location"
            value={eventData.location}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="price">Prezzo Biglietto*</label>
          <input
            type="number"
            id="price"
            name="price"
            value={eventData.price}
            onChange={handleChange}
            min="0"
            step="0.01"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="imageUrl">URL Immagine</label>
          <input
            type="text"
            id="imageUrl"
            name="imageUrl"
            value={eventData.imageUrl}
            onChange={handleChange}
            placeholder="https://esempio.com/immagine.jpg"
          />
        </div>
        
        <div className="form-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="isRecurring"
              checked={eventData.isRecurring}
              onChange={handleChange}
            />
            Evento con più date
          </label>
        </div>
        
        {!eventData.isRecurring ? (
          // Form per evento singolo
          <>
            <div className="form-group">
              <label htmlFor="date">Data Evento*</label>
              <input
                type="date"
                id="date"
                name="date"
                value={eventData.date}
                onChange={handleChange}
                required={!eventData.isRecurring}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="availableTickets">Biglietti Disponibili*</label>
              <input
                type="number"
                id="availableTickets"
                name="availableTickets"
                value={eventData.availableTickets}
                onChange={handleChange}
                min="1"
                required={!eventData.isRecurring}
              />
            </div>
          </>
        ) : (
          // Form per evento con più date
          <div className="sub-events-section">
            <h3>Date dell'Evento</h3>
            
            <div className="add-sub-event">
              <div className="form-group">
                <label htmlFor="subEventDate">Data</label>
                <input
                  type="date"
                  id="subEventDate"
                  name="date"
                  value={newSubEvent.date}
                  onChange={handleSubEventChange}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="subEventTickets">Biglietti Disponibili</label>
                <input
                  type="number"
                  id="subEventTickets"
                  name="availableTickets"
                  value={newSubEvent.availableTickets}
                  onChange={handleSubEventChange}
                  min="1"
                />
              </div>
              
              <button 
                type="button" 
                className="add-date-button"
                onClick={addSubEvent}
              >
                Aggiungi Data
              </button>
            </div>
            
            {eventData.subEvents.length > 0 ? (
              <div className="sub-events-list">
                <h4>Date Aggiunte:</h4>
                <ul>
                  {eventData.subEvents.map((subEvent, index) => (
                    <li key={index} className="sub-event-item">
                      <span>Data: {new Date(subEvent.date).toLocaleDateString()}</span>
                      <span>Biglietti: {subEvent.availableTickets}</span>
                      <button 
                        type="button" 
                        className="remove-button"
                        onClick={() => removeSubEvent(index)}
                      >
                        Rimuovi
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="no-dates-message">Nessuna data aggiunta. Aggiungi almeno una data per l'evento.</p>
            )}
          </div>
        )}
        
        <div className="form-actions">
          <button 
            type="button" 
            className="cancel-button"
            onClick={() => navigate('/admin/dashboard')}
          >
            Annulla
          </button>
          <button 
            type="submit" 
            className="submit-button"
            disabled={loading}
          >
            {loading ? 'Creazione in corso...' : 'Crea Evento'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateEvent;