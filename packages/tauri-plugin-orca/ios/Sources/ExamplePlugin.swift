import SwiftRs
import Tauri
import UIKit
import WebKit
import Orca

private enum PluginError: LocalizedError {
  case unsupportedStore(String)

  var errorDescription: String? {
    switch self {
    case .unsupportedStore(let store):
      return "Unsupported store '\(store)' on Apple platforms."
    }
  }
}

class ConfigureArgs: Decodable {
  let publicKey: String
  let environment: String
  let baseUrl: String?
  let customerEmail: String?
}

class IdentifyArgs: Decodable {
  let customerEmail: String
}

class CustomerArgs: Decodable {
  let customerEmail: String?
}

class QueryProductsArgs: Decodable {
  let externalStore: String?
}

class PurchaseArgs: Decodable {
  let entitlement: Components.Schemas.TenantEntitlement
  let externalStore: String?
}

private func mapEnvironment(_ value: String) -> OrcaEnvironment {
  switch value {
  case "prod", "production":
    return .production
  default:
    return .sandbox
  }
}

private func resolveStore(_ value: String?) throws -> String {
  let store = value ?? "stripe"
  if store == "stripe" || store == "gocardless" {
    return store
  }
  throw PluginError.unsupportedStore(store)
}

private func mapStoreProduct(_ value: StoreProduct) throws -> [String: Any] {
  let entitlement = value.entitlement
  let recurrenceDays: Int?
  if let periodMs = entitlement.period_ms {
    recurrenceDays = Int(periodMs / 86_400_000)
  } else {
    recurrenceDays = nil
  }
  let recurrenceValue: Any = recurrenceDays ?? NSNull()
  let entitlementJson = try encodeToJsonObject(entitlement)

  return [
    "id": value.id,
    "name": value.name,
    "description": value.description,
    "price": NSDecimalNumber(decimal: value.price).doubleValue,
    "formattedPrice": value.formattedPrice,
    "currencyCode": value.currencyCode,
    "store": "appstore",
    "subscriptionRecurrenceDays": recurrenceValue,
    "accessLevel": entitlement.name,
    "productType": entitlement.entitlement_type.rawValue,
    "entitlementId": entitlement.id,
    "entitlement": entitlementJson
  ]
}

private func encodeToJsonObject<T: Encodable>(_ value: T) throws -> Any {
  let data = try JSONEncoder().encode(value)
  return try JSONSerialization.jsonObject(with: data)
}

class OrcaPlugin: Plugin {
  @objc public func configure(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(ConfigureArgs.self)
    let config = OrcaConfiguration(
      publicKey: args.publicKey,
      environment: mapEnvironment(args.environment),
      baseURL: args.baseUrl ?? "https://api.orca.maxint.com",
      customerEmail: args.customerEmail
    )
    Orca.configure(configuration: config)
    invoke.resolve()
  }

  @objc public func identify(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(IdentifyArgs.self)
    Task {
      do {
        try await Orca.identify(customerEmail: args.customerEmail)
        invoke.resolve()
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func logout(_ invoke: Invoke) {
    Orca.logout()
    invoke.resolve()
  }

  @objc public func queryProducts(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(QueryProductsArgs.self)
    _ = try resolveStore(args.externalStore)
    Task {
      do {
        let products = try await Orca.queryProducts()
        let mapped = try products.map { try mapStoreProduct($0) }
        invoke.resolve(["data": mapped])
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func purchase(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(PurchaseArgs.self)
    _ = try resolveStore(args.externalStore)
    Task {
      do {
        try await Orca.purchase(entitlement: args.entitlement)
        invoke.resolve()
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func getActiveEntitlements(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(CustomerArgs.self)
    Task {
      do {
        if let customerEmail = args.customerEmail {
          try await Orca.identify(customerEmail: customerEmail)
        }
        let entitlements = try await Orca.activeEntitlements()
        let mapped = try entitlements.map { try encodeToJsonObject($0) }
        invoke.resolve(["data": mapped])
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func activeProduct(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(CustomerArgs.self)
    Task {
      do {
        if let customerEmail = args.customerEmail {
          try await Orca.identify(customerEmail: customerEmail)
        }
        let products = try await Orca.activeProduct()
        let mapped = try products.map { try mapStoreProduct($0) }
        invoke.resolve(["data": mapped])
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }

  @objc public func listEntitlements(_ invoke: Invoke) {
    Task {
      do {
        let entitlements = try await Orca.listEntitlements()
        let mapped = try entitlements.map { try encodeToJsonObject($0) }
        invoke.resolve(["data": mapped])
      } catch {
        invoke.reject(error.localizedDescription)
      }
    }
  }
}

@_cdecl("init_plugin_orca")
func initPlugin() -> Plugin {
  return OrcaPlugin()
}
