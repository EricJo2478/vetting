// src/services/approvalService.ts
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * We assume you mirror step-level progress here:
 * /users/{uid}/progress/{roleId}/entries/{stepId}
 * Fields include: userId, roleId, stepId, status, notes, submittedAt, approvedAt, approverId
 */

export interface EntryKey {
  userId: string;
  roleId: string;
  stepId: string;
}

export interface EntryData extends EntryKey {
  status: "submitted" | "changes_requested" | "approved";
  notes?: string;
  submittedAt?: number;
  approvedAt?: number;
  approverId?: string;
  roleName?: string;
  stepName?: string;
  userEmail?: string;
}

function entryRef(k: EntryKey) {
  return doc(db, "users", k.userId, "progress", k.roleId, "entries", k.stepId);
}

export async function approveEntry(entry: EntryData) {
  const ref = entryRef(entry);
  const now = Date.now();
  await updateDoc(ref, {
    status: "approved",
    approvedAt: now,
    approverId: (await import("firebase/auth")).getAuth().currentUser?.uid ?? null,
  });
}

export async function requestChangesForEntry(entry: EntryData & { notes?: string }) {
  const ref = entryRef(entry);
  await updateDoc(ref, {
    status: "changes_requested",
    notes: entry.notes ?? "",
  });
}

export async function reopenEntry(entry: EntryData) {
  const ref = entryRef(entry);
  await updateDoc(ref, {
    status: "submitted",
    approvedAt: null,
    approverId: null,
  });
}

/**
 * Optional helper for volunteers to "submit" a step.
 * Creates the entry if it doesn't exist.
 */
export async function submitEntry(entry: EntryKey & { notes?: string }) {
  const ref = entryRef(entry);
  const snap = await getDoc(ref);
  const now = Date.now();
  if (!snap.exists()) {
    await setDoc(ref, {
      ...entry,
      status: "submitted",
      notes: entry.notes ?? "",
      submittedAt: now,
    });
  } else {
    await updateDoc(ref, {
      status: "submitted",
      notes: entry.notes ?? "",
      submittedAt: now,
    });
  }
}
