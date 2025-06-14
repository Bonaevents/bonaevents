import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { onSnapshot } from 'firebase/firestore';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      // Crea una query semplice con un solo ordinamento
      // Questo evita la necessità di indici composti
      const notificationsRef = collection(db, 'notifications');
      const q = query(
        notificationsRef,
        where('userId', '==', currentUser.uid)
      );
      
      const querySnapshot = await getDocs(q);
      const notificationsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp ? 
          new Date(doc.data().timestamp.seconds * 1000) : 
          new Date()
      }));
      
      setNotifications(notificationsData);
      
      // Aggiorna lo stato di non lette
      const unreadCount = notificationsData.filter(notification => !notification.read).length;
      setUnreadCount(unreadCount);
      
    } catch (error) {
      console.error('Errore nel recupero delle notifiche:', error);
      
      // Se l'errore riguarda l'indice mancante, consiglia la soluzione
      if (error.message && error.message.includes('index')) {
        console.warn('È necessario creare un indice composto in Firestore per la query delle notifiche.');
        console.warn('Si prega di seguire il link fornito nell\'errore per creare l\'indice necessario.');
        console.warn('In alternativa, è possibile usare una query più semplice senza ordinamento.');
        
        // Fallback a una query più semplice senza ordinamento
        try {
          const simpleQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', currentUser.uid)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          const simpleData = simpleSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp ? 
              new Date(doc.data().timestamp.seconds * 1000) : 
              new Date()
          }));
          
          // Ordinamento manuale dei risultati
          simpleData.sort((a, b) => b.timestamp - a.timestamp);
          
          setNotifications(simpleData);
          
          // Aggiorna lo stato di non lette
          const unreadCount = simpleData.filter(notification => !notification.read).length;
          setUnreadCount(unreadCount);
        } catch (fallbackError) {
          console.error('Errore anche nel fallback delle notifiche:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  // Aggiungere useEffect che chiama fetchNotifications quando currentUser cambia
  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser, fetchNotifications]);

  useEffect(() => {
    if (!currentUser) return;

    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationsData);
    }, (error) => {
      console.error('Errore nel recupero delle notifiche:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const value = {
    notifications,
    unreadCount,
    fetchNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
} 