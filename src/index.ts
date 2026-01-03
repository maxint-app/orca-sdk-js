import createClient, { Client } from "openapi-fetch";
import { paths, components } from "./schema";

export type TenantEntitlement = components["schemas"]["TenantEntitlement"];
export type TenantProduct = components["schemas"]["TenantProduct"];
export type StorableSubscription =
  components["schemas"]["StorableSubscription"];

export class CrosspayServerClient {
  client: Client<paths, `${string}/${string}`>;
  constructor(
    private apiKey: string,
    private baseUrl: string = "https://api.crosspay.dev"
  ) {
    this.client = createClient<paths>({
      baseUrl: this.baseUrl,
      headers: {
        "api-key": this.apiKey,
      },
    });
  }

  async listProducts() {
    const { data } = await this.client.GET("/tenant/products");
    return data?.data;
  }

  async listEntitlements(environment: "production" | "sandbox") {
    const { data } = await this.client.GET(
      "/tenant/entitlements/{environment}",
      {
        params: {
          path: {
            environment: environment,
          },
        },
      }
    );

    return data?.data;
  }

  async getActiveSubscription(customer_email: string) {
    const { data } = await this.client.POST("/tenant/subscriptions/active", {
      body: {
        customer_email,
      },
    });

    return data?.data;
  }

  async getActiveProduct(customer_email: string) {
    const activeSubscription = await this.getActiveSubscription(customer_email);
    if (!activeSubscription) {
      return null;
    }

    const products = await this.listProducts();
    return (
      products?.find(
        (product) => product.id === activeSubscription.product_id
      ) || null
    );
  }

  async getActiveEntitlement(
    customer_email: string,
    environment: "production" | "sandbox"
  ) {
    const activeProduct = await this.getActiveProduct(customer_email);
    if (!activeProduct) {
      return null;
    }

    const entitlements = await this.listEntitlements(environment);
    return (
      entitlements?.find(
        (entitlement) => entitlement.id === activeProduct.entitlement_id
      ) || null
    );
  }

  async listCustomers(limit?: number, cursor?: string) {
    return this.client.GET("/tenant-server/customers", {
      params: {
        query: {
          limit,
          cursor,
        },
      },
    });
  }

  async getCustomerInfo(customer_email: string) {
    const { data } = await this.client.POST("/tenant-server/customer", {
      body: {
        customer_email,
      },
    });

    return data?.data;
  }
}
