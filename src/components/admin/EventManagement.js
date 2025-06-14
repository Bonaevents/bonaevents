import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import EventStatistics from '../events/EventStatistics';
import EditEventModal from './EditEventModal';
import CreateEventModal from './CreateEventModal';
import EventList from './EventList';
import './AdminStyles.css';

function EventManagement() {
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEvents();
  }, []);

  // Ascoltatore per aggiornare gli eventi quando un biglietto viene eliminato/ripristinato
  useEffect(() => {
    const handleTicketUpdate = () => {
      console.log('Aggiornamento eventi in corso dopo modifica biglietti...');
      fetchEvents();
    };

    window.addEventListener('ticketQuantityUpdated', handleTicketUpdate);
    
    return () => {
      window.removeEventListener('ticketQuantityUpdated', handleTicketUpdate);
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const eventsSnapshot = await getDocs(collection(db, 'events'));
      const eventsData = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        isActive: doc.data().isActive !== false
      }));
      setEvents(eventsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Errore nel caricamento degli eventi');
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

  const handleToggleEventStatus = async (eventId, currentIsActive) => {
    const newIsActive = !currentIsActive;
    if (window.confirm(`Sei sicuro di voler ${newIsActive ? 'attivare' : 'disattivare'} questo evento?`)) {
      try {
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
          isActive: newIsActive
        });
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === eventId ? { ...event, isActive: newIsActive } : event
          )
        );
      } catch (error) {
        console.error(`Errore nell'aggiornamento dello stato dell'evento ${eventId}:`, error);
        setError(`Errore nel ${newIsActive ? 'attivare' : 'disattivare'} l'evento.`);
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

      <EventList 
        events={events} 
        onEdit={(event) => setSelectedEvent(event)}
        onDelete={handleDeleteEvent}
        onToggleStatus={handleToggleEventStatus}
      />

      {/* Modal creazione evento */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onEventCreated={() => {
            fetchEvents();
            setShowCreateModal(false);
          }}
        />
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