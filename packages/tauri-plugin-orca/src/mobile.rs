use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_orca);

// initializes the Kotlin or Swift plugin classes
pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Orca<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.maxint.tauri.plugin.orca", "OrcaPlugin")?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_orca)?;
  Ok(Orca(handle))
}

/// Access to the orca APIs.
pub struct Orca<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Orca<R> {
  pub fn runtime_platform(&self) -> RuntimePlatform {
    if cfg!(target_os = "android") {
      RuntimePlatform::Android
    } else {
      RuntimePlatform::Ios
    }
  }

  pub fn configure(&self, payload: ConfigureRequest) -> crate::Result<()> {
    self
      .0
      .run_mobile_plugin("configure", payload)
      .map_err(Into::into)
  }

  pub fn identify(&self, payload: IdentifyRequest) -> crate::Result<()> {
    self
      .0
      .run_mobile_plugin("identify", payload)
      .map_err(Into::into)
  }

  pub fn logout(&self) -> crate::Result<()> {
    self
      .0
      .run_mobile_plugin("logout", ())
      .map_err(Into::into)
  }

  pub fn query_products(&self, payload: QueryProductsRequest) -> crate::Result<OrcaListResponse> {
    self
      .0
      .run_mobile_plugin("queryProducts", payload)
      .map_err(Into::into)
  }

  pub fn purchase(&self, payload: PurchaseRequest) -> crate::Result<()> {
    self
      .0
      .run_mobile_plugin("purchase", payload)
      .map_err(Into::into)
  }

  pub fn get_active_entitlements(
    &self,
    payload: CustomerRequest,
  ) -> crate::Result<OrcaListResponse> {
    self
      .0
      .run_mobile_plugin("getActiveEntitlements", payload)
      .map_err(Into::into)
  }

  pub fn active_product(&self, payload: CustomerRequest) -> crate::Result<OrcaListResponse> {
    self
      .0
      .run_mobile_plugin("activeProduct", payload)
      .map_err(Into::into)
  }

  pub fn list_entitlements(&self) -> crate::Result<OrcaListResponse> {
    self
      .0
      .run_mobile_plugin("listEntitlements", ())
      .map_err(Into::into)
  }
}
