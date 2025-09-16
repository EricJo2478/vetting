// src/services/legacyImport.ts
import { db } from "./firebase";
import { doc, serverTimestamp, writeBatch } from "firebase/firestore";

export type LegacyRow = {
  personId?: string; // optional; will derive from email if missing
  name: string;
  email: string;
  roleId: string;
  completedSteps: string; // comma-separated step IDs: "crc,orientation,refs"
};

function normalizeEmail(e: string) {
  return (e || "").trim().toLowerCase();
}

export function personIdFromEmail(email: string) {
  const n = normalizeEmail(email);
  return n.replace(/[^a-z0-9]/g, "_");
}

export async function importPeopleProgress(rows: LegacyRow[]) {
  const batch = writeBatch(db);
  const now = serverTimestamp();

  for (const r of rows) {
    const pid = r.personId || personIdFromEmail(r.email);
    const personRef = doc(db, "people", pid);
    batch.set(
      personRef,
      {
        name: r.name,
        email: normalizeEmail(r.email),
        updatedAt: now,
        source: "import",
      },
      { merge: true }
    );

    const roleRef = doc(db, "people", pid, "progress", r.roleId);
    const steps: Record<string, any> = {};
    const completed = (r.completedSteps || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const stepId of completed) {
      steps[stepId] = {
        status: "completed",
        approvedAt: now,
        approvedBy: "legacy-import",
      };
    }

    batch.set(roleRef, { steps, updatedAt: now }, { merge: true });
  }

  await batch.commit();
}
