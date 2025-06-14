import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { DeviceProvider } from './contexts/DeviceContext';
import { useState, useEffect } from 'react';
import useTheme from './hooks/useTheme';
import './styles/theme.css';
import './styles/responsive.css';
import './App.css';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import PrivateRoute from './components/shared/PrivateRoute';
import InitialSetup from './components/auth/InitialSetup';
import ProtectedRoute from './components/shared/ProtectedRoute';
import AdminDashboard from './components/admin/AdminDashboard';
import ManagerDashboard from './components/manager/ManagerDashboard';
import TeamLeaderDashboard from './components/teamleader/TeamLeaderDashboard';
import PromoterDashboard from './components/promoter/PromoterDashboard';
import TicketHistory from './components/tickets/TicketHistory';
import TicketPage from './components/tickets/TicketPage';
import ValidatorPage from './pages/ValidatorPage';

function App() {
  const [isAppReady, setIsAppReady] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    // Gestione viewport
    const metaViewport = document.querySelector('meta[name="viewport"]');
    if (metaViewport) {
      metaViewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover, user-scalable=yes';
    }
    
    // Gestione safe areas
    document.documentElement.style.setProperty('--sat', 'env(safe-area-inset-top)');
    document.documentElement.style.setProperty('--sar', 'env(safe-area-inset-right)');
    document.documentElement.style.setProperty('--sab', 'env(safe-area-inset-bottom)');
    document.documentElement.style.setProperty('--sal', 'env(safe-area-inset-left)');
    
    // Assicurati che html e body abbiano overflow-y: auto
    document.documentElement.style.overflowY = 'auto';
    document.body.style.overflowY = 'auto';
    
    // Gestione altezza viewport
    const appHeight = () => {
      const doc = document.documentElement;
      const vh = window.innerHeight * 0.01;
      doc.style.setProperty('--vh', `${vh}px`);
      doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    };
    
    // Gestione orientamento
    const handleOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      document.documentElement.classList.toggle('portrait', isPortrait);
      document.documentElement.classList.toggle('landscape', !isPortrait);
    };
    
    // Gestione tema scuro in base alle preferenze di sistema
    const handleThemeChange = () => {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-theme', prefersDarkMode ? 'dark' : 'light');
      
      // Aggiorna meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', prefersDarkMode ? '#121212' : '#007bff');
      }
    };
    
    // Event listeners
    window.addEventListener('resize', appHeight);
    window.addEventListener('orientationchange', handleOrientation);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleThemeChange);
    
    // Rimuovi qualsiasi evento che blocca lo scorrimento
    document.removeEventListener('touchmove', preventScroll, { passive: false });
    
    // Inizializzazione
    appHeight();
    handleOrientation();
    handleThemeChange();
    
    // Imposta app come pronta
    const timer = setTimeout(() => {
      setIsAppReady(true);
    }, 300);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', appHeight);
      window.removeEventListener('orientationchange', handleOrientation);
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleThemeChange);
      clearTimeout(timer);
    };
  }, []);
  
  // Funzione che non viene usata ma è qui per evitare errori con removeEventListener
  const preventScroll = (e) => {};

  return (
    <div className={`app ${isAppReady ? 'app-ready' : 'app-loading'}`} style={{ overflowY: 'auto' }} data-theme={theme}>
      <Router>
        <ThemeProvider>
          <DeviceProvider>
            <AuthProvider>
              <NotificationProvider>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/initial-setup" element={<InitialSetup />} />
                  <Route 
                    path="/admin" 
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
                    path="/validate-ticket" 
                    element={
                      <ProtectedRoute requiredRole="canValidateTickets">
                        <ValidatorPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/ticket/:ticketCode" 
                    element={<TicketPage />} 
                  />
                  <Route 
                    path="/dashboard" 
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    } 
                  />
                  <Route path="/" element={<Navigate to="/login" />} />
                </Routes>
              </NotificationProvider>
            </AuthProvider>
          </DeviceProvider>
        </ThemeProvider>
      </Router>
    </div>
  );
}

export default App;