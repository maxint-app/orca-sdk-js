import {
  createOrcaApiClient,
  extractErrorMessage,
  joinBaseUrl,
  normalizeEnvironment,
  throwForBodyError,
  type OrcaApiClient,
} from "./shared.js";
import type {
  Environment,
  ExternalStore,
  LegacyEnvironment,
  OrcaClientProduct,
  ProrationMode,
  StorableEntitlement,
  TenantEntitlement,
} from "./types.js";

type GoCardlessProduct = {
  id: string;
  name: string;
  description?: string | null;
  formatted_price?: string;
  formattedPrice?: string;
  price: number;
  currency: string;
};

export class OrcaClient {
  readonly client: OrcaApiClient;
  private customerEmail: string | undefined;
  private customerId: string | undefined;

  constructor(
    private readonly publicKey: string,
    private readonly environment: Environment | LegacyEnvironment,
    private readonly baseUrl: string = "https://api.orca.maxint.com",
    customerEmail?: string
  ) {
    this.client = createOrcaApiClient(this.publicKey, this.baseUrl);
    this.customerEmail = customerEmail;
  }

  private resolveCustomerEmail(customerEmail?: string): string {
    const resolvedEmail = customerEmail ?? this.customerEmail;
    if (!resolvedEmail) {
      throw new Error(
        "Customer email is not set. Call identify(customerEmail) before this method."
      );
    }
    return resolvedEmail;
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(joinBaseUrl(this.baseUrl, path), {
      ...init,
      headers: {
        "api-key": this.publicKey,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
    });

    const text = await response.text();
    const body = text ? (JSON.parse(text) as T) : ({} as T);

    if (!response.ok) {
      throw new Error(extractErrorMessage(body));
    }

    return body;
  }

  async listEntitlements(): Promise<TenantEntitlement[]> {
    const normalizedEnvironment = normalizeEnvironment(this.environment);
    const { data, error } = await this.client.GET(
      "/tenant/entitlements/{environment}",
      {
        params: {
          path: {
            environment: normalizedEnvironment,
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

  async identify(customerEmail: string): Promise<void> {
    const { data, error } = await this.client.POST("/tenant/identify", {
      body: {
        customer_email: customerEmail,
      },
    });

    if (error) {
      throw new Error(extractErrorMessage(error));
    }

    if (data) {
      throwForBodyError(data);
      this.customerId = data.customer_id;
    }

    this.customerEmail = customerEmail;
  }

  logout(): void {
    this.customerEmail = undefined;
    this.customerId = undefined;
  }

  getCustomerEmail(): string | undefined {
    return this.customerEmail;
  }

  getCustomerId(): string | undefined {
    return this.customerId;
  }

  async getActiveEntitlements(
    customerEmail?: string
  ): Promise<StorableEntitlement[]> {
    const resolvedCustomerEmail = this.resolveCustomerEmail(customerEmail);
    const normalizedEnvironment = normalizeEnvironment(this.environment);
    const { data, error } = await this.client.POST("/tenant/entitlements/active", {
      body: {
        customer_email: resolvedCustomerEmail,
        environment: normalizedEnvironment,
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

  async queryProducts(store: ExternalStore): Promise<OrcaClientProduct[]> {
    const normalizedEnvironment = normalizeEnvironment(this.environment);
    const entitlements = await this.listEntitlements();

    if (store === "stripe") {
      const { data, error } = await this.client.GET(
        "/tenant/stripe/products/{environment}",
        {
          params: {
            path: {
              environment: normalizedEnvironment,
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

      const storeProducts = data.data ?? [];
      const products: OrcaClientProduct[] = [];
      for (const storeProduct of storeProducts) {
        const entitlement = entitlements.find((item) => {
          return item.products.stripe?.product_id === storeProduct.id;
        });
        if (!entitlement) {
          continue;
        }

        products.push({
          id: storeProduct.id,
          name: storeProduct.name,
          accessLevel: entitlement.name,
          currencyCode: storeProduct.price.currency,
          description: storeProduct.description ?? "",
          formattedPrice: storeProduct.price.formattedPrice,
          price: storeProduct.price.price / 100,
          store,
          subscriptionRecurrenceDays:
            entitlement.period_ms == null
              ? null
              : Math.floor(entitlement.period_ms / 86_400_000),
          productType: entitlement.entitlement_type,
          entitlementId: entitlement.id,
        });
      }

      return products;
    }

    const gocardlessResponse = await this.requestJson<{
      data?: GoCardlessProduct[] | null;
      error?: string;
    }>(`/tenant/gocardless/products/${normalizedEnvironment}`);

    throwForBodyError(gocardlessResponse);
    const storeProducts = gocardlessResponse.data ?? [];

    const products: OrcaClientProduct[] = [];
    for (const storeProduct of storeProducts) {
      const entitlement = entitlements.find((item) => {
        return item.products.gocardless?.product_id === storeProduct.id;
      });
      if (!entitlement) {
        continue;
      }

      products.push({
        id: storeProduct.id,
        name: storeProduct.name,
        accessLevel: entitlement.name,
        currencyCode: storeProduct.currency,
        description: storeProduct.description ?? "",
        formattedPrice:
          storeProduct.formatted_price ?? storeProduct.formattedPrice ?? "",
        price: storeProduct.price / 100,
        store,
        subscriptionRecurrenceDays:
          entitlement.period_ms == null
            ? null
            : Math.floor(entitlement.period_ms / 86_400_000),
        productType: entitlement.entitlement_type,
        entitlementId: entitlement.id,
      });
    }

    return products;
  }

  async purchase({
    store,
    entitlement,
    customerEmail,
    redirectUrl,
    failureRedirectUrl,
    proratedProductId,
    prorationMode,
    autoRedirect = true,
  }: {
    store: ExternalStore;
    entitlement: TenantEntitlement;
    customerEmail?: string;
    redirectUrl: string;
    failureRedirectUrl: string;
    proratedProductId?: string;
    prorationMode?: ProrationMode;
    autoRedirect?: boolean;
  }): Promise<string> {
    const resolvedCustomerEmail = this.resolveCustomerEmail(customerEmail);
    const activeEntitlements = await this.getActiveEntitlements(
      resolvedCustomerEmail
    );
    const isActive = activeEntitlements.some((item) => item.id === entitlement.id);

    if (
      isActive &&
      (entitlement.entitlement_type === "subscription" ||
        entitlement.entitlement_type === "non_consumable")
    ) {
      throw new Error(
        `User is already subscribed to or owns entitlement '${entitlement.name}'`
      );
    }

    const normalizedEnvironment = normalizeEnvironment(this.environment);
    const productId =
      store === "stripe"
        ? entitlement.products.stripe?.product_id
        : entitlement.products.gocardless?.product_id;

    if (!productId) {
      throw new Error(`Entitlement '${entitlement.name}' has no ${store} product`);
    }

    const endpoint =
      store === "stripe"
        ? `/tenant/stripe/checkout/${normalizedEnvironment}`
        : `/tenant/gocardless/billing-request-flow/${normalizedEnvironment}`;

    const body = await this.requestJson<{ error?: string; url?: string }>(endpoint, {
      method: "POST",
      body: JSON.stringify({
        customer_email: resolvedCustomerEmail,
        product_id: productId,
        redirect_url: redirectUrl,
        failure_redirect_url: failureRedirectUrl,
        prorated_product_id: proratedProductId,
        proration_mode: prorationMode,
      }),
    });

    throwForBodyError(body);

    if (!body.url) {
      throw new Error(`Failed to create ${store} checkout session`);
    }

    const maybeWindow = (
      globalThis as {
        window?: {
          location: {
            assign: (url: string) => void;
          };
        };
      }
    ).window;
    if (autoRedirect && maybeWindow) {
      maybeWindow.location.assign(body.url);
    }

    return body.url;
  }
}
