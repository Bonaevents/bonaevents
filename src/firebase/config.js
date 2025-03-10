import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {

    apiKey: "AIzaSyCGqURtSwNx8OjqH4Jb_NUAccQjGwh9Yqk",
  
    authDomain: "ticket-management-system-c2706.firebaseapp.com",
  
    projectId: "ticket-management-system-c2706",
  
    storageBucket: "ticket-management-system-c2706.firebasestorage.app",
  
    messagingSenderId: "652749807449",
  
    appId: "1:652749807449:web:afc576e2a016435dec3648"
  
  };
  
  

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 