// src/contexts/AuthContext.tsx
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { UserDoc } from "../types/User";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthContextValue {
  user: User | null; // raw Firebase user (email, uid, etc.)
  profile: UserDoc | null; // Firestore profile (systemRole, roleIds, etc.)
  loading: boolean; // true while resolving auth & profile
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);

      if (!fbUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", fbUser.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data() as Omit<UserDoc, "id">;
          setProfile({ id: fbUser.uid, ...data });
        } else {
          // Profile missing - set sensible defaults
          setProfile({
            id: fbUser.uid,
            email: fbUser.email ?? "",
            name: fbUser.displayName ?? "",
            systemRole: "volunteer",
            roleIds: [],
            createdAt: new Date().toISOString().slice(0, 10),
          });
        }
      } catch (e) {
        console.error("Error loading user profile:", e);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      logout: () => signOut(auth),
    }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx)
    throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
