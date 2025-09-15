// src/contexts/AuthGuard.tsx
import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";

export function AuthGuard({
  children,
  requireManager = false,
}: {
  children: ReactNode;
  requireManager?: boolean;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { isManager } = usePermissions();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    } else if (requireManager && !isManager) {
      navigate("/roles", { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) return <div className="container py-5">Loading…</div>;
  return <>{children}</>;
}
