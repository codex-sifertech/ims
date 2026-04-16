import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
// For MVP, we use placeholder config. In production, these should be ENV vars.
const firebaseConfig = {
    apiKey: "PLACEHOLDER_API_KEY",
    authDomain: "ims-platform.firebaseapp.com",
    projectId: "ims-platform",
    storageBucket: "ims-platform.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
