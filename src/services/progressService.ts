// src/services/progressService.ts
import {
  deleteField,
  doc,
  getDoc,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { ProgressDoc, StepProgress } from "../types/Progress";
import { RoleDoc } from "../types/Role";
import { StepDoc } from "../types/Step";

function isValid(cred: any) {
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

export async function updateStepProgress(
  uid: string,
  roleId: string,
  step: StepDoc,
  progress: StepProgress
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

  // sanitize the nested progress payload
  const safeProgress = stripUndef(progress);

  // ---- SHAREABLE (credential-backed) STEP ----
  if (step.shareable && step.templateId) {
    const credRef = doc(db, "users", uid, "credentials", step.templateId);
    const credSnap = await getDoc(credRef);
    const credential = credSnap.data();
    const alreadyValid = isValid(credential); // your existing helper

    const entryStatus =
      alreadyValid && step.autoApproveIfVerified ? "approved" : "submitted";

    const batch = writeBatch(db);

    // 1) write/merge the per-role progress map WITHOUT undefineds
    batch.set(
      progressRef,
      { steps: { [step.id]: safeProgress } },
      { merge: true }
    );

    // 2) if reverting to pending, remove date fields explicitly
    if (safeProgress.status !== "completed") {
      batch.update(progressRef, {
        [`steps.${step.id}.completedAt`]: deleteField(),
        [`steps.${step.id}.expiresAt`]: deleteField(),
      });
    }

    // 3) create/update the review entry ONLY when completed
    if (safeProgress.status === "completed") {
      batch.set(
        entryRef,
        stripUndef({
          userId: uid,
          roleId,
          stepId: step.id,
          templateId: step.templateId, // omitted if undefined
          status: entryStatus,
          submittedAt: Date.now(),
          satisfiedByCredential: alreadyValid,
          approvedAt: entryStatus === "approved" ? Date.now() : undefined,
        }),
        { merge: true }
      );
    }

    // 4) bootstrap a credential if it doesn't exist yet
    if (!credSnap.exists()) {
      batch.set(
        credRef,
        stripUndef({
          id: step.templateId,
          templateId: step.templateId,
          status: "submitted",
          updatedAt: Date.now(),
          sourceRoleIds: [roleId],
        })
      );
    }

    await batch.commit();
    return;
  }

  // ---- NON-SHAREABLE STEP ----
  // 1) write/merge the per-role progress map WITHOUT undefineds
  await setDoc(
    progressRef,
    { steps: { [step.id]: safeProgress } },
    { merge: true }
  );

  // 2) if reverting to pending, remove date fields explicitly
  if (safeProgress.status !== "completed") {
    await setDoc(
      progressRef,
      {
        [`steps.${step.id}`]: stripUndef({
          status: safeProgress.status,
        }),
      },
      { merge: true }
    );
    await setDoc(
      progressRef,
      {
        // delete fields in a separate update
        [`steps.${step.id}.completedAt`]: deleteField(),
        [`steps.${step.id}.expiresAt`]: deleteField(),
      } as any,
      { merge: true }
    );
  }

  // 3) create/update the review entry ONLY when completed
  if (safeProgress.status === "completed") {
    await setDoc(
      entryRef,
      {
        userId: uid,
        roleId,
        stepId: step.id,
        status: "submitted",
        submittedAt: Date.now(),
      },
      { merge: true }
    );
  }
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
