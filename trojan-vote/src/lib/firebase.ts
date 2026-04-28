import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "placeholder-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "campus-vote-d0ea8.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "campus-vote-d0ea8",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "campus-vote-d0ea8.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "placeholder-sender",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "placeholder-app-id"
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

export { app, auth, db, functions };