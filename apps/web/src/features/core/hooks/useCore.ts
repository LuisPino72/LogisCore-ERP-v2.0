import { useCallback, useState } from "react";
import type { AppError } from "@logiscore/core";
import type { CoreUiState } from "../types/core.types";
import type { CoreService } from "../services/core.service";

interface UseCoreOptions {
  service: CoreService;
}

const initialState: CoreUiState = {
  isBootstrapping: false,
  isBlocked: false,
  tenantSlug: null,
  syncStatus: "stopped",
  lastError: null
};

export const useCore = ({ service }: UseCoreOptions) => {
  const [state, setState] = useState<CoreUiState>(initialState);

  const bootstrap = useCallback(async () => {
    setState((previous) => ({
      ...previous,
      isBootstrapping: true,
      lastError: null
    }));

    const syncStartResult = service.startSync();
    if (!syncStartResult.ok) {
      setState((previous) => ({
        ...previous,
        isBootstrapping: false,
        lastError: syncStartResult.error
      }));
      return;
    }

    const result = await service.bootstrapSession();
    if (!result.ok) {
      setState((previous) => ({
        ...previous,
        isBootstrapping: false,
        lastError: result.error
      }));
      return;
    }

    setState({
      isBootstrapping: false,
      isBlocked: !result.data.subscriptionActive,
      tenantSlug: result.data.tenantContext.tenantSlug,
      syncStatus: syncStartResult.data,
      lastError: null
    });
  }, [service]);

  const clearLastError = useCallback(() => {
    setState((previous) => ({ ...previous, lastError: null }));
  }, []);

  return {
    state,
    bootstrap,
    clearLastError
  };
};

export type UseCoreReturn = {
  state: CoreUiState;
  bootstrap: () => Promise<void>;
  clearLastError: () => void;
};

export const isRecoverableError = (error: AppError | null): boolean =>
  Boolean(error?.retryable);
