import { useState } from 'react';
import { FaUser, FaChartBar } from 'react-icons/fa';
import TeamLeaderStats from '../statistics/TeamLeaderStats';
import './PromoterDashboard.css';

function PromoterStats({ stats }) {
  const [showStats, setShowStats] = useState(false);

  return (
    <div className="stat-card" onClick={(e) => e.stopPropagation()}>
      <div className="stat-content">
        <h3>Biglietti Venduti</h3>
        <p>{stats.totalTickets}</p>
        <h3>Vendite Totali</h3>
        <p>€{stats.totalRevenue.toFixed(2)}</p>
        
        <button 
          className="stats-button"
          onClick={() => setShowStats(true)}
        >
          <FaChartBar /> Statistiche
        </button>
      </div>

      {showStats && (
        <div className="stats-modal" onClick={() => setShowStats(false)}>
          <div className="stats-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowStats(false)}>
              ×
            </button>
            <TeamLeaderStats />
          </div>
        </div>
      )}
    </div>
  );
}

export default PromoterStats;