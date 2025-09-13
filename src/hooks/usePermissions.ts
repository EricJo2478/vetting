// src/hooks/usePermissions.ts
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth } from "../services/firebase";
import { db } from "../services/firebase";

export type SystemRole = "volunteer" | "supervisor" | "manager";

export function usePermissions() {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [role, setRole] = useState<SystemRole | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) {
      setRole(undefined);
      setLoading(false);
      return;
    }
    const ref = doc(db, "users", uid);
    const unsub = onSnapshot(ref, (snap) => {
      const r = (snap.data()?.systemRole ?? "volunteer") as SystemRole;
      setRole(r);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [uid]);

  const isManager = role === "manager";
  const isSupervisor = role === "supervisor";
  const isVolunteer = role === "volunteer";
  const canReview = isSupervisor || isManager; // can VIEW queue
  const canManage = isManager;                 // can approve/edit

  return { role, loading, isManager, isSupervisor, isVolunteer, canReview, canManage };
}
