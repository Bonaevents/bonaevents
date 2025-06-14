import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { FaCheckCircle, FaBan, FaShoppingCart, FaTimesCircle, FaQuestionCircle } from 'react-icons/fa';
import CreateTeamLeaderModal from './CreateTeamLeaderModal';
import TeamLeaderStats from '../statistics/TeamLeaderStats';
import './AdminStyles.css';

function TeamLeaderManagement() {
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ticketStats, setTicketStats] = useState({});

  useEffect(() => {
    fetchTeamLeaders();
  }, []);

  async function fetchTeamLeaders() {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'teamleader'));
      const snapshot = await getDocs(q);
      const teamLeadersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeamLeaders(teamLeadersData);
      
      // Recupera le statistiche dei biglietti per ogni team leader
      for (const leader of teamLeadersData) {
        await fetchTicketStats(leader.id);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching team leaders:', error);
      setLoading(false);
    }
  }

  async function fetchTicketStats(teamLeaderId) {
    try {
      const ticketsRef = collection(db, 'tickets');
      const q = query(ticketsRef, where('sellerId', '==', teamLeaderId));
      const snapshot = await getDocs(q);
      
      const stats = {
        total: 0,
        active: 0,
        validated: 0,
        disabled: 0,
        sold: 0,
        cancelled: 0
      };

      snapshot.docs.forEach(doc => {
        const ticket = doc.data();
        stats.total++;
        stats[ticket.status || 'active']++;
      });

      setTicketStats(prev => ({
        ...prev,
        [teamLeaderId]: stats
      }));
    } catch (error) {
      console.error('Error fetching ticket stats:', error);
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <FaCheckCircle className="status-icon active" />;
      case 'validated':
        return <FaCheckCircle className="status-icon validated" />;
      case 'disabled':
        return <FaBan className="status-icon disabled" />;
      case 'sold':
        return <FaShoppingCart className="status-icon sold" />;
      case 'cancelled':
        return <FaTimesCircle className="status-icon cancelled" />;
      default:
        return <FaQuestionCircle className="status-icon" />;
    }
  };

  if (loading) {
    return <div>Caricamento team leader...</div>;
  }

  return (
    <div className="team-leader-management">
      <div className="section-header">
        <h2>Gestione Team Leader</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          Nuovo Team Leader
        </button>
      </div>

      <div className="team-leaders-grid">
        {teamLeaders.map(teamLeader => (
          <div key={teamLeader.id} className="team-leader-card">
            <div 
              className="avatar-circle"
              onClick={() => setSelectedTeamLeader(teamLeader)}
            >
              {teamLeader.name.charAt(0).toUpperCase()}
            </div>
            <div className="team-leader-info">
              <h3>{teamLeader.name}</h3>
              <p><strong>Email:</strong> {teamLeader.email}</p>
              <p><strong>Team:</strong> {teamLeader.teamName}</p>
              
              {/* Statistiche biglietti */}
              {ticketStats[teamLeader.id] && (
                <div className="ticket-stats">
                  <h4>Statistiche Biglietti</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      {getStatusIcon('active')}
                      <span>Attivi: {ticketStats[teamLeader.id].active}</span>
                    </div>
                    <div className="stat-item">
                      {getStatusIcon('validated')}
                      <span>Validati: {ticketStats[teamLeader.id].validated}</span>
                    </div>
                    <div className="stat-item">
                      {getStatusIcon('disabled')}
                      <span>Disabilitati: {ticketStats[teamLeader.id].disabled}</span>
                    </div>
                    <div className="stat-item">
                      {getStatusIcon('sold')}
                      <span>Venduti: {ticketStats[teamLeader.id].sold}</span>
                    </div>
                    <div className="stat-item">
                      {getStatusIcon('cancelled')}
                      <span>Cancellati: {ticketStats[teamLeader.id].cancelled}</span>
                    </div>
                    <div className="stat-item total">
                      <span>Totale: {ticketStats[teamLeader.id].total}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <CreateTeamLeaderModal
          onClose={() => setShowCreateModal(false)}
          onTeamLeaderCreated={fetchTeamLeaders}
        />
      )}

      {selectedTeamLeader && (
        <TeamLeaderStats
          teamLeader={selectedTeamLeader}
          onClose={() => setSelectedTeamLeader(null)}
        />
      )}
    </div>
  );
}

export default TeamLeaderManagement; 