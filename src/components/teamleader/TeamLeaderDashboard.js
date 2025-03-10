import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import PromoterStats from './PromoterStats';
import './TeamLeaderStyles.css';

function TeamLeaderDashboard() {
  const { currentUser } = useAuth();
  const [promoters, setPromoters] = useState([]);
  const [selectedPromoter, setSelectedPromoter] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPromoters();
  }, [currentUser.uid]);

  async function fetchPromoters() {
    try {
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', currentUser.uid),
        where('role', '==', 'promoter')
      );
      const snapshot = await getDocs(promotersQuery);
      const promotersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPromoters(promotersData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching promoters:', error);
      setLoading(false);
    }
  }

  if (loading) {
    return <div>Caricamento promoter...</div>;
  }

  return (
    <div className="dashboard-container">
      <h2>I Tuoi Promoter</h2>
      <div className="promoters-grid">
        {promoters.map(promoter => (
          <div 
            key={promoter.id} 
            className="promoter-card"
            onClick={() => setSelectedPromoter(promoter)}
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar-circle">
              {promoter.name ? promoter.name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="promoter-info">
              <h3>{promoter.name}</h3>
              <p>{promoter.email}</p>
            </div>
          </div>
        ))}
      </div>

      {selectedPromoter && (
        <PromoterStats
          promoter={selectedPromoter}
          onClose={() => setSelectedPromoter(null)}
        />
      )}
    </div>
  );
}

export default TeamLeaderDashboard; 