import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import './TeamOverview.css'; // Creeremo questo file CSS
import { FaUserTie, FaUserShield, FaUserTag, FaTicketAlt, FaEuroSign } from 'react-icons/fa';
import UserTicketHistoryModal from './UserTicketHistoryModal'; // Importa il nuovo componente modale
import { useAuthorization } from '../../hooks/useAuthorization'; // Importa useAuthorization

function TeamOverview() {
  // const { currentUser } = useAuth(); // Rimuovi currentUser da useAuth
  const { userRole, loading: authLoading } = useAuthorization(); // Usa useAuthorization
  const [teamMembers, setTeamMembers] = useState([]);
  const [soldTickets, setSoldTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState(null); // Stato per membro selezionato
  const [isModalOpen, setIsModalOpen] = useState(false);   // Stato per visibilità modale

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // 1. Fetch tutti gli utenti (manager, teamleader, promoter)
        const usersRef = collection(db, 'users');
        const rolesToFetch = ['manager', 'teamLeader', 'promoter'];
        // Assicurati che il campo 'role' esista e sia indicizzato se necessario
        const usersQuery = query(usersRef, where('role', 'in', rolesToFetch));
        const usersSnapshot = await getDocs(usersQuery);
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 2. Fetch tutti i biglietti venduti per calcolare le stats
        const ticketsRef = collection(db, 'tickets');
        // Fetch tutti i biglietti. ATTENZIONE: può essere pesante se ci sono molti biglietti.
        // Considera un approccio più scalabile se necessario (es. Cloud Functions per aggregare stats).
        const ticketsSnapshot = await getDocs(ticketsRef);
        const ticketsData = ticketsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log("Fetched Users:", usersData);
        console.log("Fetched Tickets for Stats:", ticketsData);
        
        setTeamMembers(usersData);
        setSoldTickets(ticketsData);

      } catch (err) {
        console.error("Errore nel recupero dati team:", err);
        setError("Impossibile caricare i dati del team. " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Memoizzazione per elaborare e arricchire i dati del team
  const processedTeamData = useMemo(() => {
    if (!teamMembers.length) return { managers: [], teamLeaders: [], promoters: [] };

    // Mappa per accedere rapidamente agli utenti per ID
    const userMap = new Map(teamMembers.map(user => [user.id, user]));

    // Calcola le statistiche di vendita per ogni membro del team
    const salesStats = soldTickets.reduce((acc, ticket) => {
      // Assicurati che sellerId esista e sia una stringa valida
      const sellerId = ticket.sellerId || ticket.seller_id;
      if (typeof sellerId !== 'string' || !sellerId) return acc; 

      if (!acc[sellerId]) {
        acc[sellerId] = { totalTicketsSold: 0, totalRevenue: 0, totalCommissions: 0 };
      }
      // Usa quantity se presente e numerico, altrimenti 1
      const quantity = typeof ticket.quantity === 'number' && ticket.quantity > 0 ? ticket.quantity : 1;
      // Usa totalPrice o price se numerici, altrimenti 0
      const price = typeof ticket.totalPrice === 'number' ? ticket.totalPrice : (typeof ticket.price === 'number' ? ticket.price * quantity : 0); 

      acc[sellerId].totalTicketsSold += quantity; 
      acc[sellerId].totalRevenue += price; 
      acc[sellerId].totalCommissions += ticket.commissionAmount || 0;
      return acc;
    }, {});

    // Arricchisci i dati degli utenti con statistiche e assegnazioni
    const enrichedMembers = teamMembers.map(member => {
      const stats = salesStats[member.id] || { totalTicketsSold: 0, totalRevenue: 0, totalCommissions: 0 };
      let assignedToName = 'N/A';
      let roleLabel = member.role; // Default label

      // Trova nome assegnatario
      if (member.role === 'promoter' && member.assignedTeamLeaderId) {
        assignedToName = userMap.get(member.assignedTeamLeaderId)?.name || `ID: ${member.assignedTeamLeaderId}`;
        roleLabel = 'Promoter';
      } else if (member.role === 'teamLeader' && member.assignedManagerId) {
        assignedToName = userMap.get(member.assignedManagerId)?.name || `ID: ${member.assignedManagerId}`;
        roleLabel = 'Team Leader';
      } else if (member.role === 'manager') {
        roleLabel = 'Manager';
        assignedToName = '-'; // I manager non sono assegnati
      }
      
      return {
        ...member,
        totalTicketsSold: stats.totalTicketsSold,
        totalRevenue: stats.totalRevenue,
        totalCommissions: stats.totalCommissions,
        assignedToName,
        roleLabel // Usa etichetta più leggibile
      };
    });

    // Filtra per termine di ricerca
    const filteredMembers = enrichedMembers.filter(member => 
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Separa per ruolo
    const managers = filteredMembers.filter(m => m.role === 'manager').sort((a, b) => a.name.localeCompare(b.name));
    const teamLeaders = filteredMembers.filter(m => m.role === 'teamLeader').sort((a, b) => a.name.localeCompare(b.name));
    const promoters = filteredMembers.filter(m => m.role === 'promoter').sort((a, b) => a.name.localeCompare(b.name));

    return { managers, teamLeaders, promoters };

  }, [teamMembers, soldTickets, searchTerm]);

  // Funzione per aprire il modale con i biglietti del membro
  const handleViewMemberTickets = (member) => {
    setSelectedMember(member); // Salva i dati del membro selezionato
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedMember(null);
  };

  const renderTeamMemberCard = (member) => (
    <div 
      key={member.id} 
      className="team-member-card-overview card clickable" // Aggiunta classe clickable per stile cursore
      onClick={() => handleViewMemberTickets(member)} // Chiama la funzione al click
    >
      <div className="member-header">
        <span className={`role-icon role-${member.role}`}>
          {member.role === 'manager' ? <FaUserShield title="Manager"/> :
           member.role === 'teamLeader' ? <FaUserTie title="Team Leader"/> : <FaUserTag title="Promoter"/>}
        </span>
        <div className="member-info">
          <h3 title={member.name}>{member.name || 'Nome non disponibile'}</h3>
          <p className="email" title={member.email}>{member.email}</p>
          <p className="role">{member.roleLabel}</p> {/* Mostra label leggibile */}
          {member.role !== 'manager' && <p className="assigned" title={member.assignedToName}>Assegnato a: {member.assignedToName}</p>}
        </div>
      </div>
      <div className="member-stats">
        {/* {userRole === 'admin' && ( */} 
          <div className="stat-item" title={`${member.totalTicketsSold} biglietti venduti`}>
            <FaTicketAlt /> 
            <span>{member.totalTicketsSold}</span>
          </div>
        {/* )} */} 
        {/* Mostra Commissioni (solo admin) */} 
        {userRole === 'admin' && (
          <div className="stat-item" title={`€ ${member.totalCommissions.toFixed(2)} commissioni totali`}>
             {/* Icona Commissioni? Potremmo usare FaHandHoldingUsd o altro */}
             <FaEuroSign /> {/* Ricicliamo icona Euro per ora */}
             <span>{member.totalCommissions.toFixed(2)}</span>
           </div>
        )}
      </div>
    </div>
  );

  if (loading || authLoading) { // Considera authLoading
    return <div className="loading-container"><div className="loading-spinner"></div> Caricamento panoramica team...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="team-overview-container">
      <div className="section-header"> {/* Header sezione */}
         <h2>Panoramica Team</h2>
         <div className="team-filters">
           <input 
             type="search" // Usa type="search"
             placeholder="Cerca per nome o email..."
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="search-input-team" // Usa stile input globale se possibile
           />
         </div>
      </div>

      {processedTeamData.managers.length === 0 &&
       processedTeamData.teamLeaders.length === 0 &&
       processedTeamData.promoters.length === 0 &&
       !loading ? (
         <div className="no-results">
           Nessun membro del team trovato {searchTerm ? 'per i criteri di ricerca.' : '.'}
         </div>
      ) : (
        <>
          {processedTeamData.managers.length > 0 && (
            <section className="team-role-section">
              <h3><FaUserShield /> Managers ({processedTeamData.managers.length})</h3>
              <div className="team-grid"> {/* Usa classe grid globale */}
                {processedTeamData.managers.map(renderTeamMemberCard)}
              </div>
            </section>
          )}

          {processedTeamData.teamLeaders.length > 0 && (
            <section className="team-role-section">
              <h3><FaUserTie /> Team Leaders ({processedTeamData.teamLeaders.length})</h3>
              <div className="team-grid"> {/* Usa classe grid globale */}
                {processedTeamData.teamLeaders.map(renderTeamMemberCard)}
              </div>
            </section>
          )}

          {processedTeamData.promoters.length > 0 && (
            <section className="team-role-section">
              <h3><FaUserTag /> Promoters ({processedTeamData.promoters.length})</h3>
              <div className="team-grid"> {/* Usa classe grid globale */}
                {processedTeamData.promoters.map(renderTeamMemberCard)}
              </div>
            </section>
          )}
        </>
      )}

      {/* Render condizionale del Modale */} 
      {isModalOpen && selectedMember && (
        <UserTicketHistoryModal 
          member={selectedMember} 
          onClose={handleCloseModal} 
        />
      )}
    </div>
  );
}

export default TeamOverview;