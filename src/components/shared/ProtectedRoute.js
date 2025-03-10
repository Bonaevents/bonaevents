import { Navigate } from 'react-router-dom';
import { useAuthorization } from '../../hooks/useAuthorization';

function ProtectedRoute({ children, requiredRole }) {
  const { userRole, loading, permissions } = useAuthorization();

  if (loading) {
    return <div>Caricamento...</div>;
  }

  if (!userRole || (requiredRole && !permissions[requiredRole])) {
    return <Navigate to="/login" />;
  }

  return children;
}

export default ProtectedRoute; 