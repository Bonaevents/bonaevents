import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import CreateTeamLeaderModal from './CreateTeamLeaderModal';
import TeamLeaderStats from '../statistics/TeamLeaderStats';
import './AdminStyles.css';

function TeamLeaderManagement() {
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState(null);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    } catch (error) {
      console.error('Error fetching team leaders:', error);
      setLoading(false);
    }
  }

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