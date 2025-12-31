import createClient, { Client } from "openapi-fetch";
import { paths } from "./schema";

export class CrosspayTenantServerAPI {
  client: Client<paths, `${string}/${string}`>;
  constructor(private apiKey: string) {
    this.client = createClient<paths>({
      baseUrl: "https://api.crosspay.dev",
      headers: {
        "api-key": this.apiKey
      }
    })
  }

  async listProducts() {
    const {data} = await this.client.GET("/tenant/products")
    return data?.data;
  }

  async listEntitlements(environment: "production" | "sandbox") {
    const {data} = await this.client.GET("/tenant/entitlements/{environment}", {
      params: {
        path: {
          environment: environment
        }
      }
    })

    return data?.data;
  }

  async getActiveSubscription(customer_email: string) {
    const {data} = await this.client.POST("/tenant/subscriptions/active", {
      body: {
        customer_email
      }
    })

    return data?.data;
  }  
}