import {
  createOrcaApiClient,
  extractErrorMessage,
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
  SubscriptionGocardlessProduct,
  TenantEntitlement,
} from "./types.js";

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

    const gocardlessResponse = await this.client.GET(
      "/tenant/gocardless/products/{environment}",
      {
        params: {
          path: {
            environment: normalizedEnvironment,
          },
        },
      }
    );

    if (gocardlessResponse.error) {
      throw new Error(extractErrorMessage(gocardlessResponse.error));
    }

    if (!gocardlessResponse.data) {
      return [];
    }

    throwForBodyError(gocardlessResponse.data);
    const storeProducts = gocardlessResponse.data.data ?? [];

    const products: OrcaClientProduct[] = [];
    for (const storeProduct of storeProducts) {
      const entitlement = entitlements.find((item) => {
        return item.products.gocardless?.product_id === storeProduct.id;
      });
      if (!entitlement) {
        continue;
      }

      const gocardlessProduct = storeProduct as SubscriptionGocardlessProduct;

      products.push({
        id: storeProduct.id,
        name: storeProduct.name,
        accessLevel: entitlement.name,
        currencyCode: gocardlessProduct.currency,
        description: gocardlessProduct.description ?? "",
        formattedPrice: gocardlessProduct.formatted_price,
        price: gocardlessProduct.price / 100,
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

    const requestBody: {
      customer_email: string;
      product_id: string;
      redirect_url: string;
      failure_redirect_url: string;
      prorated_product_id?: string;
      proration_mode?: ProrationMode;
    } = {
      customer_email: resolvedCustomerEmail,
      product_id: productId,
      redirect_url: redirectUrl,
      failure_redirect_url: failureRedirectUrl,
    };

    if (proratedProductId !== undefined) {
      requestBody.prorated_product_id = proratedProductId;
    }

    if (prorationMode !== undefined) {
      requestBody.proration_mode = prorationMode;
    }

    const response =
      store === "stripe"
        ? await this.client.POST("/tenant/stripe/checkout/{environment}", {
            params: {
              path: {
                environment: normalizedEnvironment,
              },
            },
            body: requestBody,
          })
        : await this.client.POST(
            "/tenant/gocardless/billing-request-flow/{environment}",
            {
              params: {
                path: {
                  environment: normalizedEnvironment,
                },
              },
              body: requestBody,
            }
          );

    if (response.error) {
      throw new Error(extractErrorMessage(response.error));
    }

    const body = response.data;
    if (!body) {
      throw new Error(`Empty ${store} checkout response`);
    }

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
