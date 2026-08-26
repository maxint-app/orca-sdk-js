# Orca SDK for TypeScript

This package includes:
- `OrcaServerClient` for backend/server usage (private API key)
- `OrcaClient` for browser/web usage (public API key)

## Installation

Through npm/pnpm/yarn:
```
$ npm i @orca/sdk-js
$ pnpm add @orca/sdk-js
$ yarn add @orca/sdk-js
```

## Server Usage (`OrcaServerClient`)

Use your private API key on the server.

```typescript
import { OrcaServerClient } from "@orca/sdk-js";

export async function example() {
  const client = new OrcaServerClient("your_private_api_key_here");

  const products = await client.listProducts();
  console.log("Products:", products);

  const entitlements = await client.listEntitlements("prod");
  console.log("Entitlements:", entitlements);

  const activeEntitlements = await client.getActiveEntitlements(
    "customer_email@example.com",
    "sandbox"
  );
  console.log("Active Entitlements:", activeEntitlements);

  const activeProducts = await client.getActiveProducts(
    "customer_email@example.com",
    "sandbox"
  );
  console.log("Active Products:", activeProducts);

  const customerInfo = await client.getCustomerInfo(
    "customer_email@example.com",
    "sandbox"
  );
  console.log("Customer Info:", customerInfo);

  const customers = await client.listCustomers(20);
  console.log("Customers:", customers);
}

example().catch((error) => {
  console.error("Error in example:", error);
});
```

### Go-aligned server method names

`OrcaServerClient` includes both camelCase methods and Go-aligned PascalCase aliases:
- `listProducts` / `ListProducts`
- `listEntitlements` / `ListEntitlements`
- `getActiveEntitlements` / `GetActiveEntitlements`
- `getActiveProducts` / `GetActiveProducts`
- `listCustomers` / `ListCustomers`
- `getCustomerInfo` / `GetCustomerInfo`
- `cancelStripeSubscription` / `CancelStripeSubscription`
- `cancelGocardlessSubscription` / `CancelGocardlessSubscription`
- `constructWebhookEvent` / `ConstructWebhookEvent`

## Browser Usage (`OrcaClient`)

Use your public key in browser apps.

```typescript
import { OrcaClient } from "@orca/sdk-js";

const client = new OrcaClient("your_public_key_here", "sandbox");

const products = await client.queryProducts("stripe");
console.log("Products:", products);

const entitlement = (await client.listEntitlements())[0];
if (entitlement) {
  const checkoutUrl = await client.purchase({
    store: "stripe",
    entitlement,
    customerEmail: "customer_email@example.com",
    redirectUrl: "https://your-app.example/success",
    failureRedirectUrl: "https://your-app.example/failure",
  });

  console.log("Checkout URL:", checkoutUrl);
}
```

When `autoRedirect` is `true` (default), `purchase` redirects the browser to checkout automatically.

## License

[MIT](/LICENSE)

© Copyright Maxint Inc. 2026
