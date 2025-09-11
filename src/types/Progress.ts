// ---- PROGRESS ----
export type StepStatus = "pending" | "in-progress" | "completed" | "expired";

export interface StepProgress {
  status: StepStatus;
  completedAt?: string; // ISO date
  expiresAt?: string; // ISO date
  lastReviewedAt?: string; // ISO date
}

export interface ProgressDoc {
  roleId: string;
  steps: Record<string, StepProgress>; // keyed by stepId
}
