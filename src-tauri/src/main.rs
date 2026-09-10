#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod desktop;
use tauri::Manager;
fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let state = desktop::Desktop::new(app.path().app_data_dir()?)?;
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop::desktop_boot,
            desktop::desktop_save,
            desktop::desktop_poll,
            desktop::desktop_ack,
            desktop::desktop_diagnostic
        ])
        .run(tauri::generate_context!())
        .expect("Desktop runtime failed");
}
