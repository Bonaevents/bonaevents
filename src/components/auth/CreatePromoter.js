import { useState, useEffect } from 'react';
import { db, auth } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

function CreatePromoter({ onPromoterCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState('');
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    async function checkUserRole() {
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUserRole(userDoc.data().role);
        // Se è un team leader, imposta automaticamente il suo ID
        if (userDoc.data().role === 'teamLeader') {
          setSelectedTeamLeader(currentUser.uid);
        }
      }
    }
    checkUserRole();

    // Carica la lista dei team leader solo se l'utente è un manager
    async function fetchTeamLeaders() {
      const teamLeadersQuery = query(
        collection(db, 'users'),
        where('role', '==', 'teamLeader')
      );
      const snapshot = await getDocs(teamLeadersQuery);
      setTeamLeaders(snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })));
    }

    if (userRole === 'manager') {
      fetchTeamLeaders();
    }
  }, [currentUser, userRole]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Crea l'utente in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crea il documento dell'utente in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name,
        email,
        role: 'promoter',
        teamLeaderId: userRole === 'teamLeader' ? currentUser.uid : selectedTeamLeader,
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      setName('');
      setEmail('');
      setPassword('');
      setSelectedTeamLeader('');
      onPromoterCreated();

    } catch (error) {
      console.error('Errore nella creazione del promoter:', error);
      setError('Errore nella creazione del promoter: ' + error.message);
    }

    setLoading(false);
  }

  return (
    <div className="create-promoter-container">
      <h2>Crea Nuovo Promoter</h2>
      {error && <div className="error-message">{error}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Nome:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {/* Mostra il select dei team leader solo se l'utente è un manager */}
        {userRole === 'manager' && (
          <div className="form-group">
            <label>Team Leader:</label>
            <select
              value={selectedTeamLeader}
              onChange={(e) => setSelectedTeamLeader(e.target.value)}
              required
            >
              <option value="">Seleziona Team Leader</option>
              {teamLeaders.map(leader => (
                <option key={leader.id} value={leader.id}>
                  {leader.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="submit-button"
        >
          {loading ? 'Creazione in corso...' : 'Crea Promoter'}
        </button>
      </form>
    </div>
  );
}

export default CreatePromoter; 