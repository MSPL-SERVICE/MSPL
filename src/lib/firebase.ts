import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

// Validate configuration
const isConfigValid = !!firebaseConfig.apiKey && !!firebaseConfig.projectId;

let app;
let auth;
let db;
let analytics;
let storage;

if (isConfigValid) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  // Using the databaseId if provided
  const dbOptions = (firebaseConfig as any).firestoreDatabaseId ? { databaseId: (firebaseConfig as any).firestoreDatabaseId } : {};
  db = getFirestore(app, (dbOptions as any).databaseId);
  analytics = getAnalytics(app);
  storage = getStorage(app);
} else {
  console.error("Firebase configuration is invalid. Please check your configuration.");
  // Export dummy objects to prevent runtime errors in components
  auth = {} as any;
  db = {} as any;
  analytics = {} as any;
  storage = {} as any;
}

export { auth, db, analytics, storage };
