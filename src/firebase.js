import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAm4TIYOC-R4pXgevHFzueZphM8txZaThE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "nexus-work-platform.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "nexus-work-platform",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "nexus-work-platform.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "32514993988",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:32514993988:web:651a305cfa6775d3dd7111",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-16BLGGYSYZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
