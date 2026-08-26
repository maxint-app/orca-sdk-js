import { OrcaClient, OrcaServerClient } from "../src/index";

export async function example() {
  const serverClient = new OrcaServerClient("your_api_key_here");

  const products = await serverClient.listProducts();
  console.log("Products:", products);

  const entitlements = await serverClient.listEntitlements("prod");
  console.log("Entitlements:", entitlements);

  const activeEntitlements = await serverClient.getActiveEntitlements(
    "customer_email@example.com",
    "sandbox"
  );
  console.log("Active Entitlements:", activeEntitlements);

  const activeProducts = await serverClient.getActiveProducts(
    "customer_email@example.com",
    "sandbox"
  );
  console.log("Active Products:", activeProducts);

  const customerInfo = await serverClient.getCustomerInfo(
    "customer_email@example.com",
    "sandbox"
  );
  console.log("Customer Info:", customerInfo);

  const customers = await serverClient.listCustomers(20);
  console.log("Customers:", customers);

  const webClient = new OrcaClient("your_public_key_here", "sandbox");
  const stripeProducts = await webClient.queryProducts("stripe");
  console.log("Stripe Web Products:", stripeProducts);
}

example().catch((error) => {
  console.error("Error in example:", error);
});
