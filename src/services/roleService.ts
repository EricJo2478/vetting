// src/services/roleService.ts
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { RoleDoc } from "../types/Role";

export async function getRoles(): Promise<RoleDoc[]> {
  const snap = await getDocs(collection(db, "roles"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as RoleDoc));
}

export async function getRole(roleId: string): Promise<RoleDoc | null> {
  const snap = await getDoc(doc(db, "roles", roleId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RoleDoc) : null;
}
