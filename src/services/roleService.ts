// src/services/roleService.ts
import {
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  where,
  query,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { RoleDoc } from "../types/Role";
import { StepDoc } from "../types/Step";

export async function getRoles(publishedOnly?: boolean): Promise<RoleDoc[]> {
  const col = collection(db, "roles");
  const clauses: any[] = [];
  if (publishedOnly) clauses.push(where("isPublished", "==", true));
  const q = clauses.length
    ? query(col, ...clauses, orderBy("name", "asc"))
    : query(col, orderBy("name", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  })) as RoleDoc[];
}

export async function getRole(roleId: string): Promise<RoleDoc | null> {
  const snap = await getDoc(doc(db, "roles", roleId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as RoleDoc) : null;
}

export async function createRole(input: {
  name: string;
  description?: string;
  isPublished?: boolean;
}): Promise<string> {
  const col = collection(db, "roles");
  const now = Date.now();
  const docRef = await addDoc(col, {
    name: input.name,
    description: input.description ?? "",
    isPublished: !!input.isPublished,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id as string;
}

export async function updateRole(
  roleId: string,
  patch: Partial<Omit<RoleDoc, "id">>
): Promise<void> {
  const ref = doc(db, "roles", roleId);
  await updateDoc(ref, { ...patch, updatedAt: Date.now() } as any);
}

export async function publishRole(
  roleId: string,
  isPublished: boolean
): Promise<void> {
  await updateRole(roleId, { isPublished });
}

export async function addStep(
  input: Omit<StepDoc, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const col = collection(db, "steps");
  const now = Date.now();
  const docRef = await addDoc(col, {
    ...input,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id as string;
}

export async function updateStep(
  stepId: string,
  patch: Partial<Omit<StepDoc, "id" | "roleId">>
): Promise<void> {
  const ref = doc(db, "steps", stepId);
  await updateDoc(ref, { ...patch, updatedAt: Date.now() } as any);
}

export async function getStepsByRole(roleId: string): Promise<StepDoc[]> {
  const col = collection(db, "steps");
  const q = query(col, where("roleId", "==", roleId), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  })) as StepDoc[];
}

export async function deleteStep(stepId: string): Promise<void> {
  const ref = doc(db, "steps", stepId);
  await deleteDoc(ref);
}
