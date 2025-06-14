import { useState } from 'react';
import { FaUser, FaChartBar, FaTicketAlt, FaEuroSign } from 'react-icons/fa';
import TeamLeaderStats from '../statistics/TeamLeaderStats';
import './PromoterDashboard.css';

function PromoterStats({ stats, onClose }) {
  const [showDetailedStats, setShowDetailedStats] = useState(false);

  return (
    <div className="stat-card" onClick={(e) => e.stopPropagation()}>
      <div className="stat-content">
        <div className="stats-header">
          <h2>Statistiche Promoter</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="stats-summary">
          <div className="summary-stat">
            <FaTicketAlt className="stat-icon" />
            <div className="stat-info">
              <h3>Biglietti Venduti</h3>
              <p className="stat-value">{stats.totalTickets || 0}</p>
            </div>
          </div>

          <div className="summary-stat">
            <FaEuroSign className="stat-icon" />
            <div className="stat-info">
              <h3>Incasso Totale</h3>
              <p className="stat-value">€{(stats.totalRevenue || 0).toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <button 
          className="stats-button"
          onClick={() => setShowDetailedStats(true)}
        >
          <FaChartBar /> Statistiche Dettagliate
        </button>
      </div>

      {showDetailedStats && (
        <div className="stats-modal" onClick={() => setShowDetailedStats(false)}>
          <div className="stats-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-button" onClick={() => setShowDetailedStats(false)}>
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