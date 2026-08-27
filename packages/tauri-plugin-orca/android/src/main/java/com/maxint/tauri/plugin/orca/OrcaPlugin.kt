package com.maxint.tauri.plugin.orca

import android.app.Activity
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke
import com.maxint.orca.core.Orca
import com.maxint.orca.core.OrcaConfiguration
import com.maxint.orca.core.OrcaEnvironment
import com.maxint.orca.core.StoreProduct
import com.maxint.orca.generated.infrastructure.Serializer
import com.maxint.orca.generated.models.TenantEntitlement
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())

@InvokeArg
class ConfigureArgs {
  lateinit var publicKey: String
  lateinit var environment: String
  var baseUrl: String? = null
  var customerEmail: String? = null
}

@InvokeArg
class IdentifyArgs {
  lateinit var customerEmail: String
}

@InvokeArg
class CustomerArgs {
  var customerEmail: String? = null
}

@InvokeArg
class PurchaseArgs {
  lateinit var entitlement: TenantEntitlement
}

@TauriPlugin
class OrcaPlugin(private val activity: Activity) : Plugin(activity) {
    @Command
    fun configure(invoke: Invoke) {
        val args = invoke.parseArgs(ConfigureArgs::class.java)
        val environment = if (args.environment == "production" || args.environment == "prod") {
            OrcaEnvironment.PRODUCTION
        } else {
            OrcaEnvironment.SANDBOX
        }

        Orca.configure(
            activity,
            OrcaConfiguration(
                publicKey = args.publicKey,
                environment = environment,
                baseUrl = args.baseUrl ?: "https://api.orca.maxint.com",
                customerEmail = args.customerEmail,
            )
        )
        invoke.resolve()
    }

    @Command
    fun identify(invoke: Invoke) {
        val args = invoke.parseArgs(IdentifyArgs::class.java)
        scope.launch {
            runCatching {
                Orca.identify(args.customerEmail)
            }.onSuccess {
                invoke.resolve()
            }.onFailure {
                invoke.reject(it.message ?: "identify failed")
            }
        }
    }

    @Command
    fun logout(invoke: Invoke) {
        runCatching {
            Orca.logout()
        }.onSuccess {
            invoke.resolve()
        }.onFailure {
            invoke.reject(it.message ?: "logout failed")
        }
    }

    @Command
    fun queryProducts(invoke: Invoke) {
        scope.launch {
            runCatching {
                Orca.queryProducts()
            }.onSuccess { products ->
                invoke.resolve(listResponse(products.map(::storeProductToJson)))
            }.onFailure {
                invoke.reject(it.message ?: "queryProducts failed")
            }
        }
    }

    @Command
    fun purchase(invoke: Invoke) {
        val args = invoke.parseArgs(PurchaseArgs::class.java)
        scope.launch {
            runCatching {
                Orca.purchase(args.entitlement)
            }.onSuccess {
                invoke.resolve()
            }.onFailure {
                invoke.reject(it.message ?: "purchase failed")
            }
        }
    }

    @Command
    fun getActiveEntitlements(invoke: Invoke) {
        val args = invoke.parseArgs(CustomerArgs::class.java)
        scope.launch {
            runCatching {
                args.customerEmail?.let { Orca.identify(it) }
                Orca.activeEntitlements()
            }.onSuccess { entitlements ->
                invoke.resolve(listResponse(entitlements.map(::jsonModelToJson)))
            }.onFailure {
                invoke.reject(it.message ?: "getActiveEntitlements failed")
            }
        }
    }

    @Command
    fun activeProduct(invoke: Invoke) {
        val args = invoke.parseArgs(CustomerArgs::class.java)
        scope.launch {
            runCatching {
                args.customerEmail?.let { Orca.identify(it) }
                Orca.activeProduct()
            }.onSuccess { products ->
                invoke.resolve(listResponse(products.map(::storeProductToJson)))
            }.onFailure {
                invoke.reject(it.message ?: "activeProduct failed")
            }
        }
    }

    @Command
    fun listEntitlements(invoke: Invoke) {
        scope.launch {
            runCatching {
                Orca.listEntitlements()
            }.onSuccess { entitlements ->
                invoke.resolve(listResponse(entitlements.map(::jsonModelToJson)))
            }.onFailure {
                invoke.reject(it.message ?: "listEntitlements failed")
            }
        }
    }

    private fun listResponse(items: List<JSONObject>): JSObject {
        val ret = JSObject()
        val data = JSONArray()
        items.forEach { data.put(it) }
        ret.put("data", data)
        return ret
    }

    private fun jsonModelToJson(value: Any): JSONObject {
        val adapter = Serializer.moshi.adapter(value.javaClass)
        val json = adapter.toJson(value)
        return JSONObject(json)
    }

    private fun storeProductToJson(product: StoreProduct): JSONObject {
        val entitlementJson = jsonModelToJson(product.entitlement)
        val entitlementType = entitlementJson.optString("entitlement_type")
        val periodMs = if (entitlementJson.has("period_ms") && !entitlementJson.isNull("period_ms")) {
            entitlementJson.optLong("period_ms")
        } else {
            -1L
        }
        val recurrenceDays = if (periodMs > -1L) (periodMs / 86_400_000L).toInt() else JSONObject.NULL

        val json = JSONObject()
        json.put("id", product.id)
        json.put("name", product.name)
        json.put("description", product.description)
        json.put("price", product.price)
        json.put("formattedPrice", product.formattedPrice)
        json.put("currencyCode", product.currencyCode)
        json.put("store", "playstore")
        json.put("subscriptionRecurrenceDays", recurrenceDays)
        json.put("accessLevel", entitlementJson.optString("name"))
        json.put("productType", entitlementType)
        json.put("entitlementId", entitlementJson.optString("id"))
        json.put("entitlement", entitlementJson)
        return json
    }
}
