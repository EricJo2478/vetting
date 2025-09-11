// ---- ROLE ----
export interface RoleDoc {
  id: string;
  name: string;
  description?: string;
  steps: string[]; // step IDs
}
