import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Calcola le commissioni per una vendita
export async function calculateCommissions(saleData) {
  const commissionRates = {
    promoter: 0.10, // 10% per il promoter
    teamLeader: 0.05, // 5% per il team leader
    manager: 0.02 // 2% per il manager
  };

  const totalAmount = saleData.totalPrice;
  
  return {
    promoterCommission: totalAmount * commissionRates.promoter,
    teamLeaderCommission: totalAmount * commissionRates.teamLeader,
    managerCommission: totalAmount * commissionRates.manager
  };
}

// Registra le commissioni nel database
export async function recordCommission(saleId, saleData, commissionData) {
  try {
    const commission = {
      saleId,
      eventId: saleData.eventId,
      promoterId: saleData.promoterId,
      teamLeaderId: saleData.teamLeaderId,
      managerId: saleData.managerId,
      ...commissionData,
      timestamp: new Date().toISOString(),
      status: 'pending' // pending, paid, cancelled
    };

    await addDoc(collection(db, 'commissions'), commission);
  } catch (error) {
    console.error('Errore nel salvataggio delle commissioni:', error);
    throw error;
  }
}

// Ottiene le commissioni per un utente specifico
export async function getUserCommissions(userId, role, status = 'pending') {
  try {
    const commissionsQuery = query(
      collection(db, 'commissions'),
      where(`${role}Id`, '==', userId),
      where('status', '==', status)
    );
    
    const snapshot = await getDocs(commissionsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Errore nel recupero delle commissioni:', error);
    return [];
  }
}

// Calcola il totale delle commissioni per un periodo specifico
export async function calculateTotalCommissions(userId, role, startDate, endDate) {
  try {
    const commissions = await getUserCommissions(userId, role);
    
    return commissions
      .filter(commission => {
        const commissionDate = new Date(commission.timestamp);
        return commissionDate >= startDate && commissionDate <= endDate;
      })
      .reduce((total, commission) => total + commission[`${role}Commission`], 0);
  } catch (error) {
    console.error('Errore nel calcolo delle commissioni totali:', error);
    return 0;
  }
}

// Aggiorna lo stato di una commissione
export async function updateCommissionStatus(commissionId, newStatus) {
  try {
    const commissionRef = doc(db, 'commissions', commissionId);
    await updateDoc(commissionRef, {
      status: newStatus,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Errore nell\'aggiornamento dello stato della commissione:', error);
    throw error;
  }
}

// Ottiene il riepilogo delle commissioni per un team leader
export async function getTeamLeaderCommissionsSummary(teamLeaderId) {
  try {
    const promotersQuery = query(
      collection(db, 'users'),
      where('teamLeaderId', '==', teamLeaderId),
      where('role', '==', 'promoter')
    );
    
    const promotersSnapshot = await getDocs(promotersQuery);
    const promoterIds = promotersSnapshot.docs.map(doc => doc.id);
    
    const commissionsQuery = query(
      collection(db, 'commissions'),
      where('promoterId', 'in', promoterIds)
    );
    
    const commissionsSnapshot = await getDocs(commissionsQuery);
    const commissions = commissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      totalCommissions: commissions.reduce((total, commission) => total + commission.teamLeaderCommission, 0),
      promotersSummary: promoterIds.map(promoterId => ({
        promoterId,
        commissions: commissions.filter(c => c.promoterId === promoterId)
      }))
    };
  } catch (error) {
    console.error('Errore nel recupero del riepilogo delle commissioni:', error);
    return null;
  }
}

// Ottiene le statistiche delle commissioni per un manager
export async function getManagerCommissionsStats() {
  try {
    const commissionsSnapshot = await getDocs(collection(db, 'commissions'));
    const commissions = commissionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      totalCommissions: commissions.reduce((total, commission) => total + commission.managerCommission, 0),
      totalPaid: commissions
        .filter(c => c.status === 'paid')
        .reduce((total, commission) => total + commission.managerCommission, 0),
      totalPending: commissions
        .filter(c => c.status === 'pending')
        .reduce((total, commission) => total + commission.managerCommission, 0),
      commissionsByTeam: await getCommissionsByTeam(commissions)
    };
  } catch (error) {
    console.error('Errore nel recupero delle statistiche delle commissioni:', error);
    return null;
  }
}

// Funzione helper per raggruppare le commissioni per team
async function getCommissionsByTeam(commissions) {
  const teamLeaders = new Set(commissions.map(c => c.teamLeaderId));
  const teamStats = {};

  for (const teamLeaderId of teamLeaders) {
    const teamCommissions = commissions.filter(c => c.teamLeaderId === teamLeaderId);
    teamStats[teamLeaderId] = {
      total: teamCommissions.reduce((total, commission) => total + commission.teamLeaderCommission, 0),
      count: teamCommissions.length
    };
  }

  return teamStats;
}