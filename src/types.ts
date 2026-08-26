import type { components } from "./schema.js";

export type TenantEntitlement = components["schemas"]["TenantEntitlement"];
export type TenantProduct = components["schemas"]["TenantProduct"];
export type StorableEntitlement = components["schemas"]["StorableEntitlement"];
export type StorableSubscription =
  components["schemas"]["StorableSubscription"];
export type CustomerEntitlements =
  components["schemas"]["CustomerEntitlements"];
export type ListCustomerResponseBody =
  components["schemas"]["ListCustomerResponseBody"];
export type SubscriptionStripeProduct =
  components["schemas"]["SubscriptionStripeProduct"];

export type Environment = "prod" | "sandbox";
export type LegacyEnvironment = "production" | "sandbox";
export type ExternalStore = "stripe" | "gocardless";
export type ProrationMode = "upgrade" | "downgrade";

export type OrcaClientProduct = {
  id: string;
  name: string;
  accessLevel: string;
  currencyCode: string;
  description: string;
  formattedPrice: string;
  price: number;
  store: ExternalStore;
  subscriptionRecurrenceDays: number | null;
  productType: TenantEntitlement["entitlement_type"];
  entitlementId: string;
};
