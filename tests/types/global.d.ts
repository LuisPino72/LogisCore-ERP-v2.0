import type { LogisCoreDexie } from '../apps/web/src/lib/db/dexie';

declare global {
  interface Window {
    logiscoreDb?: LogisCoreDexie;
    __LOGISCORE_BOOTSTRAP_STATE__?: {
      bootstrapped: boolean;
      bootstrappedAt?: string;
      error?: string;
    };
    __LOGISCORE_TENANT_SLUG__?: string;
    __LOGISCORE_EVENT__?: string;
  }
}

export {};