// src/services/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBZo1hbq7C20pS_OK-ahyiUE96lcjAgWmQ",
  authDomain: "vetting-caf2f.firebaseapp.com",
  projectId: "vetting-caf2f",
  storageBucket: "vetting-caf2f.firebasestorage.app",
  messagingSenderId: "727627155798",
  appId: "1:727627155798:web:e89bdc979c27e611c12ef7",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
