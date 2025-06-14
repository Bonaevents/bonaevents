import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDnUy8yapRh2NnjY6aYBP5xMGmh07rxL54",
  authDomain: "bonaevents-edece.firebaseapp.com",
  projectId: "bonaevents-edece",
  storageBucket: "bonaevents-edece.firebasestorage.app",
  messagingSenderId: "417302600381",
  appId: "1:417302600381:web:19a59d64d4a4e24e6e35d4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); 