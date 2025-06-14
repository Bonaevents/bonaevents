import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs, where } from 'firebase/firestore';
import CreateUserModal from '../admin/CreateUserModal';
import EventManagement from '../admin/EventManagement';
import './AdminDashboard.css';

function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createUserType, setCreateUserType] = useState(null);
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [managers, setManagers] = useState([]);
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      // Recupera tutti gli utenti
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);

      // Filtra team leader e manager per le assegnazioni
      setTeamLeaders(usersData.filter(user => user.role === 'teamLeader'));
      setManagers(usersData.filter(user => user.role === 'manager'));
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
    }
  }

  const handleCreateUser = (userType) => {
    setCreateUserType(userType);
    setShowCreateModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (
      user.email.toLowerCase().includes(filter.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(filter.toLowerCase()))
    );
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="admin-dashboard">
      <div className="admin-tabs">
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Gestione Utenti
        </button>
        <button 
          className={`tab-button ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          Gestione Eventi
        </button>
      </div>

      {activeTab === 'users' ? (
        <div>
          <div className="dashboard-header">
            <h2>Gestione Utenti</h2>
            <div className="action-buttons">
              <button onClick={() => handleCreateUser('manager')}>
                Nuovo Manager
              </button>
              <button onClick={() => handleCreateUser('teamLeader')}>
                Nuovo Team Leader
              </button>
              <button onClick={() => handleCreateUser('promoter')}>
                Nuovo Promoter
              </button>
            </div>
          </div>

          <div className="filters">
            <input
              type="text"
              placeholder="Cerca per nome o email..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="search-input"
            />
            
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="role-filter"
            >
              <option value="all">Tutti i ruoli</option>
              <option value="manager">Manager</option>
              <option value="teamLeader">Team Leader</option>
              <option value="promoter">Promoter</option>
            </select>
          </div>

          <div className="users-table">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Ruolo</th>
                  <th>Assegnato a</th>
                  <th>Stato</th>
                  <th>Azioni</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.role}</td>
                    <td>
                      {user.teamLeaderId && `Team Leader: ${
                        teamLeaders.find(tl => tl.id === user.teamLeaderId)?.name || 'N/A'
                      }`}
                      {user.managerId && `Manager: ${
                        managers.find(m => m.id === user.managerId)?.name || 'N/A'
                      }`}
                    </td>
                    <td>{user.status}</td>
                    <td>
                      <button className="edit-button">Modifica</button>
                      <button className="reset-password-button">Reset Password</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showCreateModal && (
            <CreateUserModal
              userType={createUserType}
              teamLeaders={teamLeaders}
              managers={managers}
              onClose={() => setShowCreateModal(false)}
              onUserCreated={fetchUsers}
            />
          )}
        </div>
      ) : (
        <EventManagement />
      )}
    </div>
  );
}

export default AdminDashboard; 