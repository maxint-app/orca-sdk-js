# Orca Server SDK (TypeScript)

Monorepo for the TypeScript Orca SDK and the Tauri plugin.

## Packages

| Package                                                            | Description                                        |
| ------------------------------------------------------------------ | -------------------------------------------------- |
| [`@maxint/orca-sdk`](./packages/orca-sdk/)                         | Core SDK: `OrcaServerClient` (server) and `OrcaClient` (browser) |
| [`tauri-plugin-orca-api`](./packages/tauri-plugin-orca/)           | Tauri plugin + JS API with cross-platform native routing |

## Getting Started

```bash
pnpm install
```

## SDK

Install directly:

```bash
pnpm add @maxint/orca-sdk
```

### Server usage

```ts
import { OrcaServerClient } from '@maxint/orca-sdk'

const client = new OrcaServerClient('private_api_key')

const products = await client.listProducts()
const entitlements = await client.listEntitlements('prod')
const active = await client.getActiveEntitlements('user@example.com', 'sandbox')
```

### Browser usage

```ts
import { OrcaClient } from '@maxint/orca-sdk'

const client = new OrcaClient('public_api_key', 'sandbox')

const products = await client.queryProducts('stripe')
const entitlement = (await client.listEntitlements())[0]
if (entitlement) {
  await client.purchase({
    store: 'stripe',
    entitlement,
    customerEmail: 'user@example.com',
    redirectUrl: 'https://app.example/success',
    failureRedirectUrl: 'https://app.example/failure',
  })
}
```

## Tauri Plugin

Install:

```bash
pnpm add tauri-plugin-orca-api
```

Register in Rust:

```rust
tauri::Builder::default()
  .plugin(tauri_plugin_orca::init())
  .run(tauri::generate_context!())
```

JS usage:

```ts
import { Orca } from 'tauri-plugin-orca-api'

const orca = new Orca({
  publicKey: 'public_key',
  environment: 'sandbox',
})

await orca.identify('user@example.com')
const products = await orca.queryProducts('stripe')
```

Platform routing:
- Web/Windows/Linux: uses `@maxint/orca-sdk` directly.
- macOS/iOS: native `orca-apple`.
- Android: native `orca-android`.

See [packages/tauri-plugin-orca](./packages/tauri-plugin-orca/) for full details.

## Development

```bash
# install
pnpm install

# build the JS plugin
pnpm --filter tauri-plugin-orca-api build

# check Rust
cargo check --manifest-path packages/tauri-plugin-orca/Cargo.toml
```

## License

MIT

© Copyright Maxint Inc. 2026