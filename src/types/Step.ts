// ---- STEP ----

export interface StepDoc {
  id: string;
  name: string;
  description?: string;
  order: number;
  expiresInMonths?: number | null; // undefined if no expiry
  requiresApproval?: boolean;
  roleId: string;

  // Shareable Steps
  templateId?: string; // e.g. "crc"
  shareable?: boolean; // true for CRC, false for role-specific steps
  autoApproveIfVerified?: boolean; // if a verified credential exists, auto-approve
}
