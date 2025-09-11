// src/hooks/useProgress.ts
import { useEffect, useState } from "react";
import { getProgress } from "../services/progressService";
import { ProgressDoc } from "../types/Progress";

export function useProgress(userId: string, roleId: string) {
  const [progress, setProgress] = useState<ProgressDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !roleId) return;
    getProgress(userId, roleId).then((data) => {
      setProgress(data);
      setLoading(false);
    });
  }, [userId, roleId]);

  return { progress, loading };
}
