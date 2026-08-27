const COMMANDS: &[&str] = &[
  "runtime_platform",
  "configure",
  "identify",
  "logout",
  "query_products",
  "purchase",
  "get_active_entitlements",
  "active_product",
  "list_entitlements",
];

fn main() {
  #[cfg(target_os = "macos")]
  {
    swift_rs::SwiftLinker::new("12")
      .with_git("Orca", "https://github.com/maxint-app/orca-apple.git", "main")
      .link();
  }

  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
