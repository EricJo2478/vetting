// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import NavBar from "./components/Navbar";
import { Accordion } from "react-bootstrap";
import ModalButton from "./components/ModalButton";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
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
export const googleProvider = new GoogleAuthProvider();

export default function App() {
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null as User | null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this runs once on mount

  const handleGoogleLogin = async () => {
    console.log(auth, googleProvider);
    try {
      const user = await signInWithPopup(auth, googleProvider);
      setUser(user.user);
      // User successfully logged in, redirect or update UI
      console.log("User logged in with Google!");
    } catch (error) {
      console.error("Error during Google login:", error);
    }
  };

  return (
    <>
      <NavBar
        user={user}
        setPage={setPage}
        setUser={setUser}
        openLogin={handleGoogleLogin}
      />
      <h1>Welcome to the CISV Saskatoon Volunteer Vetting page</h1>
      <p>
        Below you will find a section on each step walking you through what is
        required to volunteer at a CISV programme (if you are over 18 years
        old).
      </p>
    </>
}
