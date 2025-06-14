import { Navigate } from 'react-router-dom';
import { useAuthorization } from '../../hooks/useAuthorization';

function ProtectedRoute({ children, requiredRole, allowedRoles }) {
  const { userRole, loading, permissions } = useAuthorization();

  if (loading) {
    return <div>Caricamento...</div>;
  }

  // Se non c'è un ruolo utente, reindirizza al login
  if (!userRole) {
    return <Navigate to="/login" />;
  }

  // Se sono specificati ruoli consentiti, verifica se l'utente ha uno di questi ruoli
  if (allowedRoles) {
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/login" />;
    }
    return children;
  }

  // Se è richiesto un ruolo specifico, verifica i permessi
  if (requiredRole && !permissions[requiredRole]) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default ProtectedRoute; 