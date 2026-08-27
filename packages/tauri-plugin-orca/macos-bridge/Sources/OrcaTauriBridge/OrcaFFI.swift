import Foundation
import Orca

private struct FFIConfigurePayload: Decodable {
    let publicKey: String
    let environment: String
    let baseUrl: String?
    let customerEmail: String?
}

private struct FFIPurchasePayload: Decodable {
    let entitlement: Components.Schemas.TenantEntitlement
}

private struct FFIIdentifyPayload: Decodable {
    let customerEmail: String
}

private struct FFICustomerPayload: Decodable {
    let customerEmail: String?
}

private struct FFIRuntimeResult {
    let ok: Bool
    let data: Any?
    let error: String?
}

private func makeCString(_ value: String) -> UnsafeMutablePointer<CChar>? {
    strdup(value)
}

private func parseJsonPayload<T: Decodable>(_ pointer: UnsafePointer<CChar>?, as type: T.Type) throws -> T {
    guard let pointer else {
        throw NSError(domain: "OrcaFFI", code: 1, userInfo: [NSLocalizedDescriptionKey: "Missing payload"])
    }
    let raw = String(cString: pointer)
    guard let data = raw.data(using: .utf8) else {
        throw NSError(domain: "OrcaFFI", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid UTF-8 payload"])
    }
    return try JSONDecoder().decode(T.self, from: data)
}

private func toJsonObject<T: Encodable>(_ value: T) throws -> Any {
    let data = try JSONEncoder().encode(value)
    return try JSONSerialization.jsonObject(with: data)
}

private func mapStoreProduct(_ value: StoreProduct) throws -> [String: Any] {
    let entitlement = value.entitlement
    let recurrenceDays: Int?
    if let periodMs = entitlement.period_ms {
        recurrenceDays = Int(periodMs / 86_400_000)
    } else {
        recurrenceDays = nil
    }

    return [
        "id": value.id,
        "name": value.name,
        "description": value.description,
        "price": NSDecimalNumber(decimal: value.price).doubleValue,
        "formattedPrice": value.formattedPrice,
        "currencyCode": value.currencyCode,
        "store": "appstore",
        "subscriptionRecurrenceDays": recurrenceDays as Any,
        "accessLevel": entitlement.name,
        "productType": entitlement.entitlement_type.rawValue,
        "entitlementId": entitlement.id,
        "entitlement": try toJsonObject(entitlement),
    ]
}

private func environment(from value: String) -> OrcaEnvironment {
    switch value {
    case "prod", "production":
        return .production
    default:
        return .sandbox
    }
}

private func serializeResponse(_ result: FFIRuntimeResult) -> String {
    var payload: [String: Any] = ["ok": result.ok]
    if let data = result.data {
        payload["data"] = data
    }
    if let error = result.error {
        payload["error"] = error
    }

    guard JSONSerialization.isValidJSONObject(payload),
          let data = try? JSONSerialization.data(withJSONObject: payload),
          let json = String(data: data, encoding: .utf8)
    else {
        return "{\"ok\":false,\"error\":\"Failed to serialize response\"}"
    }
    return json
}

private func runAsync(_ block: @escaping @MainActor () async throws -> Any?) -> String {
    let semaphore = DispatchSemaphore(value: 0)
    var output = "{\"ok\":false,\"error\":\"Unknown error\"}"

    Task { @MainActor in
        do {
            let data = try await block()
            output = serializeResponse(.init(ok: true, data: data, error: nil))
        } catch {
            output = serializeResponse(.init(ok: false, data: nil, error: error.localizedDescription))
        }
        semaphore.signal()
    }

    semaphore.wait()
    return output
}

@_cdecl("orca_configure_ffi")
public func orca_configure_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    let result = runAsync {
        let config = try parseJsonPayload(payload, as: FFIConfigurePayload.self)
        let orcaConfig = OrcaConfiguration(
            publicKey: config.publicKey,
            environment: environment(from: config.environment),
            baseURL: config.baseUrl ?? "https://api.orca.maxint.com",
            customerEmail: config.customerEmail
        )
        Orca.configure(configuration: orcaConfig)
        return nil
    }
    return makeCString(result)
}

@_cdecl("orca_identify_ffi")
public func orca_identify_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    let result = runAsync {
        let args = try parseJsonPayload(payload, as: FFIIdentifyPayload.self)
        try await Orca.identify(customerEmail: args.customerEmail)
        return nil
    }
    return makeCString(result)
}

@_cdecl("orca_logout_ffi")
public func orca_logout_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    let result = runAsync {
        _ = payload
        Orca.logout()
        return nil
    }
    return makeCString(result)
}

@_cdecl("orca_query_products_ffi")
public func orca_query_products_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    _ = payload
    let result = runAsync {
        let products = try await Orca.queryProducts()
        return try products.map { try mapStoreProduct($0) }
    }
    return makeCString(result)
}

@_cdecl("orca_purchase_ffi")
public func orca_purchase_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    let result = runAsync {
        let args = try parseJsonPayload(payload, as: FFIPurchasePayload.self)
        try await Orca.purchase(entitlement: args.entitlement)
        return nil
    }
    return makeCString(result)
}

@_cdecl("orca_get_active_entitlements_ffi")
public func orca_get_active_entitlements_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    let result = runAsync {
        if let payload {
            let args = try parseJsonPayload(payload, as: FFICustomerPayload.self)
            if let customerEmail = args.customerEmail {
                try await Orca.identify(customerEmail: customerEmail)
            }
        }
        let values = try await Orca.activeEntitlements()
        return try values.map { try toJsonObject($0) }
    }
    return makeCString(result)
}

@_cdecl("orca_active_product_ffi")
public func orca_active_product_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    let result = runAsync {
        if let payload {
            let args = try parseJsonPayload(payload, as: FFICustomerPayload.self)
            if let customerEmail = args.customerEmail {
                try await Orca.identify(customerEmail: customerEmail)
            }
        }
        let products = try await Orca.activeProduct()
        return try products.map { try mapStoreProduct($0) }
    }
    return makeCString(result)
}

@_cdecl("orca_list_entitlements_ffi")
public func orca_list_entitlements_ffi(_ payload: UnsafePointer<CChar>?) -> UnsafeMutablePointer<CChar>? {
    _ = payload
    let result = runAsync {
        let values = try await Orca.listEntitlements()
        return try values.map { try toJsonObject($0) }
    }
    return makeCString(result)
}

@_cdecl("orca_free_string_ffi")
public func orca_free_string_ffi(_ pointer: UnsafeMutablePointer<CChar>?) {
    guard let pointer else { return }
    free(pointer)
}
