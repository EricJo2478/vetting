// ---- SYSTEM PERMISSIONS ----
export type SystemRole = "admin" | "reviewer" | "volunteer";

// ---- USER ----
export interface UserDoc {
  id: string; // Firestore UID
  email: string;
  name: string;
  systemRole: SystemRole; // permission level
  roleIds: string[]; // which vetting roles they're pursuing
  createdAt: string; // ISO date
}
