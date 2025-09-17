// src/services/authService.ts
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  setPersistence,
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
} // src/services/authService.ts

try {
  setPersistence(auth, browserLocalPersistence);
} catch {
  // ignore if already set elsewhere
}

// Heuristics for environments where popups are blocked or flaky
function isProbablyMobile() {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (typeof window !== "undefined" && window.innerWidth < 768)
  );
}
function isInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|MiuiBrowser/i.test(
    ua
  );
}

/**
 * Smart Google login:
 *  - Desktop → popup
 *  - Mobile / in-app browsers → redirect
 * Returns a UserCredential on popup; returns null when redirect is initiated.
 */
export async function loginWithGoogleSmart(): Promise<UserCredential | null> {
  const provider = new GoogleAuthProvider();

  if (isProbablyMobile() || isInAppBrowser()) {
    await signInWithRedirect(auth, provider);
    return null; // browser navigates; result is handled later
  }

  // Desktop/regular browsers → popup
  return await signInWithPopup(auth, provider);
}

/** Call once on load (e.g., Login page) to finalize a prior redirect login. */
export async function handleGoogleRedirectResult(): Promise<UserCredential | null> {
  try {
    const res = await getRedirectResult(auth);
    return res; // null if there was no redirect
  } catch (err) {
    // surface to caller for toast/log
    throw err;
  }
}
