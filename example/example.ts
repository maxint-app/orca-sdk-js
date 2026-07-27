import { OrcaServerClient } from "../src/index";

export async function example() {
  const client = new OrcaServerClient("your_api_key_here");

  const products = await client.listProducts();
  console.log("Products:", products);

  const entitlements = await client.listEntitlements("production");
  console.log("Entitlements:", entitlements);

  const activeSubscription = await client.getActiveSubscription(
    "customer_email@example.com"
  );
  console.log("Active Subscription:", activeSubscription);

  const activeProduct = await client.getActiveProduct(
    "customer_email@example.com"
  );
  console.log("Active Product:", activeProduct);

  const activeEntitlement = await client.getActiveEntitlement(
    "customer_email@example.com",
    "sandbox"
  );
  console.log("Active Entitlement:", activeEntitlement);

  const customerInfo = await client.getCustomerInfo(
    "customer_email@example.com"
  );
  console.log("Customer Info:", customerInfo);

  const customers = await client.listCustomers(20, undefined);
  console.log("Customers:", customers);
}

example().catch((error) => {
  console.error("Error in example:", error);
});