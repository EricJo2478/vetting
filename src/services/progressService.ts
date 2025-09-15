// src/services/progressService.ts
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { db } from "./firebase";
import { ProgressDoc, StepProgress } from "../types/Progress";
import { RoleDoc } from "../types/Role";
import { StepDoc } from "../types/Step";

function isValid(cred: any) {
  const ok = cred?.status === "verified";
  const notExpired = !cred?.expiresAt || cred.expiresAt > Date.now();
  return ok && notExpired;
}

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

  // If the step is shareable, look up (or create) the credential
  if (step.shareable && step.templateId) {
    const credId = step.templateId; // or compose scope here if needed
    const credRef = doc(db, "users", uid, "credentials", credId);
    const credSnap = await getDoc(credRef);
    const credential = credSnap.data();
    const alreadyValid = isValid(credential);

    const entryStatus = alreadyValid
      ? step.autoApproveIfVerified
        ? "approved"
        : "submitted"
      : "submitted";

    const batch = writeBatch(db);

    // Ensure the parent progress doc exists and write the per-role entry
    batch.set(progressRef, { steps: { [step.id]: progress } }, { merge: true });

    batch.set(
      entryRef,
      {
        userId: uid,
        roleId,
        stepId: step.id,
        templateId: step.templateId,
        status: entryStatus,
        submittedAt: Date.now(),
        satisfiedByCredential: alreadyValid,
      },
      { merge: true }
    );

    // If there is no credential, create a submitted one (manager will verify)
    if (!credSnap.exists()) {
      batch.set(credRef, {
        id: credId,
        templateId: step.templateId,
        status: "submitted",
        updatedAt: Date.now(),
        sourceRoleIds: [roleId],
      });
    }

    await batch.commit();
    return;
  }

  // Non-shareable: keep your existing per-role behavior
  await setDoc(
    progressRef,
    { steps: { [step.id]: progress } },
    { merge: true }
  );
  await setDoc(
    entryRef,
    {
      userId: uid,
      roleId,
      stepId: step.id,
      status: progress.status === "completed" ? "submitted" : "submitted",
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
