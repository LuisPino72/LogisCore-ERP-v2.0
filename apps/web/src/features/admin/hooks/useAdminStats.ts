import { useCallback, useState } from "react";
import type { AdminService } from "../services/admin.service";
import type { DashboardStats } from "../types/admin.types";

interface UseAdminStatsOptions {
  service: AdminService;
}

export const useAdminStats = ({ service }: UseAdminStatsOptions) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<{ message: string } | null>(null);

  const loadStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await service.getDashboardStats();
    if (!result.ok) {
      setError(result.error);
      setIsLoading(false);
      return result;
    }
    setStats(result.data);
    setIsLoading(false);
    return result;
  }, [service]);

  return {
    stats,
    isLoading,
    error,
    loadStats
  };
};