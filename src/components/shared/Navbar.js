import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import NotificationBell from '../notifications/NotificationBell';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { FaBars, FaTimes, FaTicketAlt } from 'react-icons/fa';
import './Navbar.css';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function getUserRole() {
      if (currentUser) {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      }
    }
    getUserRole();
  }, [currentUser]);

  async function handleLogout() {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Errore durante il logout:', error);
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <FaTicketAlt size={24} className="navbar-logo" />
        <span className="navbar-title">Ticket System</span>
      </div>

      <button className="navbar-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? <FaTimes /> : <FaBars />}
      </button>

      <div className={`navbar-menu ${isOpen ? 'is-open' : ''}`}>
        <Link to="/" className="navbar-item">Dashboard</Link>
        {userRole === 'manager' && (
          <Link to="/validate" className="navbar-item">Valida Biglietti</Link>
        )}
        
        <div className="navbar-end">
          <NotificationBell />
          <span className="navbar-user">{currentUser?.email}</span>
          <button className="navbar-logout" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar; 