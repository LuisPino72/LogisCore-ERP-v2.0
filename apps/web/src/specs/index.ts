import * as Products from "./products";
import * as Inventory from "./inventory";
import * as Sales from "./sales";
import * as Purchases from "./purchases";
import * as Production from "./production";
import * as Invoicing from "./invoicing";
import * as Admin from "./admin";
import * as Auth from "./auth";
import * as Audit from "./audit";
import * as Sync from "./sync";
import * as DLQ from "./dlq";
import * as ExchangeRates from "./exchange-rates";
import * as TaxRules from "./tax-rules";
import * as Subscriptions from "./subscriptions";
import * as Reports from "./reports";
import * as EventBus from "./event-bus";
import * as TenantTranslator from "./tenant-translator";

export {
  Products,
  Inventory,
  Sales,
  Purchases,
  Production,
  Invoicing,
  Admin,
  Auth,
  Audit,
  Sync,
  DLQ,
  ExchangeRates,
  TaxRules,
  Subscriptions,
  Reports,
  EventBus,
  TenantTranslator
};

export const validateEventPayload = EventBus.validateEventPayload;
export const validateEventName = EventBus.validateEventName;
export const extractEventCategory = EventBus.extractEventCategory;

export const validateTenantMapping = TenantTranslator.validateTenantMapping;
export const validateTranslationInput = TenantTranslator.validateTranslationInput;
export const validateTenantMatch = TenantTranslator.validateTenantMatch;