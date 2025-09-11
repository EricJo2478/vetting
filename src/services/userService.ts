// src/services/userService.ts
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { UserDoc } from "../types/User";
import { UserCredential } from "firebase/auth";

export async function createUser(user: UserDoc): Promise<void> {
  await setDoc(doc(db, "users", user.id), user);
}

export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as UserDoc) : null;
}

export async function updateUser(
  uid: string,
  data: Partial<UserDoc>
): Promise<void> {
  await updateDoc(doc(db, "users", uid), data);
}

export async function deleteUser(uid: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid));
}

// Create profile only if it doesn't exist yet
export async function ensureUserProfile(cred: UserCredential): Promise<void> {
  const u = cred.user;
  const ref = doc(db, "users", u.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return;

  const profile: UserDoc = {
    id: u.uid,
    email: u.email ?? "",
    name: u.displayName ?? "",
    systemRole: "volunteer", // sensible default
    roleIds: [],
    createdAt: new Date().toISOString(),
  };

  await setDoc(ref, profile, { merge: true });
}
