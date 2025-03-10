import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import CreatePromoter from '../auth/CreatePromoter';
import { notifyPromoter } from '../../services/NotificationService';
import PromoterStatistics from '../statistics/PromoterStatistics';
import { FaUserPlus, FaUsers, FaUser, FaChartBar, FaCalendarAlt, FaToggleOn, FaToggleOff, FaUserMinus } from 'react-icons/fa';
import './TeamLeaderDashboard.css';

function PromoterCard({ promoter, onStatusChange, onRemove, onViewStats }) {
  return (
    <div className="card promoter-card">
      <div className="card-header">
        <div className="header-content">
          <FaUser className="promoter-icon" />
          <div>
            <h4>{promoter.name}</h4>
            <span className="email">{promoter.email}</span>
          </div>
        </div>
        <div className={`status-badge ${promoter.status === 'active' ? 'status-active' : 'status-inactive'}`}>
          {promoter.status === 'active' ? 'Attivo' : 'Inattivo'}
        </div>
      </div>

      <div className="card-actions">
        <button
          className={`btn ${promoter.status === 'active' ? 'btn-warning' : 'btn-success'}`}
          onClick={() => onStatusChange(promoter.id, promoter.status === 'active' ? 'inactive' : 'active')}
        >
          {promoter.status === 'active' ? <FaToggleOff /> : <FaToggleOn />}
          {promoter.status === 'active' ? 'Disattiva' : 'Attiva'}
        </button>
        <button
          className="btn btn-danger"
          onClick={() => onRemove(promoter.id)}
        >
          <FaUserMinus /> Rimuovi
        </button>
        <button
          className="btn btn-primary"
          onClick={() => onViewStats(promoter)}
        >
          <FaChartBar /> Statistiche
        </button>
      </div>
    </div>
  );
}

function AvailablePromoterCard({ promoter, onAdd }) {
  return (
    <div className="card available-promoter-card">
      <div className="card-header">
        <div className="header-content">
          <FaUser className="promoter-icon" />
          <div>
            <h4>{promoter.name}</h4>
            <span className="email">{promoter.email}</span>
          </div>
        </div>
      </div>
      <button
        className="btn btn-success"
        onClick={() => onAdd(promoter.id)}
      >
        <FaUserPlus /> Aggiungi al Team
      </button>
    </div>
  );
}

function EventCard({ event }) {
  return (
    <div className="card event-card">
      <div className="card-header">
        <h4>{event.name}</h4>
        <div className="event-status">
          <span className={`badge ${event.availableTickets > 0 ? 'badge-success' : 'badge-danger'}`}>
            {event.availableTickets} biglietti disponibili
          </span>
        </div>
      </div>
      <div className="event-details">
        <p><strong>Data:</strong> {new Date(event.date).toLocaleDateString()}</p>
        <p><strong>Luogo:</strong> {event.location}</p>
        <p><strong>Prezzo:</strong> €{event.price}</p>
      </div>
    </div>
  );
}

function TeamLeaderDashboard() {
  const { currentUser } = useAuth();
  const [promoters, setPromoters] = useState([]);
  const [availablePromoters, setAvailablePromoters] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePromoter, setShowCreatePromoter] = useState(false);
  const [selectedPromoter, setSelectedPromoter] = useState(null);
  const [showAddExisting, setShowAddExisting] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  async function fetchData() {
    try {
      // Recupera promoter del team
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', currentUser.uid),
        where('role', '==', 'promoter')
      );
      const promotersSnapshot = await getDocs(promotersQuery);
      const promotersData = promotersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromoters(promotersData);

      // Recupera promoter disponibili (senza team)
      const availablePromQuery = query(
        collection(db, 'users'),
        where('role', '==', 'promoter'),
        where('status', '!=', 'deleted'),
        where('teamLeaderId', '==', '')
      );
      const availablePromSnapshot = await getDocs(availablePromQuery);
      setAvailablePromoters(availablePromSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      // Recupera eventi
      const eventsQuery = query(collection(db, 'events'));
      const eventsSnapshot = await getDocs(eventsQuery);
      setEvents(eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));

      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei dati:', error);
      setLoading(false);
    }
  }

  async function handlePromoterStatusChange(promoterId, newStatus) {
    try {
      const promoterRef = doc(db, 'users', promoterId);
      await updateDoc(promoterRef, {
        status: newStatus
      });

      await notifyPromoter(promoterId,
        'Cambio stato account',
        `Il tuo account è stato ${newStatus === 'active' ? 'attivato' : 'disattivato'}`
      );

      fetchData();
    } catch (error) {
      console.error('Errore nel cambio di stato del promoter:', error);
    }
  }

  async function handleAddPromoterToTeam(promoterId) {
    try {
      const promoterRef = doc(db, 'users', promoterId);
      await updateDoc(promoterRef, {
        teamLeaderId: currentUser.uid
      });

      await notifyPromoter(promoterId,
        'Aggiunto al team',
        'Sei stato aggiunto a un nuovo team'
      );

      fetchData();
    } catch (error) {
      console.error('Errore nell\'aggiunta del promoter al team:', error);
    }
  }

  async function handleRemovePromoterFromTeam(promoterId) {
    try {
      const promoterRef = doc(db, 'users', promoterId);
      await updateDoc(promoterRef, {
        teamLeaderId: ''
      });

      await notifyPromoter(promoterId,
        'Rimosso dal team',
        'Sei stato rimosso dal team'
      );

      fetchData();
    } catch (error) {
      console.error('Errore nella rimozione del promoter dal team:', error);
    }
  }

  if (loading) return <div>Caricamento...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard Team Leader</h2>
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreatePromoter(!showCreatePromoter)}
          >
            <FaUserPlus /> {showCreatePromoter ? 'Nascondi' : 'Nuovo Promoter'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowAddExisting(!showAddExisting)}
          >
            <FaUsers /> {showAddExisting ? 'Nascondi' : 'Aggiungi Esistente'}
          </button>
        </div>
      </div>

      {showCreatePromoter && (
        <div className="create-form-container">
          <CreatePromoter 
            teamLeaderId={currentUser.uid}
            onPromoterCreated={() => {
              fetchData();
              setShowCreatePromoter(false);
            }} 
          />
        </div>
      )}

      {showAddExisting && (
        <section className="dashboard-section">
          <h3><FaUsers /> Promoter Disponibili</h3>
          <div className="grid">
            {availablePromoters.map(promoter => (
              <AvailablePromoterCard
                key={promoter.id}
                promoter={promoter}
                onAdd={handleAddPromoterToTeam}
              />
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-section">
        <h3><FaUsers /> I Miei Promoter</h3>
        <div className="grid">
          {promoters.map(promoter => (
            <PromoterCard
              key={promoter.id}
              promoter={promoter}
              onStatusChange={handlePromoterStatusChange}
              onRemove={handleRemovePromoterFromTeam}
              onViewStats={setSelectedPromoter}
            />
          ))}
        </div>
      </section>

      <section className="dashboard-section">
        <h3><FaCalendarAlt /> Eventi Disponibili</h3>
        <div className="grid">
          {events.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {selectedPromoter && (
        <div className="modal">
          <div className="modal-content">
            <PromoterStatistics 
              promoter={selectedPromoter}
              onClose={() => setSelectedPromoter(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default TeamLeaderDashboard; 