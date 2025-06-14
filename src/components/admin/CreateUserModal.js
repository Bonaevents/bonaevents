import { useState } from 'react';
import { db, auth } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import './AdminStyles.css';

function CreateUserModal({ onClose, onUserCreated, userType, teamLeaders, managers }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [assignTo, setAssignTo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Funzione per validare l'email
  const validateEmail = (email) => {
    const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;
    return emailRegex.test(email);
  };

  async function handleSubmit(e) {
    e.preventDefault();
    
    // Validazione Frontend dell'Email
    if (!validateEmail(email)) {
      setError('Inserisci un indirizzo email valido (es. nome@dominio.com).');
      return; // Interrompi se l'email non è valida
    }

    setLoading(true);
    setError('');

    try {
      // Creazione dell'utente
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Preparazione dei dati utente
      const userData = {
        uid: user.uid,
        email,
        name,
        role: userType,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      // Gestione delle assegnazioni in base al ruolo
      if (userType === 'teamLeader' && assignTo) {
        userData.managerId = assignTo;
      }

      if (userType === 'promoter' && assignTo) {
        userData.teamLeaderId = assignTo;
      }

      // Per i validatori non serve assegnazione
      if (userType === 'validator') {
        userData.canValidateTickets = true;
      }

      // Salvataggio dei dati utente nel database
      await setDoc(doc(db, 'users', user.uid), userData);

      // Chiusura del modale e aggiornamento della lista utenti
      onUserCreated();
      onClose();
    } catch (error) {
      console.error('Error creating user:', error);
      // Personalizza messaggio di errore Firebase se necessario
      if (error.code === 'auth/email-already-in-use') {
          setError('Questo indirizzo email è già in uso da un altro account.');
      } else if (error.code === 'auth/weak-password') {
          setError('La password è troppo debole. Deve essere lunga almeno 6 caratteri.');
      } else {
         setError('Errore nella creazione dell\'utente: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Crea Nuovo {userType}</h2>
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
              minLength="6"
            />
          </div>

          {userType === 'promoter' && teamLeaders && (
            <div className="form-group">
              <label>Assegna a Team Leader:</label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
              >
                <option value="">Seleziona Team Leader</option>
                {teamLeaders.map(tl => (
                  <option key={tl.id} value={tl.id}>{tl.name}</option>
                ))}
              </select>
            </div>
          )}

          {userType === 'teamLeader' && managers && (
            <div className="form-group">
              <label>Assegna a Manager:</label>
              <select
                value={assignTo}
                onChange={(e) => setAssignTo(e.target.value)}
              >
                <option value="">Seleziona Manager</option>
                {managers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {userType === 'validator' && (
            <div className="info-message">
              <p>Questo utente avrà solo la capacità di validare i biglietti.</p>
              <p>Non sarà assegnato a nessun manager o team leader.</p>
            </div>
          )}

          <div className="modal-actions">
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Creazione...' : 'Crea Utente'}
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

export default CreateUserModal; 