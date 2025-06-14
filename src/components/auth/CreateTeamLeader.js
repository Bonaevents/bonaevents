import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/config';
import { doc, setDoc } from 'firebase/firestore';

function CreateTeamLeader({ onTeamLeaderCreated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const { signup } = useAuth();
  const { auth } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      const { user } = await signup(email, password);
      
      await setDoc(doc(db, 'users', user.uid), {
        email,
        name,
        role: 'teamLeader',
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      // Logout automatico dopo la creazione
      await auth.signOut();

      setEmail('');
      setPassword('');
      setName('');
      onTeamLeaderCreated();
    } catch (error) {
      setError('Errore durante la creazione del Team Leader: ' + error.message);
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto', padding: '20px' }}>
      <h3>Crea Nuovo Team Leader</h3>
      {error && <div style={{color: 'red', marginBottom: '10px'}}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nome:</label>
          <input 
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Email:</label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label>Password:</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '8px' }}
          />
        </div>
        <button 
          type="submit"
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Crea Team Leader
        </button>
      </form>
    </div>
  );
}

export default CreateTeamLeader; 