// src/contexts/AuthContext.tsx
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { SystemRole, UserDoc } from "../types/User";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { ensureUserProfile, getUser } from "../services/userService";

interface PermsContextValue {
  role?: SystemRole;
  loading: boolean;
  isManager: boolean;
  isSupervisor: boolean;
  isVolunteer: boolean;
  canReview: boolean;
  canManage: boolean;
}

const PermsContext = createContext<PermsContextValue | undefined>(undefined);

export function PermsProvider({ children }: { children: ReactNode }) {
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
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const r = (snap.data()?.systemRole ?? "volunteer") as SystemRole;
        setRole(r);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, [uid]);

  const isManager = role === "manager";
  const isSupervisor = role === "supervisor";
  const isVolunteer = role === "volunteer";
  const canReview = isSupervisor || isManager; // can VIEW queue
  const canManage = isManager; // can approve/edit

  const value = useMemo<PermsContextValue>(
    () => ({
      role,
      loading,
      isManager,
      isSupervisor,
      isVolunteer,
      canReview,
      canManage,
    }),
    [role, loading]
  );

  return (
    <PermsContext.Provider value={value}>{children}</PermsContext.Provider>
  );
}

export function usePermsContext(): PermsContextValue {
  const ctx = useContext(PermsContext);
  if (!ctx)
    throw new Error("userPermsContext must be used inside <PermsProvider>");
  return ctx;
}
