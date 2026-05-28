import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize app only if it doesn't exist
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
// Use the environment variable for Database ID, fallback to (default)
const dbId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "(default)";
export const db = getFirestore(app, dbId);

export { app };