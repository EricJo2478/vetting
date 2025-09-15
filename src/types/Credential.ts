// src/types/Credential.ts
export type CredentialStatus = "draft" | "submitted" | "verified" | "rejected";

export interface Credential {
  id: string; // e.g. "crc" or "crc_SK" if you need a scope
  templateId: string; // "crc"
  status: CredentialStatus; // verified == manager-approved
  issuedAt?: number;
  expiresAt?: number;
  verifiedBy?: string; // manager uid
  sourceRoleIds?: string[]; // roles that requested it (optional)
  updatedAt: number;
}
