import { useState } from 'react';
import { db, auth } from '../../firebase/config';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import './AdminStyles.css';

function EditUserModal({ user, managers, teamLeaders, onClose, onUpdate }) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);
  const [assignTo, setAssignTo] = useState(user.managerId || user.teamLeaderId || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userRef = doc(db, 'users', user.id);
      const userData = {
        name,
        role,
        status,
        updatedAt: new Date().toISOString()
      };

      // Gestisci le assegnazioni in base al ruolo
      if (role === 'teamLeader') {
        userData.managerId = assignTo;
        userData.teamLeaderId = null; // Rimuovi eventuali assegnazioni precedenti
      } else if (role === 'promoter') {
        userData.teamLeaderId = assignTo;
        userData.managerId = null; // Rimuovi eventuali assegnazioni precedenti
      } else {
        userData.managerId = null;
        userData.teamLeaderId = null;
      }

      await updateDoc(userRef, userData);
      onUpdate();
      onClose();
    } catch (error) {
      setError('Errore nella modifica dell\'utente: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    setLoading(true);
    setError('');

    try {
      await sendPasswordResetEmail(auth, user.email);
      alert('Email di reset password inviata con successo!');
    } catch (error) {
      setError('Errore nell\'invio dell\'email di reset: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser() {
    if (window.confirm('Sei sicuro di voler eliminare questo utente? Questa azione non può essere annullata.')) {
      setLoading(true);
      setError('');

      try {
        await deleteDoc(doc(db, 'users', user.id));
        onUpdate();
        onClose();
      } catch (error) {
        setError('Errore nell\'eliminazione dell\'utente: ' + error.message);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Modifica Utente</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="form-control"
            />
          </div>

          <div className="form-group">
            <label>Ruolo:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              className="form-control"
            >
              <option value="manager">Manager</option>
              <option value="teamLeader">Team Leader</option>
              <option value="promoter">Promoter</option>
            </select>
          </div>

          <div className="form-group">
            <label>Stato:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="form-control"
            >
              <option value="active">Attivo</option>
              <option value="suspended">Sospeso</option>
            </select>
          </div>

          {role === 'teamLeader' && (
            <div className="form-group">
              <label>Assegna a Manager:</label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="form-control"
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

          {role === 'promoter' && (
            <div className="form-group">
              <label>Assegna a Team Leader:</label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
                className="form-control"
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
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? 'Salvataggio...' : 'Salva Modifiche'}
            </button>
            <button 
              type="button" 
              className="btn btn-warning"
              onClick={handleResetPassword}
              disabled={loading}
            >
              Reset Password
            </button>
            <button 
              type="button" 
              className="btn btn-danger"
              onClick={handleDeleteUser}
              disabled={loading}
            >
              Elimina Utente
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

export default EditUserModal; 