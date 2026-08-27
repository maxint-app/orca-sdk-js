# Tauri Plugin Orca

Cross-platform Orca plugin for Tauri apps.

Platform routing:
- Web, Windows, Linux: uses `@maxint/orca-sdk` directly.
- macOS, iOS: calls native plugin commands intended to be backed by `orca-apple`.
- Android: calls native plugin commands intended to be backed by `orca-android`.

## JavaScript API

```ts
import { Orca } from 'tauri-plugin-orca-api'

const orca = new Orca({
  publicKey: 'public_key',
  environment: 'sandbox',
  customerEmail: 'user@example.com',
})

await orca.identify('user@example.com')
const entitlements = await orca.listEntitlements()
const products = await orca.queryProducts('stripe')
await orca.purchase(entitlements[0], {
  externalStore: 'stripe',
  redirectUrl: 'https://example.com/success',
  failureRedirectUrl: 'https://example.com/failure',
})
```

The API mirrors the current `flutter_orca` shape where possible:
- `identify(customerEmail)`
- `logout()`
- `queryProducts(externalStore?)`
- `purchase(entitlement, options?)`
- `getActiveEntitlements(customerEmail?)`
- `activeProduct(customerEmail?)`
- `listEntitlements()`

## Native mobile notes

This package now exposes mobile command hooks for:
- `identify`
- `logout`
- `queryProducts`
- `purchase`
- `getActiveEntitlements`
- `activeProduct`
- `listEntitlements`

You still need to add Android and iOS plugin projects under this package (`android/` and `ios/`) and implement command handlers that bridge into:
- `orca-android` on Android
- `orca-apple` on iOS/macOS
