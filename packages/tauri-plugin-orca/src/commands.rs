use tauri::{AppHandle, command, Runtime};

use crate::models::*;
use crate::Result;
use crate::OrcaExt;

#[command]
pub(crate) async fn runtime_platform<R: Runtime>(app: AppHandle<R>) -> Result<RuntimePlatformResponse> {
  Ok(RuntimePlatformResponse {
    platform: app.orca().runtime_platform(),
  })
}

#[command]
pub(crate) async fn configure<R: Runtime>(app: AppHandle<R>, payload: ConfigureRequest) -> Result<()> {
  app.orca().configure(payload)
}

#[command]
pub(crate) async fn identify<R: Runtime>(app: AppHandle<R>, payload: IdentifyRequest) -> Result<()> {
  app.orca().identify(payload)
}

#[command]
pub(crate) async fn logout<R: Runtime>(app: AppHandle<R>) -> Result<()> {
  app.orca().logout()
}

#[command]
pub(crate) async fn query_products<R: Runtime>(
  app: AppHandle<R>,
  payload: QueryProductsRequest,
) -> Result<OrcaListResponse> {
  app.orca().query_products(payload)
}

#[command]
pub(crate) async fn purchase<R: Runtime>(app: AppHandle<R>, payload: PurchaseRequest) -> Result<()> {
  app.orca().purchase(payload)
}

#[command]
pub(crate) async fn get_active_entitlements<R: Runtime>(
  app: AppHandle<R>,
  payload: CustomerRequest,
) -> Result<OrcaListResponse> {
  app.orca().get_active_entitlements(payload)
}

#[command]
pub(crate) async fn active_product<R: Runtime>(
  app: AppHandle<R>,
  payload: CustomerRequest,
) -> Result<OrcaListResponse> {
  app.orca().active_product(payload)
}

#[command]
pub(crate) async fn list_entitlements<R: Runtime>(app: AppHandle<R>) -> Result<OrcaListResponse> {
  app.orca().list_entitlements()
}
