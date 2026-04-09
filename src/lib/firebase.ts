import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Mock configuration - Replace with your actual Firebase config keys later
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-messaging-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id"
};

// Initialize Firebase only if it hasn't been initialized already (important for Next.js SSR/HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Export Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);
