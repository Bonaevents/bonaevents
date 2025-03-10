import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import CreateUserModal from './CreateUserModal';
import EventManagement from './EventManagement';
import EditUserModal from './EditUserModal';
import './AdminDashboard.css';
import Header from '../common/Header';

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
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      
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

  if (loading) {
    return <div>Caricamento...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header />
      <div className="dashboard-content">
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
            <>
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
                        <td data-label="Nome">{user.name}</td>
                        <td data-label="Email">{user.email}</td>
                        <td data-label="Ruolo">{user.role}</td>
                        <td data-label="Assegnato a">
                          {user.teamLeaderId && `Team Leader: ${
                            teamLeaders.find(tl => tl.id === user.teamLeaderId)?.name || 'N/A'
                          }`}
                          {user.managerId && `Manager: ${
                            managers.find(m => m.id === user.managerId)?.name || 'N/A'
                          }`}
                        </td>
                        <td data-label="Stato">{user.status}</td>
                        <td data-label="Azioni">
                          <div className="action-buttons">
                            <button 
                              className="btn btn-primary"
                              onClick={() => setEditingUser(user)}
                            >
                              Modifica
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <EventManagement />
          )}

          {showCreateModal && (
            <CreateUserModal
              userType={createUserType}
              teamLeaders={teamLeaders}
              managers={managers}
              onClose={() => setShowCreateModal(false)}
              onUserCreated={fetchUsers}
            />
          )}

          {editingUser && (
            <EditUserModal
              user={editingUser}
              managers={managers}
              teamLeaders={teamLeaders}
              onClose={() => setEditingUser(null)}
              onUpdate={fetchUsers}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard; 