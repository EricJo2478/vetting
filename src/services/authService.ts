// src/services/authService.ts
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  UserCredential,
} from "firebase/auth";
import { auth } from "./firebase";
import { createUser, ensureUserProfile } from "./userService";
import { UserDoc } from "../types/User";

const googleProvider = new GoogleAuthProvider();

// Sign up with email & password
export async function signupWithEmail(
  email: string,
  password: string,
  profileData: Omit<UserDoc, "id">
): Promise<UserCredential> {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  // Create Firestore user profile
  await createUser({
    id: cred.user.uid,
    ...profileData,
  });

  return cred;
}

// Log in
export async function loginWithEmail(
  email: string,
  password: string
): Promise<UserCredential> {
  return await signInWithEmailAndPassword(auth, email, password);
}

// Password Reset
export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

// Popup flow (preferred on desktop)
export async function loginWithGooglePopup(): Promise<UserCredential> {
  const cred = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(cred.user);
  return cred;
}

// Redirect flow (fallback for mobile Safari, pop-up blockers)
export async function loginWithGoogleRedirect(): Promise<void> {
  await signInWithRedirect(auth, googleProvider);
  // After redirect returns to app, call handleRedirectResult()
}

// Use this on your redirect landing page to finish login + profile bootstrap
export async function handleRedirectResult(): Promise<UserCredential | null> {
  const { getRedirectResult } = await import("firebase/auth");
  const cred = await getRedirectResult(auth);
  if (cred) await ensureUserProfile(cred.user);
  return cred;
}

// Log out
export async function logout(): Promise<void> {
  return await signOut(auth);
}
