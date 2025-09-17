// src/services/progressService.ts
import {
  arrayUnion,
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { ProgressDoc, StepProgress } from "../types/Progress";
import { RoleDoc } from "../types/Role";
import { StepDoc } from "../types/Step";

function isValid(cred: any) {
  console.log(cred);
  const ok = cred?.status === "verified";
  const notExpired = !cred?.expiresAt || cred.expiresAt > Date.now();
  return ok && notExpired;
}

// helper: remove undefined keys
const stripUndef = <T extends Record<string, any>>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export async function getProgress(
  userId: string,
  roleId: string
): Promise<ProgressDoc | null> {
  const ref = doc(db, "users", userId, "progress", roleId);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as ProgressDoc) : null;
}

// Helper
function isCredentialValid(cred: any): boolean {
  const s = cred?.status;
  return s === "verified" || s === "approved";
}

export async function updateStepProgress(
  uid: string,
  roleId: string,
  step: StepDoc,
  next: StepProgress // { status: "pending" | "in-progress" | "completed" }
) {
  const progressRef = doc(db, "users", uid, "progress", roleId);
  const entryRef = doc(
    db,
    "users",
    uid,
    "progress",
    roleId,
    "entries",
    step.id
  );

  // SHAREABLE
  if (step.shareable && step.templateId) {
    const credRef = doc(db, "users", uid, "credentials", step.templateId);
    const credSnap = await getDoc(credRef);
    const cred = credSnap.data();
    const alreadyValid = isCredentialValid(cred);

    const shouldAutoComplete =
      alreadyValid && step.autoApproveIfVerified !== false;
    const finalStatus: StepProgress["status"] = shouldAutoComplete
      ? "completed"
      : next.status;

    const entryReviewStatus = shouldAutoComplete ? "approved" : "submitted";

    const batch = writeBatch(db);

    // canonical progress
    batch.set(
      progressRef,
      {
        steps: {
          [step.id]: {
            status: finalStatus,
            ...(finalStatus === "completed" ? { completedAt: Date.now() } : {}),
          },
        },
      },
      { merge: true }
    );

    // entry (🔸 now mirrors the progress in progressStatus)
    batch.set(
      entryRef,
      {
        userId: uid,
        roleId,
        stepId: step.id,
        templateId: step.templateId,
        status: entryReviewStatus, // review: submitted | approved | changes_requested
        progressStatus: finalStatus, // progress: pending | in-progress | completed  ← NEW
        submittedAt: Date.now(),
        satisfiedByCredential: alreadyValid,
      },
      { merge: true }
    );

    if (!credSnap.exists()) {
      batch.set(
        credRef,
        {
          id: step.templateId,
          templateId: step.templateId,
          status: "submitted",
          updatedAt: serverTimestamp(),
          sourceRoleIds: [roleId],
        },
        { merge: true }
      );
    } else {
      batch.set(
        credRef,
        { updatedAt: serverTimestamp(), sourceRoleIds: arrayUnion(roleId) },
        { merge: true }
      );
    }

    await batch.commit();
    return;
  }

  // NON-SHAREABLE
  await setDoc(progressRef, { steps: { [step.id]: next } }, { merge: true });
  await setDoc(
    entryRef,
    {
      userId: uid,
      roleId,
      stepId: step.id,
      status: next.status === "completed" ? "approved" : "submitted",
      progressStatus: next.status, // ← NEW
      submittedAt: Date.now(),
    },
    { merge: true }
  );
}

/** Helper: compute counts from a raw progress doc and the role's step list */
function computeCounts(progressDoc: any | null, roleStepCount: number) {
  const stepsObj = progressDoc?.steps || {};
  const completed = Object.values(stepsObj).filter(
    // support both your “completed: boolean” and “status: 'completed'” shapes
    (s: any) => s?.completed === true || s?.status === "completed"
  ).length;

  const total = roleStepCount;
  const percent = total ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percent };
}

/**
 * New: returns { completed, total, percent } for a single role
 * You pass the known step count for the role to avoid extra reads.
 */
export async function getProgressCounts(
  userId: string,
  roleId: string,
  roleStepCount: number
): Promise<{ completed: number; total: number; percent: number }> {
  const progressDoc = await getProgress(userId, roleId);
  return computeCounts(progressDoc, roleStepCount);
}

/**
 * New: batch version for dashboards
 * roles: array of { id: string; steps: string[] } (RoleDoc shape)
 * returns a map { [roleId]: { completed, total, percent } }
 */
export async function getProgressCountsForRoles(
  userId: string,
  roleIds: string[],
  roles: Array<RoleDoc>
): Promise<
  Record<string, { completed: number; total: number; percent: number }>
> {
  // Build a quick lookup for total steps per role
  const totalsByRole: Record<string, number> = {};

  for (const r of roles) totalsByRole[r.id] = r.steps ? r.steps.length : 0;

  // Fire reads in parallel (1 per roleId)
  const results = await Promise.all(
    roleIds.map(async (rid) => {
      const progressDoc = await getProgress(userId, rid);
      return [rid, computeCounts(progressDoc, totalsByRole[rid] ?? 0)] as const;
    })
  );

  return Object.fromEntries(results);
}
