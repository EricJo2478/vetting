// src/services/approvalService.ts
import {
  doc,
  setDoc,
  updateDoc,
  getDoc,
  DocumentReference,
  deleteField,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { useAuth } from "../hooks/useAuth";
import { getStepsByRole } from "./roleService";
import { getStep } from "./stepService";
import { addMonths, iso, stripUndef } from "../utils";

/**
 * We assume you mirror step-level progress here:
 * /users/{uid}/progress/{roleId}/entries/{stepId}
 * Fields include: userId, roleId, stepId, status, notes, submittedAt, approvedAt, approverId
 */

const entryRef = (userId: string, roleId: string, stepId: string) =>
  doc(db, "users", userId, "progress", roleId, "entries", stepId);

const progressRef = (userId: string, roleId: string) =>
  doc(db, "users", userId, "progress", roleId);

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
// APPROVE: entry -> approved, progress -> completed (+dates)
export async function approveEntry({
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
  const eRef = entryRef(userId, roleId, stepId);
  const pRef = progressRef(userId, roleId);
  const now = Date.now();
  const approverId = auth.currentUser?.uid || null;

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
        notes: notes ?? "",
        submittedAt: now,
        approvedAt: now,
        approverId,
      })
    );
  } else {
    await updateDoc(
      eRef,
      stripUndef({
        status: "approved",
        notes: notes ?? eSnap.data()?.notes ?? "",
        approvedAt: now,
        approverId,
      })
    );
  }

  // progress -> completed (+optional expiry)
  const step = await getStep(stepId).catch(() => null as any);
  const completedAt = iso(new Date());
  const expiresAt =
    step?.expiresInMonths && step.expiresInMonths > 0
      ? iso(addMonths(new Date(), step.expiresInMonths))
      : undefined;

  await setDoc(
    pRef,
    {
      steps: {
        [stepId]: stripUndef({ status: "completed", completedAt, expiresAt }),
      },
    },
    { merge: true }
  );
}

// REQUEST CHANGES: entry -> changes_requested, progress -> in_progress (clear dates)
export async function requestChangesForEntry({
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
  const eRef = entryRef(userId, roleId, stepId);
  const pRef = progressRef(userId, roleId);

  await updateDoc(
    eRef,
    stripUndef({ status: "changes_requested", notes: notes ?? "" })
  );

  await setDoc(
    pRef,
    { steps: { [stepId]: { status: "in_progress" } } },
    { merge: true }
  );
  await updateDoc(pRef, {
    [`steps.${stepId}.completedAt`]: deleteField(),
    [`steps.${stepId}.expiresAt`]: deleteField(),
  });
}

// REOPEN: entry -> submitted, progress -> in_progress (clear dates)
export async function reopenEntry({
  userId,
  roleId,
  stepId,
}: {
  userId: string;
  roleId: string;
  stepId: string;
}) {
  const eRef = entryRef(userId, roleId, stepId);
  const pRef = progressRef(userId, roleId);

  await updateDoc(eRef, {
    status: "submitted",
    approvedAt: deleteField(),
    approverId: deleteField(),
  });

  await setDoc(
    pRef,
    { steps: { [stepId]: { status: "in_progress" } } },
    { merge: true }
  );
  await updateDoc(pRef, {
    [`steps.${stepId}.completedAt`]: deleteField(),
    [`steps.${stepId}.expiresAt`]: deleteField(),
  });
}
