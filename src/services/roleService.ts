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
  arrayRemove,
  increment,
  arrayUnion,
  runTransaction,
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
}) {
  const now = Date.now();
  const ref = await addDoc(collection(db, "roles"), {
    name: input.name,
    description: input.description ?? "",
    isPublished: !!input.isPublished,
    steps: [], // ✅ keep an index of step IDs
    createdAt: now,
    updatedAt: now,
  });
  return ref.id as string;
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
) {
  const now = Date.now();
  // Omit undefined/empty optional values
  const payload = Object.fromEntries(
    Object.entries({ ...input, createdAt: now, updatedAt: now }).filter(
      ([k, v]) => v !== undefined && v !== ""
    )
  );
  return await runTransaction(db, async (tx) => {
    const stepRef = doc(collection(db, "steps"));
    tx.set(stepRef, payload);
    const roleRef = doc(db, "roles", input.roleId);
    tx.update(roleRef, {
      steps: arrayUnion(stepRef.id),
      stepsCount: increment(1),
      updatedAt: Date.now(),
    });
    return stepRef.id;
  });
}

export async function deleteStep(stepId: string) {
  const stepRef = doc(db, "steps", stepId);
  const snap = await getDoc(stepRef);
  const roleId = (snap.data() as any)?.roleId;
  await deleteDoc(stepRef);

  if (roleId) {
    await updateDoc(doc(db, "roles", roleId), {
      steps: arrayRemove(stepId),
      stepsCount: increment(-1),
      updatedAt: Date.now(),
    });
  }
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
