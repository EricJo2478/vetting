// src/services/stepService.ts
import { collection, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import { StepDoc } from "../types/Step";

export async function getSteps(): Promise<StepDoc[]> {
  const snap = await getDocs(collection(db, "steps"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StepDoc));
}

export async function getStep(stepId: string): Promise<StepDoc | null> {
  const snap = await getDoc(doc(db, "steps", stepId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as StepDoc) : null;
}

export async function getStepsByIds(ids: string[]): Promise<StepDoc[]> {
  if (!ids.length) return [];

  const snaps = await Promise.all(
    ids.map((id) => getDoc(doc(db, "steps", id)))
  );
  return snaps
    .filter((s) => s.exists())
    .map((s) => ({ id: s.id, ...s.data() } as StepDoc));
}
