import { invoke, isTauri } from '@tauri-apps/api/core'
import { OrcaClient, type Environment, type ExternalStore, type LegacyEnvironment, type OrcaClientProduct, type ProrationMode, type StorableEntitlement, type TenantEntitlement } from '@maxint/orca-sdk'

export type RuntimePlatform = 'web' | 'windows' | 'linux' | 'macos' | 'android' | 'ios'

export type OrcaEnvironment = LegacyEnvironment

export type OrcaPurchaseOptions = {
  proratedProductId?: string
  prorationMode?: ProrationMode
  externalStore?: ExternalStore
  redirectUrl?: string
  failureRedirectUrl?: string
  replacementMode?: string
  autoRedirect?: boolean
}

export type OrcaOptions = {
  publicKey: string
  environment: OrcaEnvironment
  baseUrl?: string
  customerEmail?: string
}

type RuntimePlatformResponse = {
  platform: RuntimePlatform
}

type OrcaListResponse = {
  data: unknown[]
}

type NativePurchasePayload = {
  entitlement: TenantEntitlement
  externalStore?: ExternalStore
  redirectUrl?: string
  failureRedirectUrl?: string
  proratedProduct?: {
    productId: string
  }
  prorationMode?: ProrationMode
  replacementMode?: string
}

const DEFAULT_BASE_URL = 'https://api.orca.maxint.com'
const DEFAULT_REDIRECT_URL = 'https://example.com/success'
const DEFAULT_FAILURE_REDIRECT_URL = 'https://example.com/failure'

function normalizeEnvironment(environment: OrcaEnvironment): Environment {
  return environment === 'production' ? 'prod' : 'sandbox'
}

async function invokeOrca<T>(command: string, payload?: Record<string, unknown>): Promise<T> {
  return invoke<T>(`plugin:orca|${command}`, payload)
}

function decodeList<T>(response: OrcaListResponse): T[] {
  return Array.isArray(response.data) ? (response.data as T[]) : []
}

export class Orca {
  private readonly client: OrcaClient
  private readonly options: OrcaOptions
  private readonly runtimePlatformPromise: Promise<RuntimePlatform>

  constructor(options: OrcaOptions) {
    this.options = options
    this.client = new OrcaClient(
      options.publicKey,
      normalizeEnvironment(options.environment),
      options.baseUrl ?? DEFAULT_BASE_URL,
      options.customerEmail,
    )
    this.runtimePlatformPromise = this.resolveRuntimePlatform()
  }

  private async resolveRuntimePlatform(): Promise<RuntimePlatform> {
    if (!isTauri()) {
      return 'web'
    }
    const response = await invokeOrca<RuntimePlatformResponse>('runtime_platform')
    return response.platform
  }

  async platform(): Promise<RuntimePlatform> {
    return this.runtimePlatformPromise
  }

  async configure(): Promise<void> {
    if (await this.usesSdkDirectly()) {
      return
    }
    await invokeOrca('configure', {
      payload: {
        publicKey: this.options.publicKey,
        environment: this.options.environment,
        baseUrl: this.options.baseUrl,
        customerEmail: this.options.customerEmail,
      },
    })
  }

  private async usesSdkDirectly(): Promise<boolean> {
    const platform = await this.runtimePlatformPromise
    return platform === 'web' || platform === 'windows' || platform === 'linux'
  }

  async identify(customerEmail: string): Promise<void> {
    if (await this.usesSdkDirectly()) {
      await this.client.identify(customerEmail)
      return
    }
    await this.configure()
    await invokeOrca('identify', { payload: { customerEmail } })
  }

  async logout(): Promise<void> {
    if (await this.usesSdkDirectly()) {
      this.client.logout()
      return
    }
    await invokeOrca('logout')
  }

  async queryProducts(externalStore: ExternalStore = 'stripe'): Promise<OrcaClientProduct[]> {
    if (await this.usesSdkDirectly()) {
      return this.client.queryProducts(externalStore)
    }
    await this.configure()
    const response = await invokeOrca<OrcaListResponse>('query_products', {
      payload: {
        externalStore,
      },
    })
    return decodeList<OrcaClientProduct>(response)
  }

  async purchase(entitlement: TenantEntitlement, options: OrcaPurchaseOptions = {}): Promise<void> {
    if (await this.usesSdkDirectly()) {
      await this.client.purchase({
        store: options.externalStore ?? 'stripe',
        entitlement,
        redirectUrl: options.redirectUrl ?? DEFAULT_REDIRECT_URL,
        failureRedirectUrl: options.failureRedirectUrl ?? DEFAULT_FAILURE_REDIRECT_URL,
        proratedProductId: options.proratedProductId,
        prorationMode: options.prorationMode,
        autoRedirect: options.autoRedirect,
      })
      return
    }

    await this.configure()
    const payload: NativePurchasePayload = {
      entitlement,
      externalStore: options.externalStore,
      redirectUrl: options.redirectUrl,
      failureRedirectUrl: options.failureRedirectUrl,
      proratedProduct: options.proratedProductId
        ? {
          productId: options.proratedProductId,
        }
        : undefined,
      prorationMode: options.prorationMode,
      replacementMode: options.replacementMode,
    }
    await invokeOrca('purchase', { payload })
  }

  async getActiveEntitlements(customerEmail?: string): Promise<StorableEntitlement[]> {
    if (await this.usesSdkDirectly()) {
      return this.client.getActiveEntitlements(customerEmail)
    }
    await this.configure()
    const response = await invokeOrca<OrcaListResponse>('get_active_entitlements', {
      payload: {
        customerEmail,
      },
    })
    return decodeList<StorableEntitlement>(response)
  }

  async activeProduct(customerEmail?: string): Promise<OrcaClientProduct[]> {
    if (await this.usesSdkDirectly()) {
      const activeEntitlements = await this.client.getActiveEntitlements(customerEmail)
      const [stripeProducts, gocardlessProducts] = await Promise.all([
        this.client.queryProducts('stripe'),
        this.client.queryProducts('gocardless'),
      ])
      const products = [...stripeProducts, ...gocardlessProducts]
      const activeEntitlementIds = new Set(activeEntitlements.map((item) => item.entitlement_id))
      return products.filter((item) => activeEntitlementIds.has(item.entitlementId))
    }
    await this.configure()
    const response = await invokeOrca<OrcaListResponse>('active_product', {
      payload: {
        customerEmail,
      },
    })
    return decodeList<OrcaClientProduct>(response)
  }

  async listEntitlements(): Promise<TenantEntitlement[]> {
    if (await this.usesSdkDirectly()) {
      return this.client.listEntitlements()
    }
    await this.configure()
    const response = await invokeOrca<OrcaListResponse>('list_entitlements')
    return decodeList<TenantEntitlement>(response)
  }
}

export type {
  ExternalStore,
  OrcaClientProduct,
  ProrationMode,
  StorableEntitlement,
  TenantEntitlement,
}
