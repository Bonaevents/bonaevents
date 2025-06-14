import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthorization } from '../../hooks/useAuthorization';

function TeamStatistics({ teamId, onClose }) {
  const { userRole, loading: authLoading } = useAuthorization();
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, [teamId]);

  async function fetchStatistics() {
    try {
      // Recupera tutti i promoter del team
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', teamId),
        where('role', '==', 'promoter')
      );
      const promotersSnapshot = await getDocs(promotersQuery);
      const promoters = promotersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Per ogni promoter, recupera le sue vendite
      const promoterStats = await Promise.all(promoters.map(async (promoter) => {
        const salesQuery = query(
          collection(db, 'sales'),
          where('promoterId', '==', promoter.id)
        );
        const salesSnapshot = await getDocs(salesQuery);
        const sales = salesSnapshot.docs.map(doc => doc.data());

        return {
          promoter,
          totalSales: sales.length,
          totalCommissions: sales.reduce((acc, sale) => acc + (sale.commissionAmount || 0), 0),
          sales
        };
      }));

      setStatistics({
        teamTotalSales: promoterStats.reduce((acc, stat) => acc + stat.totalSales, 0),
        teamTotalCommissions: promoterStats.reduce((acc, stat) => acc + stat.totalCommissions, 0),
        promoterStats
      });

      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      setLoading(false);
    }
  }

  if (loading || authLoading) return <div>Caricamento statistiche...</div>;

  return (
    <div style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      backgroundColor: 'white',
      padding: '20px',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      maxWidth: '800px',
      width: '90%',
      maxHeight: '90vh',
      overflow: 'auto'
    }}>
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          fontSize: '20px',
          cursor: 'pointer'
        }}
      >
        ��
      </button>

      <h3>Statistiche del Team</h3>
      <div style={{ marginBottom: '20px' }}>
        {/* {userRole === 'admin' && ( */} 
          <p>Vendite totali: {statistics.teamTotalSales}</p>
        {/* )} */} 
        {userRole === 'admin' && ( // Mostra commissioni totali invece di ricavi
          <p>Commissioni totali: €{statistics.teamTotalCommissions.toFixed(2)}</p>
        )}
      </div>

      <h4>Statistiche per Promoter</h4>
      <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {statistics.promoterStats.map(({ promoter, totalSales, totalCommissions }) => (
          <div key={promoter.id} style={{
            padding: '1rem',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}>
            <h5>{promoter.name}</h5>
            {/* {userRole === 'admin' && ( */} 
              <p>Vendite: {totalSales}</p>
            {/* )} */} 
            {userRole === 'admin' && ( // Mostra commissioni invece di ricavi
              <p>Commissioni: €{totalCommissions.toFixed(2)}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TeamStatistics; 