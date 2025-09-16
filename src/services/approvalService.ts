// src/services/approvalService.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { iso, stripUndef } from "../utils";
import { StepStatus } from "../types/Progress";

/**
 * Canonical step status lives ONLY in users/{uid}/progress/{roleId}.steps.{stepId}.status
 * Values: "pending" | "in-progress" | "completed"
 *
 * Entries are the review queue/audit. We mirror the progress into entry.progressStatus
 * so the manager UI can render without extra reads.
 */

const entryRef = (userId: string, roleId: string, stepId: string) =>
  doc(db, "users", userId, "progress", roleId, "entries", stepId);
const progressRef = (userId: string, roleId: string) =>
  doc(db, "users", userId, "progress", roleId);

// Volunteer: set in-progress and (re)submit for review
export async function submitEntry({
  userId,
  roleId,
  stepId,
  notes,
}: {
  userId: string;
  roleId: string;
  stepId: string;
  notes?: string;
}) {
  const now = Date.now();
  const eRef = entryRef(userId, roleId, stepId);
  const pRef = progressRef(userId, roleId);

  // 1) canonical progress
  await setDoc(
    pRef,
    { steps: { [stepId]: { status: "in-progress" } } },
    { merge: true }
  );

  // 2) queue entry
  const snap = await getDoc(eRef);
  if (!snap.exists()) {
    await setDoc(
      eRef,
      stripUndef({
        userId,
        roleId,
        stepId,
        status: "submitted",
        progressStatus: "in-progress",
        submittedAt: now,
        notes: notes ?? "",
      })
    );
  } else {
    await updateDoc(
      eRef,
      stripUndef({
        status: "submitted",
        progressStatus: "in-progress",
        submittedAt: now,
        notes: notes ?? "",
        approvedAt: deleteField(),
        approverId: deleteField(),
      }) as any
    );
  }
}
export async function withdrawSubmission(
  uid: string,
  roleId: string,
  stepId: string
) {
  const progressRef = doc(db, "users", uid, "progress", roleId);
  const entryRef = doc(db, "users", uid, "progress", roleId, "entries", stepId);

  const batch = writeBatch(db);
  batch.set(
    progressRef,
    {
      steps: {
        [stepId]: {
          status: "pending" as StepStatus,
          updatedAt: serverTimestamp(),
          // clear "submittedAt" if you wish:
          submittedAt: null,
          approvedAt: null,
          approvedBy: null,
        },
      },
    },
    { merge: true }
  );
  batch.set(
    entryRef,
    {
      status: "pending" as StepStatus,
      withdrawnAt: serverTimestamp(),
    },
    { merge: true }
  );
  await batch.commit();
}

// Manager: approve -> completed (+optional expiresAt provided by manager)
export async function approveEntry({
  userId,
  roleId,
  stepId,
  notes,
  expiresAt,
}: {
  userId: string;
  roleId: string;
  stepId: string;
  notes?: string;
  expiresAt?: string;
}) {
  const now = Date.now();
  const approverId = auth.currentUser?.uid || null;
  const eRef = entryRef(userId, roleId, stepId);
  const pRef = progressRef(userId, roleId);

  // entry -> approved
  const eSnap = await getDoc(eRef);
  if (!eSnap.exists()) {
    await setDoc(
      eRef,
      stripUndef({
        userId,
        roleId,
        stepId,
        status: "approved",
        progressStatus: "completed",
        submittedAt: now,
        approvedAt: now,
        approverId,
        notes: notes ?? "",
      })
    );
  } else {
    await updateDoc(
      eRef,
      stripUndef({
        status: "approved",
        progressStatus: "completed",
        approvedAt: now,
        approverId,
        notes: notes ?? eSnap.data()?.notes ?? "",
      })
    );
  }

  // progress -> completed (manager may optionally set expiresAt)
  const completedAt = iso(new Date());
  await setDoc(
    pRef,
    {
      steps: {
        [stepId]: stripUndef({
          status: "completed",
          completedAt,
          ...(expiresAt ? { expiresAt } : {}),
        }),
      },
    },
    { merge: true }
  );
}

// Manager: knock back to pending (clear dates)
export async function returnToPending({
  userId,
  roleId,
  stepId,
  notes,
}: {
  userId: string;
  roleId: string;
  stepId: string;
  notes?: string;
}) {
  const now = Date.now();
  const eRef = entryRef(userId, roleId, stepId);
  const pRef = progressRef(userId, roleId);

  // progress -> pending (clear dates)
  await setDoc(
    pRef,
    { steps: { [stepId]: { status: "pending" } } },
    { merge: true }
  );
  await updateDoc(pRef, {
    [`steps.${stepId}.completedAt`]: deleteField(),
    [`steps.${stepId}.expiresAt`]: deleteField(),
  });

  // entry -> submitted (reset queue) + mirror progress
  const fields: any = stripUndef({
    status: "submitted",
    progressStatus: "pending",
    submittedAt: now,
    notes: notes ?? "",
  });
  fields.approvedAt = deleteField();
  fields.approverId = deleteField();

  await setDoc(eRef, fields, { merge: true });
}

// Optional wrappers for back-compat
export async function requestChangesForEntry(args: {
  userId: string;
  roleId: string;
  stepId: string;
  notes?: string;
}) {
  return returnToPending(args);
}
export async function reopenEntry(args: {
  userId: string;
  roleId: string;
  stepId: string;
  notes?: string;
}) {
  return returnToPending(args);
}
