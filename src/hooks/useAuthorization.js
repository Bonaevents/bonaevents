import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export function useAuthorization() {
  const { currentUser } = useAuth();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchUserRole() {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserRole(userData.role);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserRole();
  }, [currentUser]);

  const permissions = {
    canCreateEvents: userRole === 'admin',
    canCreateUsers: userRole === 'admin',
    canAssignUsers: userRole === 'admin',
    canViewAllUsers: userRole === 'admin',
    canViewTeamStats: ['admin', 'manager'].includes(userRole),
    canViewPromoterStats: ['admin', 'manager', 'teamLeader'].includes(userRole),
    canSellTickets: ['admin', 'manager', 'teamLeader', 'promoter'].includes(userRole),
    canValidateTickets: ['admin', 'manager', 'validator'].includes(userRole)
  };

  return { userRole, loading, error, permissions };
} 