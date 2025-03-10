import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { FaUser, FaLock, FaEnvelope } from 'react-icons/fa';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      const { user } = await login(email, password);
      
      // Verifica il ruolo dell'utente
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.data();
      
      // Reindirizza in base al ruolo
      switch(userData.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'manager':
          navigate('/manager');
          break;
        case 'teamLeader':
          navigate('/team-leader');
          break;
        case 'promoter':
          navigate('/promoter');
          break;
        default:
          navigate('/');
      }
    } catch (error) {
      setError('Credenziali non valide');
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <img src="/logo.PNG" alt="Logo" className="login-logo" />
          <h2>Accedi</h2>
          <p>Benvenuto nel sistema di gestione biglietti</p>
        </div>

        {error && <div className="error-message">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <div className="input-with-icon">
              <FaUser className="input-icon" />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <div className="input-with-icon">
              <FaLock className="input-icon" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="login-button">
            Accedi
          </button>
        </form>

        <div className="login-footer">
          <p>© 2024 Ticket Management System</p>
        </div>
      </div>
    </div>
  );
}

export default Login; 