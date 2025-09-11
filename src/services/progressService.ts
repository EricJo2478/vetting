// src/services/progressService.ts
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { ProgressDoc, StepProgress } from "../types/Progress";

export async function getProgress(userId: string, roleId: string) {
  const ref = doc(db, "users", userId, "progress", roleId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function updateStepProgress(
  uid: string,
  roleId: string,
  stepId: string,
  progress: StepProgress
) {
  const ref = doc(db, "users", uid, "progress", roleId);
  await updateDoc(ref, { [`steps.${stepId}`]: progress });
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
 * roles: array of { id: string; steps: string[] } (your RoleDoc shape)
 * returns a map { [roleId]: { completed, total, percent } }
 */
export async function getProgressCountsForRoles(
  userId: string,
  roleIds: string[],
  roles: Array<{ id: string; steps: string[] }>
): Promise<
  Record<string, { completed: number; total: number; percent: number }>
> {
  // Build a quick lookup for total steps per role
  const totalsByRole: Record<string, number> = {};
  for (const r of roles) totalsByRole[r.id] = r.steps.length;

  // Fire reads in parallel (1 per roleId)
  const results = await Promise.all(
    roleIds.map(async (rid) => {
      const progressDoc = await getProgress(userId, rid);
      return [rid, computeCounts(progressDoc, totalsByRole[rid] ?? 0)] as const;
    })
  );

  return Object.fromEntries(results);
}
