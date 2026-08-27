# Tauri Plugin Orca

Cross-platform Orca plugin for Tauri apps.

## Platform Routing

| Platform     | Backend                                        |
| ------------ | ---------------------------------------------- |
| Web          | `@maxint/orca-sdk` (direct)                    |
| Windows      | `@maxint/orca-sdk` (direct)                    |
| Linux        | `@maxint/orca-sdk` (direct)                    |
| macOS        | `orca-apple` via Rust->Swift FFI bridge        |
| iOS          | `orca-apple` via native Swift plugin           |
| Android      | `orca-android` via native Kotlin plugin        |

## Installation

```bash
# npm
npm install @maxint/orca-sdk tauri-plugin-orca-api
# pnpm
pnpm add @maxint/orca-sdk tauri-plugin-orca-api
```

Register the plugin in your Tauri app:

```rust
use tauri_plugin_orca;

tauri::Builder::default()
  .plugin(tauri_plugin_orca::init())
  .run(tauri::generate_context!())
```

Add the plugin permission to your capabilities:

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": ["orca:default"]
}
```

## JavaScript API

The API mirrors `flutter_orca`.

```ts
import { Orca } from 'tauri-plugin-orca-api'

const orca = new Orca({
  publicKey: 'public_key',
  environment: 'sandbox', // 'prod' | 'sandbox'
  customerEmail: 'user@example.com', // optional
})

// identity
await orca.identify('user@example.com')
orca.logout()

// products & entitlements
const entitlements = await orca.listEntitlements()
const products = await orca.queryProducts('stripe') // 'stripe' | 'gocardless'
const activeProducts = await orca.activeProduct()
const activeEntitlements = await orca.getActiveEntitlements()

// purchase
await orca.purchase(entitlements[0], {
  externalStore: 'stripe',
  redirectUrl: 'https://example.com/success',
  failureRedirectUrl: 'https://example.com/failure',
  prorationMode: 'upgrade', // optional
  proratedProductId: 'prd_xxx', // optional
})
```

### Platform detection

```ts
const platform = await orca.platform()
// 'web' | 'windows' | 'linux' | 'macos' | 'android' | 'ios'
```

## Native Integration

### Android

The Android plugin (`android/`) bridges to `orca-android` via JitPack:

- `com.github.maxint-app:orca-android:main`

Requires Java 11+ toolchain.

### iOS

The iOS plugin (`ios/`) bridges to `orca-apple` via SwiftPM:

- `https://github.com/maxint-app/orca-apple.git`

### macOS

macOS uses a Rust->Swift FFI bridge into `orca-apple`:

- FFI exports live in `macos-bridge/Sources/OrcaTauriBridge/OrcaFFI.swift`
- Rust desktop glue is in `src/desktop.rs` (`macos_ffi` module)
- The local bridge package is linked in `build.rs` via `swift-rs`

## Native Command Mapping

| JS method              | Rust command             | Android/iOS/macOS native |
| ---------------------- | ------------------------ | ------------------------ |
| `configure()`          | `configure`              | `configure`              |
| `identify()`           | `identify`               | `identify`               |
| `logout()`             | `logout`                 | `logout`                 |
| `queryProducts()`      | `query_products`         | `queryProducts`          |
| `purchase()`           | `purchase`               | `purchase`               |
| `getActiveEntitlements()` | `get_active_entitlements` | `getActiveEntitlements`  |
| `activeProduct()`      | `active_product`         | `activeProduct`          |
| `listEntitlements()`   | `list_entitlements`      | `listEntitlements`       |

## License

MIT
