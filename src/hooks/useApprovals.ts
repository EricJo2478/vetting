// src/hooks/useApprovals.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collectionGroup,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../services/firebase";
import {
  approveEntry as approveEntrySrv,
  requestChangesForEntry as requestChangesSrv,
  reopenEntry as reopenEntrySrv,
} from "../services/approvalService";

export interface ApprovalEntry {
  id: string; // Firestore doc id for the entry
  userId: string;
  userEmail?: string;
  roleId: string;
  roleName?: string;
  stepId: string;
  stepName?: string;
  status: "submitted" | "changes_requested" | "approved";
  notes?: string;
  submittedAt?: number;
  approvedAt?: number;
  approverId?: string;
}

type Filters = { roleId?: string; status?: ApprovalEntry["status"] };
type Options = {
  /** If false, the hook won't query (e.g., while auth/permissions are loading) */
  enabled?: boolean;
  /** If false, action methods are safe no-ops (UI should also hide/disable) */
  allowActions?: boolean;
  /** Optional cap on fetched items */
  pageSize?: number;
};

export function useApprovals(filters: Filters, options?: Options) {
  const enabled = options?.enabled ?? true;
  const allowActions = options?.allowActions ?? true;
  const pageSize = options?.pageSize ?? 200;

  const [items, setItems] = useState<ApprovalEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<unknown>(null);

  // Fetch queue
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!enabled) {
        setItems([]);
        setLoading(false);
        setError(null);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const base = collectionGroup(db, "entries");
        const clauses: any[] = [];
        if (filters.roleId) clauses.push(where("roleId", "==", filters.roleId));
        if (filters.status) clauses.push(where("status", "==", filters.status));
        const q = query(
          base,
          ...clauses,
          orderBy("submittedAt", "desc"),
          limit(pageSize)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (e) {
        if (!cancelled) setError(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [enabled, filters.roleId, filters.status, pageSize]);

  // Helpers for optimistic local updates
  const patchItem = useCallback((id: string, patch: Partial<ApprovalEntry>) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
    );
  }, []);

  // Actions — become safe no-ops when allowActions === false
  const approve = useCallback(
    async (entry: ApprovalEntry) => {
      if (!allowActions) return;
      // optimistic
      patchItem(entry.id, { status: "approved", approvedAt: Date.now() });
      try {
        await approveEntrySrv(entry);
      } catch (e) {
        // revert on failure
        patchItem(entry.id, {
          status: entry.status,
          approvedAt: entry.approvedAt,
        });
        throw e;
      }
    },
    [allowActions, patchItem]
  );

  const requestChanges = useCallback(
    async (entry: ApprovalEntry & { notes?: string }) => {
      if (!allowActions) return;
      const prev = { status: entry.status, notes: entry.notes };
      patchItem(entry.id, {
        status: "changes_requested",
        notes: entry.notes ?? "",
      });
      try {
        await requestChangesSrv(entry);
      } catch (e) {
        patchItem(entry.id, prev);
        throw e;
      }
    },
    [allowActions, patchItem]
  );

  const reopen = useCallback(
    async (entry: ApprovalEntry) => {
      if (!allowActions) return;
      const prev = {
        status: entry.status,
        approvedAt: entry.approvedAt,
        approverId: entry.approverId,
      };
      patchItem(entry.id, {
        status: "submitted",
        approvedAt: undefined,
        approverId: undefined,
      });
      try {
        await reopenEntrySrv(entry);
      } catch (e) {
        patchItem(entry.id, prev);
        throw e;
      }
    },
    [allowActions, patchItem]
  );

  return {
    items,
    loading,
    error,
    approve,
    requestChanges,
    reopen,
    /** Force a manual refresh if you want */
    refresh: async () => {
      if (!enabled) return;
      setLoading(true);
      try {
        const base = collectionGroup(db, "entries");
        const clauses: any[] = [];
        if (filters.roleId) clauses.push(where("roleId", "==", filters.roleId));
        if (filters.status) clauses.push(where("status", "==", filters.status));
        const q = query(
          base,
          ...clauses,
          orderBy("submittedAt", "desc"),
          limit(pageSize)
        );
        const snap = await getDocs(q);
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } finally {
        setLoading(false);
      }
    },
  };
}
