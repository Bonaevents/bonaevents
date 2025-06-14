import { db, auth } from '../../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Questa funzione dovrebbe essere eseguita solo una volta in modo sicuro
// (ad esempio tramite Cloud Functions o script admin)
export async function setupInitialAdmin(email, password) {
  try {
    // Verifica se esiste già un admin
    const adminQuery = query(
      collection(db, 'users'),
      where('role', '==', 'admin')
    );
    const adminSnapshot = await getDocs(adminQuery);
    
    if (!adminSnapshot.empty) {
      throw new Error('Admin already exists');
    }

    // Crea l'utente admin in Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Crea il documento admin in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      role: 'admin',
      createdAt: new Date().toISOString(),
      status: 'active'
    });

    return userCredential.user;
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
} 