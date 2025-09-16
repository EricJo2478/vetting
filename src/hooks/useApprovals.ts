import { useEffect, useState } from "react";
import {
  collectionGroup,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase";
import { ReviewStatus, StepStatus } from "../types/Progress";
import { usePermissions } from "./usePermissions";
import { useAuth } from "./useAuth";

export interface ApprovalItem {
  id?: string;
  userId: string;
  roleId: string;
  stepId: string;
  userName?: string;
  roleName?: string;
  stepName?: string;
  status: ReviewStatus; // review status on the entry
  progressStatus?: StepStatus; // mirrored canonical status (optional)
  submittedAt?: number;
  approvedAt?: number;
  approverId?: string;
  notes?: string;
}

export function useApprovals(opts?: {
  roleId?: string;
  status?: ReviewStatus;
  onlyOpen?: boolean; // if true, show just "submitted"
}) {
  const { roleId, status, onlyOpen } = opts ?? {};
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const { role, isManager } = usePermissions();

  useEffect(() => {
    // Wait until role resolved
    if (role === undefined) return;

    // If not privileged, don't even attempt the query — avoid permission errors and flicker
    if (isManager === false) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);

    const base = collectionGroup(db, "entries");
    const clauses: any[] = [];

    // If you’re standardizing on open items = submitted:
    if (onlyOpen) {
      clauses.push(where("status", "==", "submitted"));
    }
    if (roleId) clauses.push(where("roleId", "==", roleId));
    if (status && !onlyOpen) clauses.push(where("status", "==", status));

    const q = query(base, ...clauses, orderBy("submittedAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = snap.docs.map((d) => {
          const data = d.data() as any;
          return { id: d.id, ...data } as ApprovalItem;
        });
        setItems(rows);
        setLoading(false);
      },
      (err) => {
        console.error("useApprovals snapshot error", err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [roleId, status, onlyOpen, role, isManager]);

  return { items, loading, error };
}
