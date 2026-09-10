#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod desktop;
#[cfg(windows)]
mod webview_download;
mod webview_setup;
use tauri::Manager;
fn main() {
    #[cfg(windows)]
    if !webview_setup::ensure() {
        return;
    }
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
            desktop::desktop_event,
            desktop::desktop_shutdown,
            desktop::desktop_diagnostic
        ])
        .build(tauri::generate_context!())
        .expect("Desktop runtime failed")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { .. } = event {
                app.state::<desktop::Desktop>().shutdown();
            }
        });
}
