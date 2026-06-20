import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ─── Firebase Config ──────────────────────────────────────────────────────────
// NOTE: Firebase Storage is NOT used — media is handled by Cloudinary.
// This keeps the app on the free Spark plan with no credit card required.
const firebaseConfig = {
  apiKey: "AIzaSyC6Ze-tgrC4HkjnNTbTwkejbx8DAb-0sj8",
  authDomain: "chatsphere-d95de.firebaseapp.com",
  projectId: "chatsphere-d95de",
  storageBucket: "chatsphere-d95de.firebasestorage.app",
  messagingSenderId: "1017766328851",
  appId: "1017766328851:web:d6b327e8ffaca673905de6",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
