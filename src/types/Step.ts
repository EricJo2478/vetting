// ---- STEP ----
export interface StepDoc {
  id: string;
  name: string;
  description?: string;
  order: number;
  expiresInMonths?: number; // undefined if no expiry
  requiresManualReview?: boolean;
}
