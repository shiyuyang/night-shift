fn main() {
    let mut catalogs = serde_json::Map::new();
    for entry in std::fs::read_dir("../game/locales").unwrap() {
        let path = entry.unwrap().path();
        if path.extension().is_some_and(|e| e == "json") {
            println!("cargo:rerun-if-changed={}", path.display());
            let source: serde_json::Value =
                serde_json::from_slice(&std::fs::read(&path).unwrap()).unwrap();
            let mut messages = serde_json::Map::new();
            for key in ["desktop.webviewInstalling", "desktop.webviewInstallError"] {
                messages.insert(key.into(), source[key].clone());
            }
            catalogs.insert(
                path.file_stem().unwrap().to_str().unwrap().into(),
                messages.into(),
            );
        }
    }
    std::fs::write(
        std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap()).join("launcher-locales.json"),
        serde_json::to_vec(&catalogs).unwrap(),
    )
    .unwrap();
    tauri_build::build()
}
