import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthorization } from '../../hooks/useAuthorization';
import AdminDashboard from './AdminDashboard';
import ManagerDashboard from './ManagerDashboard';
import TeamLeaderDashboard from './TeamLeaderDashboard';
import PromoterDashboard from './PromoterDashboard';

function Dashboard() {
  const { userRole, loading, error } = useAuthorization();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !userRole) {
      navigate('/login');
    }
  }, [loading, userRole, navigate]);

  if (loading) {
    return <div>Caricamento...</div>;
  }

  if (error) {
    return <div>Errore: {error.message}</div>;
  }

  const getDashboardByRole = () => {
    switch (userRole) {
      case 'admin':
        return <AdminDashboard />;
      case 'manager':
        return <ManagerDashboard />;
      case 'teamLeader':
        return <TeamLeaderDashboard />;
      case 'promoter':
        return <PromoterDashboard />;
      default:
        return <div>Ruolo non riconosciuto</div>;
    }
  };

  return (
    <div className="dashboard-container">
      {getDashboardByRole()}
    </div>
  );
}

export default Dashboard; 