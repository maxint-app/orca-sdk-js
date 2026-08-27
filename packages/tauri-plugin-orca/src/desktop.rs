use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

#[cfg(target_os = "macos")]
mod macos_ffi {
  use std::ffi::{CStr, CString};
  use std::os::raw::c_char;

  unsafe extern "C" {
    fn orca_configure_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_identify_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_logout_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_query_products_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_purchase_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_get_active_entitlements_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_active_product_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_list_entitlements_ffi(payload: *const c_char) -> *mut c_char;
    fn orca_free_string_ffi(pointer: *mut c_char);
  }

  #[derive(serde::Deserialize)]
  struct FfiResponse {
    ok: bool,
    data: Option<serde_json::Value>,
    error: Option<String>,
  }

  fn call_ffi(
    call: unsafe extern "C" fn(*const c_char) -> *mut c_char,
    payload: &serde_json::Value,
  ) -> crate::Result<serde_json::Value> {
    let payload_string = serde_json::to_string(payload)
      .map_err(|e| crate::Error::Message(format!("Failed to serialize payload: {e}")))?;
    let payload_c = CString::new(payload_string)
      .map_err(|e| crate::Error::Message(format!("Invalid payload string: {e}")))?;

    let response_ptr = unsafe { call(payload_c.as_ptr()) };
    if response_ptr.is_null() {
      return Err(crate::Error::Message("Orca Apple FFI returned null response".to_string()));
    }

    let response = unsafe {
      let cstr = CStr::from_ptr(response_ptr);
      let owned = cstr.to_string_lossy().into_owned();
      orca_free_string_ffi(response_ptr);
      owned
    };

    let parsed: FfiResponse = serde_json::from_str(&response).map_err(|e| {
      crate::Error::Message(format!("Failed to parse Orca Apple FFI response: {e}"))
    })?;

    if !parsed.ok {
      return Err(crate::Error::Message(
        parsed
          .error
          .unwrap_or_else(|| "Orca Apple FFI call failed".to_string()),
      ));
    }

    Ok(parsed.data.unwrap_or(serde_json::Value::Null))
  }

  pub fn configure(payload: &ConfigureRequest) -> crate::Result<()> {
    let value = serde_json::to_value(payload)
      .map_err(|e| crate::Error::Message(format!("Failed to encode configure payload: {e}")))?;
    let _ = call_ffi(orca_configure_ffi, &value)?;
    Ok(())
  }

  pub fn identify(payload: &IdentifyRequest) -> crate::Result<()> {
    let value = serde_json::to_value(payload)
      .map_err(|e| crate::Error::Message(format!("Failed to encode identify payload: {e}")))?;
    let _ = call_ffi(orca_identify_ffi, &value)?;
    Ok(())
  }

  pub fn logout() -> crate::Result<()> {
    let _ = call_ffi(orca_logout_ffi, &serde_json::json!({}))?;
    Ok(())
  }

  pub fn query_products(payload: &QueryProductsRequest) -> crate::Result<OrcaListResponse> {
    let value = serde_json::to_value(payload).map_err(|e| {
      crate::Error::Message(format!("Failed to encode queryProducts payload: {e}"))
    })?;
    let data = call_ffi(orca_query_products_ffi, &value)?;
    parse_list(data)
  }

  pub fn purchase(payload: &PurchaseRequest) -> crate::Result<()> {
    let value = serde_json::to_value(payload)
      .map_err(|e| crate::Error::Message(format!("Failed to encode purchase payload: {e}")))?;
    let _ = call_ffi(orca_purchase_ffi, &value)?;
    Ok(())
  }

  pub fn get_active_entitlements(payload: &CustomerRequest) -> crate::Result<OrcaListResponse> {
    let value = serde_json::to_value(payload).map_err(|e| {
      crate::Error::Message(format!("Failed to encode getActiveEntitlements payload: {e}"))
    })?;
    let data = call_ffi(orca_get_active_entitlements_ffi, &value)?;
    parse_list(data)
  }

  pub fn active_product(payload: &CustomerRequest) -> crate::Result<OrcaListResponse> {
    let value = serde_json::to_value(payload)
      .map_err(|e| crate::Error::Message(format!("Failed to encode activeProduct payload: {e}")))?;
    let data = call_ffi(orca_active_product_ffi, &value)?;
    parse_list(data)
  }

  pub fn list_entitlements() -> crate::Result<OrcaListResponse> {
    let data = call_ffi(orca_list_entitlements_ffi, &serde_json::json!({}))?;
    parse_list(data)
  }

  fn parse_list(data: serde_json::Value) -> crate::Result<OrcaListResponse> {
    match data {
      serde_json::Value::Array(values) => Ok(OrcaListResponse { data: values }),
      serde_json::Value::Null => Ok(OrcaListResponse::default()),
      other => Err(crate::Error::Message(format!(
        "Expected list response from Orca Apple FFI, got: {other}"
      ))),
    }
  }
}

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
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::configure(&_payload);
      }
    }
    Ok(())
  }

  pub fn identify(&self, _payload: IdentifyRequest) -> crate::Result<()> {
    if cfg!(target_os = "macos") {
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::identify(&_payload);
      }
    }
    Ok(())
  }

  pub fn logout(&self) -> crate::Result<()> {
    if cfg!(target_os = "macos") {
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::logout();
      }
    }
    Ok(())
  }

  pub fn query_products(&self, _payload: QueryProductsRequest) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::query_products(&_payload);
      }
    }
    Ok(OrcaListResponse::default())
  }

  pub fn purchase(&self, _payload: PurchaseRequest) -> crate::Result<()> {
    if cfg!(target_os = "macos") {
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::purchase(&_payload);
      }
    }
    Ok(())
  }

  pub fn get_active_entitlements(
    &self,
    _payload: CustomerRequest,
  ) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::get_active_entitlements(&_payload);
      }
    }
    Ok(OrcaListResponse::default())
  }

  pub fn active_product(&self, _payload: CustomerRequest) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::active_product(&_payload);
      }
    }
    Ok(OrcaListResponse::default())
  }

  pub fn list_entitlements(&self) -> crate::Result<OrcaListResponse> {
    if cfg!(target_os = "macos") {
      #[cfg(target_os = "macos")]
      {
        return macos_ffi::list_entitlements();
      }
    }
    Ok(OrcaListResponse::default())
  }
}
