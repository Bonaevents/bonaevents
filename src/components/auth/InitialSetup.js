import { useState } from 'react';
import { db, auth } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import './InitialSetup.css';

function InitialSetup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Questo codice dovrebbe essere conservato in modo sicuro e cambiato regolarmente
  const SETUP_SECRET_CODE = "ADMIN_SETUP_2024_SECRET";

  async function handleSetupAdmin(e) {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (setupCode !== SETUP_SECRET_CODE) {
        throw new Error('Codice di setup non valido');
      }

      // Verifica se esiste già un admin
      const adminQuery = query(
        collection(db, 'users'),
        where('role', '==', 'admin')
      );
      const adminSnapshot = await getDocs(adminQuery);
      
      if (!adminSnapshot.empty) {
        throw new Error('Un admin è già stato configurato');
      }

      // Crea l'utente admin
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Crea il documento admin
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        role: 'admin',
        createdAt: new Date().toISOString(),
        status: 'active'
      });

      alert('Admin creato con successo!');
      window.location.href = '/login';

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="initial-setup-container">
      <div className="setup-card">
        <h2>Setup Iniziale Admin</h2>
        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSetupAdmin}>
          <div className="form-group">
            <label>Email Admin:</label>
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
              minLength="6"
            />
          </div>

          <div className="form-group">
            <label>Codice di Setup:</label>
            <input
              type="password"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="setup-button"
            disabled={loading}
          >
            {loading ? 'Creazione in corso...' : 'Crea Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default InitialSetup; 