import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import TicketValidator from './components/tickets/TicketValidator';
import PrivateRoute from './components/shared/PrivateRoute';
import InitialSetup from './components/auth/InitialSetup';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import ManagerDashboard from './components/manager/ManagerDashboard';
import TeamLeaderDashboard from './components/team-leader/TeamLeaderDashboard';
import PromoterDashboard from './components/promoter/PromoterDashboard';
import TicketHistory from './components/tickets/TicketHistory';

function App() {
  return (
    <Router>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/initial-setup" element={<InitialSetup />} />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRole="canViewAllUsers">
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/manager/*" 
              element={
                <ProtectedRoute requiredRole="canViewTeamStats">
                  <ManagerDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/team-leader/*" 
              element={
                <ProtectedRoute requiredRole="canViewPromoterStats">
                  <TeamLeaderDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/promoter/*" 
              element={
                <ProtectedRoute requiredRole="canSellTickets">
                  <PromoterDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/promoter/tickets" 
              element={
                <ProtectedRoute allowedRoles={['promoter']}>
                  <TicketHistory />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/" 
              element={<Navigate to="/login" />} 
            />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;