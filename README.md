# Orca Server SDK for Typescript Nodejs

To use orca endpoints in your nodejs server, this sdk can be used to simplify the integration

## Installation

Through npm/pnpm/yarn:
```
$ npm i @orca/server-sdk
$ pnpm add @orca/server-sdk
$ yarn add @orca/server-sdk
```

## Usage

You can use this SDK to get customer information, subscription status and even list subscriptions.
You must use the private API key (it should be private as the name suggest and must be kept as a secret) to get the results in your server.

Basic usage example: 
```typescript
import { OrcaServerClient } from "@orca/server-sdk";

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
```

## License

[MIT](/LICENSE)

© Copyright Maxint Inc. 2026