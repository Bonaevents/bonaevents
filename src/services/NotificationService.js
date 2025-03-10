import { db } from '../firebase/config';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

// Funzione per inviare notifiche ai manager
export async function notifyManagers(title, body) {
  try {
    const managersQuery = query(
      collection(db, 'users'),
      where('role', '==', 'manager')
    );
    const managersSnapshot = await getDocs(managersQuery);
    
    managersSnapshot.docs.forEach(async (managerDoc) => {
      await addDoc(collection(db, 'notifications'), {
        userId: managerDoc.id,
        title,
        body,
        timestamp: new Date().toISOString(),
        read: false
      });
    });
  } catch (error) {
    console.error('Errore nell\'invio delle notifiche ai manager:', error);
  }
}

// Funzione per inviare notifiche ai team leader
export async function notifyTeamLeader(teamLeaderId, title, body) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: teamLeaderId,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false
    });
  } catch (error) {
    console.error('Errore nell\'invio della notifica al team leader:', error);
  }
}

// Funzione per inviare notifiche ai promoter
export async function notifyPromoter(promoterId, title, body) {
  try {
    await addDoc(collection(db, 'notifications'), {
      userId: promoterId,
      title,
      body,
      timestamp: new Date().toISOString(),
      read: false
    });
  } catch (error) {
    console.error('Errore nell\'invio della notifica al promoter:', error);
  }
}

// Funzione per inviare notifiche a tutti i promoter di un team leader
export async function notifyTeamPromoters(teamLeaderId, title, body) {
  try {
    const promotersQuery = query(
      collection(db, 'users'),
      where('teamLeaderId', '==', teamLeaderId),
      where('role', '==', 'promoter')
    );
    const promotersSnapshot = await getDocs(promotersQuery);
    
    promotersSnapshot.docs.forEach(async (promoterDoc) => {
      await addDoc(collection(db, 'notifications'), {
        userId: promoterDoc.id,
        title,
        body,
        timestamp: new Date().toISOString(),
        read: false
      });
    });
  } catch (error) {
    console.error('Errore nell\'invio delle notifiche ai promoter del team:', error);
  }
}

// Funzione per ottenere le notifiche di un utente
export async function getUserNotifications(userId) {
  try {
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(notificationsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Errore nel recupero delle notifiche:', error);
    return [];
  }
}

// Funzione per segnare una notifica come letta
export async function markNotificationAsRead(notificationId) {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
  } catch (error) {
    console.error('Errore nella marcatura della notifica come letta:', error);
  }
}