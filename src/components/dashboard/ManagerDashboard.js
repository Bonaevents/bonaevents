import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where, updateDoc, doc, writeBatch } from 'firebase/firestore';
import CreateEvent from '../events/CreateEvent';
import CreateTeamLeader from '../auth/CreateTeamLeader';
import TeamStatistics from '../statistics/TeamStatistics';
import EditEvent from '../events/EditEvent';
import CreatePromoter from '../auth/CreatePromoter';
import { FaUserTie, FaUsers, FaUser, FaChartBar, FaCalendar, FaMapMarkerAlt, FaEuroSign, FaEdit, FaTrash, FaPlus, FaUserPlus, FaCalendarAlt, FaExclamationTriangle } from 'react-icons/fa';
import './ManagerDashboard.css';
import { useAuth } from '../../contexts/AuthContext';
import ManagerStats from '../stats/ManagerStats';

function TeamLeaderCard({ leader, onViewStats, onDelete }) {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleDeleteClick = () => {
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    onDelete(leader.id);
    setShowConfirmDelete(false);
  };

  return (
    <div className="card team-leader-card">
      <div className="card-header">
        <div className="header-content">
          <FaUserTie className="leader-icon" />
          <div>
            <h4>{leader.name}</h4>
            <span className="email">{leader.email}</span>
          </div>
        </div>
      </div>

      <div className="card-actions">
        <button 
          className="btn btn-primary"
          onClick={() => onViewStats(leader.id)}
        >
          <FaChartBar /> Statistiche
        </button>
        <button 
          className="btn btn-danger"
          onClick={handleDeleteClick}
        >
          <FaTrash /> Elimina
        </button>
      </div>

      {leader.promoters.length > 0 && (
        <div className="promoters-list">
          <h5><FaUsers /> Promoter del Team</h5>
          {leader.promoters.map(promoter => (
            <div key={promoter.id} className="promoter-item">
              <FaUser className="promoter-icon" />
              <div>
                <div className="promoter-name">{promoter.name}</div>
                <div className="promoter-email">{promoter.email}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showConfirmDelete && (
        <div className="modal">
          <div className="modal-content delete-confirmation">
            <h3>Conferma Eliminazione</h3>
            <p>Sei sicuro di voler eliminare il team leader {leader.name}?</p>
            {leader.promoters.length > 0 && (
              <div className="warning-message">
                <FaExclamationTriangle /> Questo team leader ha {leader.promoters.length} promoter attivi.
                I promoter verranno scollegati dal team.
              </div>
            )}
            <div className="confirmation-actions">
              <button 
                className="btn btn-danger"
                onClick={handleConfirmDelete}
              >
                Conferma Eliminazione
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowConfirmDelete(false)}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EventCard({ event, onEdit, onDelete }) {
  return (
    <div className="event-card">
      <div className="card-header">
        <h3>{event.name}</h3>
        <div className="event-status">
          <span className={`badge ${event.availableTickets > 0 ? 'badge-success' : 'badge-danger'}`}>
            {event.availableTickets} biglietti disponibili
          </span>
        </div>
      </div>
      
      <div className="event-details">
        <div className="detail-item">
          <FaCalendar className="icon" />
          <span>{new Date(event.date).toLocaleDateString()}</span>
        </div>
        <div className="detail-item">
          <FaMapMarkerAlt className="icon" />
          <span>{event.location}</span>
        </div>
        <div className="detail-item">
          <FaEuroSign className="icon" />
          <span>{event.ticketPrice}€</span>
        </div>
      </div>

      <div className="card-actions">
        <button onClick={() => onEdit(event)} className="edit-button">
          <FaEdit /> Modifica
        </button>
        <button onClick={() => onDelete(event.id)} className="delete-button">
          <FaTrash /> Elimina
        </button>
      </div>
    </div>
  );
}

function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [events, setEvents] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showCreateTeamLeader, setShowCreateTeamLeader] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showCreatePromoter, setShowCreatePromoter] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [leaderToDelete, setLeaderToDelete] = useState(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Recupera i team leader
      const teamLeadersQuery = query(
        collection(db, 'users'),
        where('managerId', '==', currentUser.uid),
        where('role', '==', 'teamLeader')
      );
      const teamLeadersSnapshot = await getDocs(teamLeadersQuery);
      const teamLeadersData = await Promise.all(teamLeadersSnapshot.docs.map(async doc => {
        const leaderId = doc.id;
        
        // Conta correttamente i promoter per questo team leader
        const promotersQuery = query(
          collection(db, 'users'),
          where('teamLeaderId', '==', leaderId),
          where('role', '==', 'promoter')
        );
        const promotersSnapshot = await getDocs(promotersQuery);
        
        return {
          id: leaderId,
          ...doc.data(),
          promotersCount: promotersSnapshot.size // Questo è il numero corretto di promoter
        };
      }));

      setTeamLeaders(teamLeadersData);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei dati:', error);
      setLoading(false);
    }
  }

  async function handleDeleteEvent(eventId) {
    if (window.confirm('Sei sicuro di voler eliminare questo evento?')) {
      try {
        await updateDoc(doc(db, 'events', eventId), {
          status: 'deleted'
        });
        
        // Invece di fetchData(), aggiorniamo solo gli eventi
        setEvents(prevEvents => 
          prevEvents.map(event => 
            event.id === eventId 
              ? { ...event, status: 'deleted' }
              : event
          )
        );

      } catch (error) {
        console.error('Errore nella cancellazione dell\'evento:', error);
        alert('Errore durante l\'eliminazione dell\'evento');
      }
    }
  }

  const handleDeleteLeader = async (leaderId) => {
    try {
      setLoading(true);
      
      // Prima verifica se ci sono promoter associati
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', leaderId)
      );
      const promotersSnapshot = await getDocs(promotersQuery);

      // Usa una batch write per l'operazione atomica
      const batch = writeBatch(db);

      // Elimina o aggiorna i promoter
      promotersSnapshot.forEach((promoterDoc) => {
        batch.delete(promoterDoc.ref);
      });

      // Elimina il team leader
      const leaderRef = doc(db, 'users', leaderId);
      batch.delete(leaderRef);

      // Esegui il batch
      await batch.commit();

      // Aggiorna l'UI
      setTeamLeaders(prevLeaders => 
        prevLeaders.filter(leader => leader.id !== leaderId)
      );
      
      // Chiudi il modal
      setShowDeleteConfirm(false);
      setLeaderToDelete(null);

      // Mostra messaggio di successo
      alert('Team Leader eliminato con successo');

    } catch (error) {
      console.error('Errore nell\'eliminazione del team leader:', error);
      alert('Errore durante l\'eliminazione del team leader');
    } finally {
      setLoading(false);
    }
  };

  async function fetchTeamLeaders() {
    try {
      const leadersQuery = query(
        collection(db, 'users'),
        where('managerId', '==', currentUser.uid),
        where('role', '==', 'teamLeader')
      );
      const snapshot = await getDocs(leadersQuery);
      const leadersData = await Promise.all(snapshot.docs.map(async doc => {
        const leaderId = doc.id;
        // Conta i promoter per questo team leader
        const promotersQuery = query(
          collection(db, 'users'),
          where('teamLeaderId', '==', leaderId),
          where('role', '==', 'promoter')
        );
        const promotersSnapshot = await getDocs(promotersQuery);
        
        return {
          id: leaderId,
          ...doc.data(),
          promotersCount: promotersSnapshot.size // Numero effettivo di promoter
        };
      }));
      setTeamLeaders(leadersData);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei team leader:', error);
      setLoading(false);
    }
  }

  if (loading) return <div>Caricamento...</div>;

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Dashboard Manager</h2>
        <div className="action-buttons">
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateEvent(!showCreateEvent)}
          >
            <FaPlus /> {showCreateEvent ? 'Nascondi' : 'Nuovo Evento'}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => setShowCreateTeamLeader(!showCreateTeamLeader)}
          >
            <FaUserPlus /> {showCreateTeamLeader ? 'Nascondi' : 'Nuovo Team Leader'}
          </button>
          <button
            className="btn btn-success"
            onClick={() => setShowCreatePromoter(!showCreatePromoter)}
          >
            <FaUserPlus /> {showCreatePromoter ? 'Nascondi' : 'Nuovo Promoter'}
          </button>
        </div>
      </div>

      {/* Form di creazione */}
      {showCreateEvent && (
        <div className="create-form-container">
          <CreateEvent onEventCreated={() => {
            fetchData();
            setShowCreateEvent(false);
          }} />
        </div>
      )}

      {showCreateTeamLeader && (
        <div className="create-form-container">
          <CreateTeamLeader onTeamLeaderCreated={() => {
            fetchData();
            setShowCreateTeamLeader(false);
          }} />
        </div>
      )}

      {showCreatePromoter && (
        <div className="create-form-container">
          <CreatePromoter 
            teamLeaderId="" // Lasciamo vuoto per renderlo disponibile
            onPromoterCreated={() => {
              fetchData();
              setShowCreatePromoter(false);
            }} 
          />
        </div>
      )}

      {/* Sezione Team Leaders */}
      <section className="dashboard-section">
        <h3><FaUsers /> Team Leaders</h3>
        <div className="grid">
          {teamLeaders.map(leader => (
            <div 
              key={leader.id} 
              className="team-leader-card"
              onClick={() => setShowStats(true)}
            >
            <TeamLeaderCard
              leader={leader}
              onViewStats={() => setSelectedTeam(leader.id)}
              onDelete={handleDeleteLeader}
            />
            </div>
          ))}
        </div>
      </section>

      {/* Sezione Eventi */}
      <section className="dashboard-section">
        <h3><FaCalendarAlt /> Eventi</h3>
        {events.length === 0 ? (
          <p>Nessun evento disponibile</p>
        ) : (
          <div className="grid">
            {events.map(event => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={setEditingEvent}
                onDelete={handleDeleteEvent}
              />
            ))}
          </div>
        )}
      </section>

      {/* Modali */}
      {selectedTeam && (
        <div className="modal">
          <div className="modal-content">
            <TeamStatistics 
              teamId={selectedTeam} 
              onClose={() => setSelectedTeam(null)}
            />
          </div>
        </div>
      )}

      {editingEvent && (
        <div className="modal">
          <div className="modal-content">
            <EditEvent 
              event={editingEvent}
              onClose={() => setEditingEvent(null)}
              onEventUpdated={() => {
                fetchData();
                setEditingEvent(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Modal di conferma eliminazione */}
      {showDeleteConfirm && leaderToDelete && (
        <div className="modal">
          <div className="modal-content">
            <h3>Conferma Eliminazione</h3>
            <p>Sei sicuro di voler eliminare il team leader {leaderToDelete.name}?</p>
            <p style={{ color: '#dc3545', fontWeight: 'bold' }}>
              ATTENZIONE: Questa azione eliminerà permanentemente il team leader e tutti i suoi promoter.
              L'operazione non può essere annullata.
            </p>
            <div className="confirmation-actions">
              <button 
                className="confirm-button"
                onClick={() => handleDeleteLeader(leaderToDelete.id)}
                disabled={loading}
              >
                {loading ? 'Eliminazione...' : 'Elimina Definitivamente'}
              </button>
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setLeaderToDelete(null);
                }}
                disabled={loading}
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale delle statistiche */}
      {showStats && (
        <ManagerStats 
          managerId={currentUser.uid}
          onClose={() => setShowStats(false)}
        />
      )}
    </div>
  );
}

export default ManagerDashboard; 