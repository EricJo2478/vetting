// src/contexts/AuthGuard.tsx
import { ReactNode, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";

export function AuthGuard({
  children,
  requireSupervisor = false,
  requireManager = false,
}: {
  children: ReactNode;
  requireManager?: boolean;
  requireSupervisor?: boolean;
}) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { loading: permsLoading, canManage, canReview } = usePermissions();

  useEffect(() => {
    if (!loading && !permsLoading && !user) {
      navigate("/catalog", { replace: true });
    } else if (
      (requireManager && !canManage) ||
      (requireSupervisor && !canReview)
    ) {
      navigate("/roles", { replace: true });
    }
  }, [loading, permsLoading, user, navigate]);

  if (loading || permsLoading)
    return <div className="container py-5">Loading…</div>;
  return <>{children}</>;
}
