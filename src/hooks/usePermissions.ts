// src/hooks/usePermissions.ts
import { usePermsContext } from "../contexts/PermsContext";

export function usePermissions() {
  return usePermsContext();
}
