import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import './UserManagement.css';

function UserManagement() {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    isActive: true
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef);
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
    } catch (error) {
      console.error('Errore nel caricamento degli utenti:', error);
      setError('Errore nel caricamento degli utenti');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || '',
      isActive: user.isActive !== false
    });
  };

  const handleUpdate = async () => {
    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
        isActive: editForm.isActive
      });

      setEditingUser(null);
      fetchUsers();
    } catch (error) {
      console.error('Errore nell\'aggiornamento dell\'utente:', error);
      setError('Errore nell\'aggiornamento dell\'utente');
    }
  };

  const handleResetPassword = async (userId) => {
    try {
      // Implementa la logica di reset password
      // Questa funzione dovrebbe essere implementata nel backend
      alert('Password reset email inviata all\'utente');
    } catch (error) {
      console.error('Errore nel reset della password:', error);
      setError('Errore nel reset della password');
    }
  };

  if (loading) return <div className="loading">Caricamento...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="user-management">
      <h2>Gestione Utenti</h2>
      
      <div className="users-grid">
        {users.map(user => (
          <div key={user.id} className="user-card">
            <div className="user-info">
              <h3>{user.name || 'Nome non impostato'}</h3>
              <p>{user.email}</p>
              <p>Ruolo: {user.role}</p>
              <p>Stato: {user.isActive ? 'Attivo' : 'Disattivato'}</p>
            </div>

            <div className="user-actions">
              <button
                className="btn-edit"
                onClick={() => handleEdit(user)}
              >
                Modifica
              </button>
              <button
                className="btn-reset"
                onClick={() => handleResetPassword(user.id)}
              >
                Reset Password
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Modifica Utente</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}>
              <div className="form-group">
                <label>Nome:</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Ruolo:</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                  required
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="teamLeader">Team Leader</option>
                  <option value="promoter">Promoter</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                  />
                  Account Attivo
                </label>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-primary">
                  Salva Modifiche
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setEditingUser(null)}
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default UserManagement; 