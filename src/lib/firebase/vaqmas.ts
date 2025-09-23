// Import the functions from the SDKs
import { deleteApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

// Firebase configuration
const firebaseConfig = {
    apiKey: import.meta.env.VITE_vaqmas_apiKey,
    authDomain: import.meta.env.VITE_vaqmas_authDomain,
    projectId: import.meta.env.VITE_vaqmas_projectId,
    storageBucket: import.meta.env.VITE_vaqmas_storageBucket,
    messagingSenderId: import.meta.env.VITE_vaqmas_messagingSenderId,
    appId: import.meta.env.VITE_vaqmas_appId,
    measurementId: import.meta.env.VITE_vaqmas_measurementId
};

// Initialize Firebase
let firebaseApp: FirebaseApp = getApps().find(app => app.name === 'vaqmas') || initializeApp(firebaseConfig, 'vaqmas');
deleteApp(firebaseApp);
firebaseApp = initializeApp(firebaseConfig, 'vaqmas');

// Export Database
export const db = getFirestore(firebaseApp)

// Export Authentication System
export const auth = getAuth(firebaseApp)

// Export Storage
export const storage = getStorage(firebaseApp);

// Export Functions
export const functions = getFunctions(firebaseApp);