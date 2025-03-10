import { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { FaUser, FaTicketAlt, FaEuroSign, FaQrcode } from 'react-icons/fa';
import Header from '../common/Header';
import TicketValidator from '../tickets/TicketValidator';
import './ManagerDashboard.css';
import TeamLeaderStats from '../statistics/TeamLeaderStats';

function ManagerDashboard() {
  const { currentUser } = useAuth();
  const [teamLeaders, setTeamLeaders] = useState([]);
  const [selectedTeamLeader, setSelectedTeamLeader] = useState(null);
  const [teamLeaderStats, setTeamLeaderStats] = useState(null);
  const [activeTab, setActiveTab] = useState('team'); // 'team' o 'validator'
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [filteredStats, setFilteredStats] = useState(null);

  useEffect(() => {
    fetchTeamLeaders();
  }, [currentUser]);

  async function fetchTeamLeaders() {
    try {
      const leadersQuery = query(
        collection(db, 'users'),
        where('managerId', '==', currentUser.uid),
        where('role', '==', 'teamLeader')
      );
      const snapshot = await getDocs(leadersQuery);
      const leadersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTeamLeaders(leadersData);
      setLoading(false);
    } catch (error) {
      console.error('Errore nel recupero dei team leader:', error);
      setLoading(false);
    }
  }

  async function fetchTeamLeaderStats(teamLeaderId) {
    try {
      // Recupera tutti i promoter del team leader
      const promotersQuery = query(
        collection(db, 'users'),
        where('teamLeaderId', '==', teamLeaderId),
        where('role', '==', 'promoter')
      );
      const promotersSnapshot = await getDocs(promotersQuery);
      const promoters = promotersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Per ogni promoter, recupera le statistiche di vendita
      const promoterStats = await Promise.all(
        promoters.map(async (promoter) => {
          const ticketsQuery = query(
            collection(db, 'tickets'),
            where('sellerId', '==', promoter.id)
          );
          const ticketsSnapshot = await getDocs(ticketsQuery);
          
          const eventStats = {};
          ticketsSnapshot.docs.forEach(doc => {
            const ticket = doc.data();
            if (!eventStats[ticket.eventId]) {
              eventStats[ticket.eventId] = {
                eventId: ticket.eventId,
                eventName: ticket.eventName,
                totalTickets: 0,
                totalRevenue: 0
              };
            }
            eventStats[ticket.eventId].totalTickets += ticket.quantity;
            eventStats[ticket.eventId].totalRevenue += ticket.price * ticket.quantity;
          });

          return {
            promoter,
            events: Object.values(eventStats)
          };
        })
      );

      return promoterStats;
    } catch (error) {
      console.error('Errore nel recupero delle statistiche:', error);
      return [];
    }
  }

  const handleTeamLeaderClick = (leader) => {
    setSelectedTeamLeader(leader);
  };

  useEffect(() => {
    if (teamLeaderStats) {
      const filtered = teamLeaderStats.map(({ promoter, events }) => ({
        promoter,
        events: events.filter(event => {
          const matchesSearch = event.eventName.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesDate = !dateFilter || event.date === dateFilter;
          return matchesSearch && matchesDate;
        })
      })).filter(stat => stat.events.length > 0);
      setFilteredStats(filtered);
    }
  }, [teamLeaderStats, searchTerm, dateFilter]);

  return (
    <div className="dashboard-container">
      <Header />
      
      <div className="tabs-container">
        <button 
          className={`tab-button ${activeTab === 'team' ? 'active' : ''}`}
          onClick={() => setActiveTab('team')}
        >
          <FaUser /> Team Leaders
        </button>
        <button 
          className={`tab-button ${activeTab === 'validator' ? 'active' : ''}`}
          onClick={() => setActiveTab('validator')}
        >
          <FaQrcode /> Valida Biglietti
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'team' ? (
          <div className="team-leaders-section">
            <h2>I Miei Team Leader</h2>
            
            <div className="leaders-grid">
              {teamLeaders.map(leader => (
                <div 
                  key={leader.id}
                  className="leader-card"
                  onClick={() => {
                    console.log("Card cliccata:", leader);
                    handleTeamLeaderClick(leader);
                  }}
                >
                  <div className="leader-icon">
                    <FaUser size={24} />
                  </div>
                  <h3>{leader.name}</h3>
                  <p>{leader.email}</p>
                  <div className="leader-stats">
                    <div className="stat">
                      <FaUser />
                      <span>{leader.promotersCount || 0} Promoter</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {selectedTeamLeader && (
              <TeamLeaderStats 
                teamLeader={selectedTeamLeader}
                onClose={() => setSelectedTeamLeader(null)}
              />
            )}
          </div>
        ) : (
          <div className="validator-section">
            <h2>Validazione Biglietti</h2>
            <TicketValidator />
          </div>
        )}
      </div>
    </div>
  );
}

export default ManagerDashboard; 