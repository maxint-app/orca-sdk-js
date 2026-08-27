use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RuntimePlatform {
  Web,
  Windows,
  Linux,
  Macos,
  Android,
  Ios,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimePlatformResponse {
  pub platform: RuntimePlatform,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigureRequest {
  pub public_key: String,
  pub environment: String,
  pub base_url: Option<String>,
  pub customer_email: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdentifyRequest {
  pub customer_email: String,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ExternalStore {
  Stripe,
  Gocardless,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ProrationMode {
  Upgrade,
  Downgrade,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryProductsRequest {
  pub external_store: Option<ExternalStore>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PurchaseRequest {
  pub entitlement: serde_json::Value,
  pub external_store: Option<ExternalStore>,
  pub redirect_url: Option<String>,
  pub failure_redirect_url: Option<String>,
  pub prorated_product: Option<serde_json::Value>,
  pub proration_mode: Option<ProrationMode>,
  pub replacement_mode: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CustomerRequest {
  pub customer_email: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OrcaListResponse {
  pub data: Vec<serde_json::Value>,
}
