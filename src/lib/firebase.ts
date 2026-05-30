import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { getAnalytics, Analytics } from "firebase/analytics";
import { getStorage, FirebaseStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Static exports with explicit types to clear the 11 errors
export const auth: Auth = getAuth(app);
auth.languageCode = 'en';

// Direct Firestore initialization
export const db: Firestore = getFirestore(app);

// Analytics and Storage
export const storage: FirebaseStorage = getStorage(app);
export const analytics: Analytics = getAnalytics(app);