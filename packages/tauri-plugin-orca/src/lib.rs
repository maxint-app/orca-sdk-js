use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

pub use models::*;

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;
mod models;

pub use error::{Error, Result};

#[cfg(desktop)]
use desktop::Orca;
#[cfg(mobile)]
use mobile::Orca;

/// Extensions to [`tauri::App`], [`tauri::AppHandle`] and [`tauri::Window`] to access the orca APIs.
pub trait OrcaExt<R: Runtime> {
  fn orca(&self) -> &Orca<R>;
}

impl<R: Runtime, T: Manager<R>> crate::OrcaExt<R> for T {
  fn orca(&self) -> &Orca<R> {
    self.state::<Orca<R>>().inner()
  }
}

/// Initializes the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new("orca")
    .invoke_handler(tauri::generate_handler![
      commands::runtime_platform,
      commands::configure,
      commands::identify,
      commands::logout,
      commands::query_products,
      commands::purchase,
      commands::get_active_entitlements,
      commands::active_product,
      commands::list_entitlements
    ])
    .setup(|app, api| {
      #[cfg(mobile)]
      let orca = mobile::init(app, api)?;
      #[cfg(desktop)]
      let orca = desktop::init(app, api)?;
      app.manage(orca);
      Ok(())
    })
    .build()
}
