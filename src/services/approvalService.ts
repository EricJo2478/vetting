// src/services/approvalService.ts
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteField,
  writeBatch,
  serverTimestamp,
  arrayUnion,
  collection,
  getDocs,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { iso, stripUndef } from "../utils";
import { StepStatus } from "../types/Progress";
import { StepDoc } from "../types/Step";

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

type SubmitArgs = {
  userId: string;
  roleId: string;
  step: StepDoc;
};

/** Treat a credential as valid when verified/approved by a manager */
function isCredentialValid(cred: any): boolean {
  const s = cred?.status;
  return s === "verified" || s === "approved";
}

/**
 * SUBMIT ENTRY (volunteer action)
 * - Non-shareable → progress: "in-progress", entry.status: "submitted"
 * - Shareable:
 *    - If credential {templateId} is verified → progress: "completed", entry.status: "approved"
 *    - Else → progress: "in-progress", entry.status: "submitted" and ensure a cred stub exists
 */
export async function submitEntry({ userId, roleId, step }: SubmitArgs) {
  const progressRef = doc(db, "users", userId, "progress", roleId);
  const entryRef = doc(
    db,
    "users",
    userId,
    "progress",
    roleId,
    "entries",
    step.id
  );

  // Non-shareable: simple submit
  if (!step.shareable || !step.templateId) {
    const batch = writeBatch(db);
    batch.set(
      progressRef,
      { steps: { [step.id]: { status: "in-progress" } } },
      { merge: true }
    );
    batch.set(
      entryRef,
      {
        userId,
        roleId,
        stepId: step.id,
        status: "submitted",
        progressStatus: "in-progress",
        submittedAt: Date.now(),
      },
      { merge: true }
    );
    await batch.commit();
    return;
  }

  // Shareable: check credential
  const credRef = doc(db, "users", userId, "credentials", step.templateId);
  const credSnap = await getDoc(credRef);
  const cred = credSnap.data();
  const alreadyValid = isCredentialValid(cred);

  // default: auto-approve ON unless explicitly disabled on the step
  const allowAuto = step.autoApproveIfVerified !== false;
  const shouldAutoComplete = alreadyValid && allowAuto;

  const batch = writeBatch(db);

  if (shouldAutoComplete) {
    // Canonical progress → completed
    batch.set(
      progressRef,
      {
        steps: { [step.id]: { status: "completed", completedAt: Date.now() } },
      },
      { merge: true }
    );

    // Entry → approved & mirror progress
    batch.set(
      entryRef,
      {
        userId,
        roleId,
        stepId: step.id,
        templateId: step.templateId,
        status: "approved",
        progressStatus: "completed",
        approvedAt: Date.now(),
        satisfiedByCredential: true,
      },
      { merge: true }
    );

    // Ensure credential doc is present & verified for future steps
    batch.set(
      credRef,
      {
        id: step.templateId,
        templateId: step.templateId,
        status: "verified",
        updatedAt: serverTimestamp(),
        sourceRoleIds: arrayUnion(roleId),
      },
      { merge: true }
    );
  } else {
    // Move into review
    batch.set(
      progressRef,
      { steps: { [step.id]: { status: "in-progress" } } },
      { merge: true }
    );
    batch.set(
      entryRef,
      {
        userId,
        roleId,
        stepId: step.id,
        templateId: step.templateId,
        status: "submitted",
        progressStatus: "in-progress",
        submittedAt: Date.now(),
        satisfiedByCredential: !!alreadyValid, // true if valid but auto disabled
      },
      { merge: true }
    );

    // Create a stub credential if one doesn’t exist yet so managers can verify it
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
      // At least update the timestamp / provenance
      batch.set(
        credRef,
        { updatedAt: serverTimestamp(), sourceRoleIds: arrayUnion(roleId) },
        { merge: true }
      );
    }
  }

  await batch.commit();
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

type ApproveArgs = {
  userId: string;
  roleId: string;
  stepId: string;
  expiresAt?: string;
  shareable?: boolean;
  templateId?: string;
  propagate?: boolean;
};

export async function approveEntry(args: ApproveArgs) {
  const {
    userId,
    roleId,
    stepId,
    expiresAt,
    shareable,
    templateId,
    propagate,
  } = args;

  const progressRef = doc(db, "users", userId, "progress", roleId);
  const entryRef = doc(
    db,
    "users",
    userId,
    "progress",
    roleId,
    "entries",
    stepId
  );

  const batch = writeBatch(db);

  // canonical progress -> completed
  batch.set(
    progressRef,
    {
      steps: {
        [stepId]: {
          status: "completed",
          completedAt: Date.now(),
          ...(expiresAt ? { expiresAt } : {}),
        },
      },
    },
    { merge: true }
  );

  // entry -> approved + progressStatus=completed (🔸 critical fix)
  batch.set(
    entryRef,
    {
      status: "approved",
      progressStatus: "completed", // ← NEW
      approvedAt: Date.now(),
      ...(expiresAt ? { expiresAt } : {}),
    },
    { merge: true }
  );

  if (shareable && templateId) {
    const credRef = doc(db, "users", userId, "credentials", templateId);
    batch.set(
      credRef,
      {
        id: templateId,
        templateId,
        status: "verified",
        updatedAt: serverTimestamp(),
        sourceRoleIds: arrayUnion(roleId),
      },
      { merge: true }
    );
  }

  await batch.commit();

  if (shareable && templateId && propagate) {
    await propagateVerifiedCredential(userId, templateId);
  }
}

async function propagateVerifiedCredential(userId: string, templateId: string) {
  const rolesSnap = await getDocs(collection(db, "users", userId, "progress"));
  const writes: Promise<any>[] = [];

  for (const roleDoc of rolesSnap.docs) {
    const rId = roleDoc.id;
    const entriesSnap = await getDocs(
      collection(db, "users", userId, "progress", rId, "entries")
    );
    const batch = writeBatch(db);
    let touched = 0;

    entriesSnap.forEach((entry) => {
      const data = entry.data() as any;
      if (data?.templateId === templateId) {
        const sId = entry.id;

        batch.set(
          doc(db, "users", userId, "progress", rId),
          {
            steps: { [sId]: { status: "completed", completedAt: Date.now() } },
          },
          { merge: true }
        );

        batch.set(
          doc(db, "users", userId, "progress", rId, "entries", sId),
          {
            status: "approved",
            progressStatus: "completed", // ← NEW
            approvedAt: Date.now(),
            satisfiedByCredential: true,
          },
          { merge: true }
        );

        touched++;
      }
    });

    if (touched > 0) writes.push(batch.commit());
  }

  await Promise.all(writes);
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

export async function approveSubmission(
  uid: string,
  roleId: string,
  stepId: string,
  opts?: { templateId?: string; shareable?: boolean; propagate?: boolean }
) {
  const { templateId, shareable, propagate } = opts ?? {};
  const progressRef = doc(db, "users", uid, "progress", roleId);
  const entryRef = doc(db, "users", uid, "progress", roleId, "entries", stepId);
  const batch = writeBatch(db);

  // Canonical progress -> completed
  batch.set(
    progressRef,
    { steps: { [stepId]: { status: "completed", completedAt: Date.now() } } },
    { merge: true }
  );

  // Entry -> approved
  batch.set(
    entryRef,
    { status: "approved", approvedAt: Date.now() },
    { merge: true }
  );

  // If shareable, verify the credential so future roles auto-complete
  if (shareable && templateId) {
    const credRef = doc(db, "users", uid, "credentials", templateId);
    batch.set(
      credRef,
      {
        id: templateId,
        templateId,
        status: "verified",
        updatedAt: serverTimestamp(),
        sourceRoleIds: arrayUnion(roleId),
      },
      { merge: true }
    );
  }

  await batch.commit();

  // (Optional) propagate verified credential to other roles that reference it
  if (shareable && templateId && propagate) {
    await propagateVerifiedCredential(uid, templateId);
  }
}
