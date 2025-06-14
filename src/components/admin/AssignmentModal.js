import { useState } from 'react';
import { db } from '../../firebase/config';
import { doc, updateDoc } from 'firebase/firestore';
import './AdminStyles.css';

function AssignmentModal({ user, managers, teamLeaders, onClose, onUpdate }) {
  const [selectedManager, setSelectedManager] = useState(user.managerId || '');
  const [selectedTeamLeader, setSelectedTeamLeader] = useState(user.teamLeaderId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.id);
      const updateData = {};

      if (user.role === 'teamLeader') {
        updateData.managerId = selectedManager;
      } else if (user.role === 'promoter') {
        updateData.teamLeaderId = selectedTeamLeader;
      }

      await updateDoc(userRef, updateData);
      onUpdate();
      onClose();
    } catch (error) {
      setError('Errore nell\'assegnazione: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Assegna {user.name}</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          {user.role === 'teamLeader' && (
            <div className="form-group">
              <label>Assegna al Manager:</label>
              <select
                value={selectedManager}
                onChange={(e) => setSelectedManager(e.target.value)}
                required
              >
                <option value="">Seleziona Manager</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {user.role === 'promoter' && (
            <div className="form-group">
              <label>Assegna al Team Leader:</label>
              <select
                value={selectedTeamLeader}
                onChange={(e) => setSelectedTeamLeader(e.target.value)}
                required
              >
                <option value="">Seleziona Team Leader</option>
                {teamLeaders.map(tl => (
                  <option key={tl.id} value={tl.id}>
                    {tl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvataggio...' : 'Salva Assegnazione'}
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

export default AssignmentModal; 