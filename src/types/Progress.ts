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

export type ReviewStatus = "submitted" | "changes_requested" | "approved";

export interface StepEntry {
  userId: string;
  roleId: string;
  stepId: string;
  status: ReviewStatus;
  submittedAt?: number;
  approvedAt?: number;
  approverId?: string;
  notes?: string;
  userEmail?: string;
  roleName?: string;
  stepName?: string;
}
