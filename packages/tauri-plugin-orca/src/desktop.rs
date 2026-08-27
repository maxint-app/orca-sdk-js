use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<Orca<R>> {
  Ok(Orca(app.clone()))
}

/// Access to the orca APIs.
pub struct Orca<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Orca<R> {
  pub fn runtime_platform(&self) -> RuntimePlatform {
    if cfg!(target_os = "windows") {
      RuntimePlatform::Windows
    } else if cfg!(target_os = "linux") {
      RuntimePlatform::Linux
    } else if cfg!(target_os = "macos") {
      RuntimePlatform::Macos
    } else {
      RuntimePlatform::Linux
    }
  }

  pub fn configure(&self, _payload: ConfigureRequest) -> crate::Result<()> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(())
  }

  pub fn identify(&self, _payload: IdentifyRequest) -> crate::Result<()> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(())
  }

  pub fn logout(&self) -> crate::Result<()> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(())
  }

  pub fn query_products(&self, _payload: QueryProductsRequest) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(OrcaListResponse::default())
  }

  pub fn purchase(&self, _payload: PurchaseRequest) -> crate::Result<()> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(())
  }

  pub fn get_active_entitlements(
    &self,
    _payload: CustomerRequest,
  ) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(OrcaListResponse::default())
  }

  pub fn active_product(&self, _payload: CustomerRequest) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(OrcaListResponse::default())
  }

  pub fn list_entitlements(&self) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      return Err(crate::Error::Message(
        "macOS native bridge is not implemented yet. Wire this plugin to orca-apple.".to_string(),
      ));
    }
    Ok(OrcaListResponse::default())
  }
}
