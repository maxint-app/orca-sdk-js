import {
  createOrcaApiClient,
  extractErrorMessage,
  normalizeEnvironment,
  throwForBodyError,
  type OrcaApiClient,
} from "./shared.js";
import { constructWebhookEvent } from "./webhook.js";
import type {
  CustomerEntitlements,
  Environment,
  LegacyEnvironment,
  ListCustomerResponseBody,
  StorableEntitlement,
  TenantEntitlement,
  TenantProduct,
} from "./types.js";

export class OrcaServerClient {
  readonly client: OrcaApiClient;

  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string = "https://api.orca.maxint.com"
  ) {
    this.client = createOrcaApiClient(this.apiKey, this.baseUrl);
  }

  async listProducts(): Promise<TenantProduct[]> {
    const { data, error } = await this.client.GET("/tenant/products");
    if (error) {
      throw new Error(extractErrorMessage(error));
    }
    if (!data) {
      return [];
    }
    throwForBodyError(data);
    return data.data ?? [];
  }

  async listEntitlements(
    environment: Environment | LegacyEnvironment
  ): Promise<TenantEntitlement[]> {
    const { data, error } = await this.client.GET(
      "/tenant/entitlements/{environment}",
      {
        params: {
          path: {
            environment: normalizeEnvironment(environment),
          },
        },
      }
    );

    if (error) {
      throw new Error(extractErrorMessage(error));
    }
    if (!data) {
      return [];
    }
    throwForBodyError(data);
    return data.data ?? [];
  }

  async getActiveEntitlements(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<StorableEntitlement[]> {
    const { data, error } = await this.client.POST("/tenant/entitlements/active", {
      body: {
        customer_email: customerEmail,
        environment: normalizeEnvironment(environment),
      },
    });

    if (error) {
      throw new Error(extractErrorMessage(error));
    }
    if (!data) {
      return [];
    }
    throwForBodyError(data);
    return data.data ?? [];
  }

  async getActiveProducts(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<TenantProduct[]> {
    const activeEntitlements = await this.getActiveEntitlements(
      customerEmail,
      environment
    );

    if (activeEntitlements.length === 0) {
      return [];
    }

    const products = await this.listProducts();
    return products.filter((product) =>
      activeEntitlements.some((activeEntitlement) => {
        return product.entitlement_id === activeEntitlement.id;
      })
    );
  }

  async listCustomers(
    limit?: number,
    cursor?: string
  ): Promise<ListCustomerResponseBody> {
    const query: { limit?: number; cursor?: string } = {};
    if (limit !== undefined) {
      query.limit = limit;
    }
    if (cursor !== undefined) {
      query.cursor = cursor;
    }

    const { data, error } = await this.client.GET("/tenant-server/customers", {
      params: {
        query,
      },
    });

    if (error) {
      throw new Error(extractErrorMessage(error));
    }
    if (!data) {
      throw new Error("Empty response body");
    }
    throwForBodyError(data);
    return data;
  }

  async getCustomerInfo(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<CustomerEntitlements | undefined> {
    const { data, error } = await this.client.POST("/tenant-server/v2/customer", {
      body: {
        customer_email: customerEmail,
        environment: normalizeEnvironment(environment),
      },
    });

    if (error) {
      throw new Error(extractErrorMessage(error));
    }
    if (!data) {
      return undefined;
    }
    throwForBodyError(data);
    return data.data;
  }

  async cancelStripeSubscription(
    environment: Environment | LegacyEnvironment,
    entitlementId: string,
    customerEmail: string
  ): Promise<void> {
    const { data, error } = await this.client.POST(
      "/tenant-server/stripe/cancel/{environment}",
      {
        params: {
          path: {
            environment: normalizeEnvironment(environment),
          },
        },
        body: {
          customer_email: customerEmail,
          entitlement_id: entitlementId,
        },
      }
    );

    if (error) {
      throw new Error(extractErrorMessage(error));
    }
    if (data) {
      throwForBodyError(data);
    }
  }

  async cancelGocardlessSubscription(
    environment: Environment | LegacyEnvironment,
    entitlementId: string,
    customerEmail: string
  ): Promise<void> {
    const { data, error } = await this.client.POST(
      "/tenant-server/gocardless/cancel/{environment}",
      {
        params: {
          path: {
            environment: normalizeEnvironment(environment),
          },
        },
        body: {
          customer_email: customerEmail,
          entitlement_id: entitlementId,
        },
      }
    );

    if (error) {
      throw new Error(extractErrorMessage(error));
    }
    if (data) {
      throwForBodyError(data);
    }
  }

  async constructWebhookEvent(args: {
    webhookPublicKey: string;
    rawPayload: string | Uint8Array | ArrayBuffer;
    signatureHeader: string;
    timestampHeader: string;
  }): Promise<CustomerEntitlements> {
    return constructWebhookEvent(args);
  }

  async ListProducts(): Promise<TenantProduct[]> {
    return this.listProducts();
  }

  async ListEntitlements(
    environment: Environment | LegacyEnvironment
  ): Promise<TenantEntitlement[]> {
    return this.listEntitlements(environment);
  }

  async GetActiveEntitlements(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<StorableEntitlement[]> {
    return this.getActiveEntitlements(customerEmail, environment);
  }

  async GetActiveProducts(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<TenantProduct[]> {
    return this.getActiveProducts(customerEmail, environment);
  }

  async ListCustomers(
    limit?: number,
    cursor?: string
  ): Promise<ListCustomerResponseBody> {
    return this.listCustomers(limit, cursor);
  }

  async GetCustomerInfo(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<CustomerEntitlements | undefined> {
    return this.getCustomerInfo(customerEmail, environment);
  }

  async CancelStripeSubscription(
    environment: Environment | LegacyEnvironment,
    entitlementId: string,
    customerEmail: string
  ): Promise<void> {
    return this.cancelStripeSubscription(environment, entitlementId, customerEmail);
  }

  async CancelGocardlessSubscription(
    environment: Environment | LegacyEnvironment,
    entitlementId: string,
    customerEmail: string
  ): Promise<void> {
    return this.cancelGocardlessSubscription(
      environment,
      entitlementId,
      customerEmail
    );
  }

  async ConstructWebhookEvent(args: {
    webhookPublicKey: string;
    rawPayload: string | Uint8Array | ArrayBuffer;
    signatureHeader: string;
    timestampHeader: string;
  }): Promise<CustomerEntitlements> {
    return this.constructWebhookEvent(args);
  }

  async getActiveSubscription(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<StorableEntitlement | null> {
    const activeEntitlements = await this.getActiveEntitlements(
      customerEmail,
      environment
    );
    return activeEntitlements[0] ?? null;
  }

  async getActiveProduct(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<TenantProduct | null> {
    const products = await this.getActiveProducts(customerEmail, environment);
    return products[0] ?? null;
  }

  async getActiveEntitlement(
    customerEmail: string,
    environment: Environment | LegacyEnvironment
  ): Promise<TenantEntitlement | null> {
    const activeProducts = await this.getActiveProducts(customerEmail, environment);
    if (activeProducts.length === 0) {
      return null;
    }

    const entitlements = await this.listEntitlements(environment);
    const entitlement = entitlements.find((item) => {
      return item.id === activeProducts[0]?.entitlement_id;
    });
    return entitlement ?? null;
  }
}
