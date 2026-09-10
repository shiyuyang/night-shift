//! Runs before Tauri creates a window. No WebView, JS or network crate required.
#[cfg(windows)]
mod windows {
    use fs2::FileExt;
    use std::{
        fs::{self, OpenOptions},
        os::windows::process::CommandExt,
        process::Command,
        time::{Duration, Instant},
    };
    use windows_sys::Win32::{Globalization::GetUserDefaultLocaleName, UI::WindowsAndMessaging::*};
    const WEBSITE: &str = "https://developer.microsoft.com/microsoft-edge/webview2/";
    fn wide(s: &str) -> Vec<u16> {
        s.encode_utf16().chain(Some(0)).collect()
    }
    fn language() -> String {
        let args: Vec<String> = std::env::args().collect();
        for (i, arg) in args.iter().enumerate() {
            if let Some(value) = arg.strip_prefix("--language=") {
                return value.into();
            }
            if arg == "--language" {
                if let Some(value) = args.get(i + 1) {
                    return value.clone();
                }
            }
        }
        let mut buf = [0u16; 85];
        let len = unsafe { GetUserDefaultLocaleName(buf.as_mut_ptr(), 85) };
        if len > 0 {
            String::from_utf16_lossy(&buf[..len as usize - 1])
        } else {
            "en".into()
        }
    }
    fn message(key: &str) -> String {
        super::message(&language(), key).replace("{url}", WEBSITE)
    }
    fn installed() -> bool {
        tauri::webview_version().is_ok_and(|v| !v.trim().is_empty() && v != "0.0.0.0")
    }
    fn error() {
        unsafe {
            MessageBoxW(
                std::ptr::null_mut(),
                wide(&message("desktop.webviewInstallError")).as_ptr(),
                wide("夜勤病棟").as_ptr(),
                MB_OK | MB_ICONERROR,
            );
        }
    }
    pub fn ensure() -> bool {
        if installed() {
            return true;
        }
        let result = install();
        if result && installed() {
            true
        } else {
            error();
            false
        }
    }
    fn install() -> bool {
        let root = std::env::temp_dir();
        let Ok(lock) = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(root.join("night-shift-webview2.lock"))
        else {
            return false;
        };
        // A second launch waits for the first installation rather than starting another installer.
        let start = Instant::now();
        while lock.try_lock_exclusive().is_err() {
            if installed() {
                return true;
            }
            if start.elapsed() > Duration::from_secs(600) {
                return false;
            }
            std::thread::sleep(Duration::from_millis(250));
        }
        if installed() {
            return true;
        }
        let dir = root.join(format!("night-shift-webview2-{}", uuid::Uuid::new_v4()));
        if fs::create_dir(&dir).is_err() {
            return false;
        }
        let exe = dir.join("MicrosoftEdgeWebview2Setup.exe");
        // Execute a constant script; paths are environment data, never interpolated shell code.
        let powershell = std::env::var_os("SystemRoot")
            .map(std::path::PathBuf::from)
            .unwrap_or_else(|| "C:\\Windows".into())
            .join("System32/WindowsPowerShell/v1.0/powershell.exe");
        let child = Command::new(powershell)
            .args([
                "-NoLogo",
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                include_str!("install-webview.ps1"),
            ])
            .env("NIGHTSHIFT_BOOTSTRAPPER", &exe)
            .creation_flags(0x08000000)
            .spawn();
        let success = if let Ok(mut child) = child {
            unsafe {
                let window = CreateWindowExW(
                    0,
                    wide("STATIC").as_ptr(),
                    wide("夜勤病棟").as_ptr(),
                    WS_OVERLAPPED | WS_CAPTION | WS_SYSMENU | WS_VISIBLE,
                    CW_USEDEFAULT,
                    CW_USEDEFAULT,
                    680,
                    170,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null(),
                );
                CreateWindowExW(
                    0,
                    wide("STATIC").as_ptr(),
                    wide(&message("desktop.webviewInstalling")).as_ptr(),
                    WS_CHILD | WS_VISIBLE,
                    20,
                    25,
                    620,
                    90,
                    window,
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null(),
                );
                let began = Instant::now();
                let result = loop {
                    let mut msg: MSG = std::mem::zeroed();
                    while PeekMessageW(&mut msg, std::ptr::null_mut(), 0, 0, PM_REMOVE) != 0 {
                        TranslateMessage(&msg);
                        DispatchMessageW(&msg);
                    }
                    match child.try_wait() {
                        Ok(Some(status)) => break status.success() || status.code() == Some(3010),
                        Err(_) => break false,
                        _ => {}
                    }
                    if IsWindow(window) == 0 || began.elapsed() > Duration::from_secs(600) {
                        // Also stop the installer's descendants on cancellation/timeout.
                        let taskkill = std::env::var_os("SystemRoot")
                            .map(std::path::PathBuf::from)
                            .unwrap_or_else(|| "C:\\Windows".into())
                            .join("System32/taskkill.exe");
                        let _ = Command::new(taskkill)
                            .args(["/PID", &child.id().to_string(), "/T", "/F"])
                            .creation_flags(0x08000000)
                            .status();
                        let _ = child.kill();
                        let _ = child.wait();
                        break false;
                    }
                    std::thread::sleep(Duration::from_millis(50));
                };
                if IsWindow(window) != 0 {
                    DestroyWindow(window);
                }
                result
            }
        } else {
            false
        };
        let _ = fs::remove_dir_all(&dir);
        success
    }
}
#[cfg(windows)]
pub use windows::ensure;
#[cfg(any(windows, test))]
fn message(language: &str, key: &str) -> String {
    let tag = language.to_lowercase().replace('_', "-");
    let locale = if tag == "zh" || tag.starts_with("zh-") {
        if tag.contains("hant") {
            "zh-Hant"
        } else if tag.contains("hans") || tag.split('-').any(|p| p == "cn" || p == "sg") {
            "zh-CN"
        } else {
            "zh-Hant"
        }
    } else {
        tag.split('-').next().unwrap_or("en")
    };
    let catalogs: serde_json::Value = serde_json::from_str(include_str!(concat!(
        env!("OUT_DIR"),
        "/launcher-locales.json"
    )))
    .expect("Compiled launcher catalogs");
    catalogs
        .get(locale)
        .and_then(|c| c.get(key))
        .or_else(|| catalogs["en"].get(key))
        .and_then(|s| s.as_str())
        .unwrap_or(key)
        .into()
}
#[cfg(test)]
mod tests {
    #[test]
    fn native_language_matches_game_fallback() {
        for (input, locale) in [
            ("ja-JP", "ja"),
            ("zh-Hans", "zh-CN"),
            ("zh-Hant-TW", "zh-Hant"),
            ("zh", "zh-Hant"),
            ("zz", "en"),
        ] {
            assert_eq!(
                super::message(input, "desktop.webviewInstalling"),
                super::message(locale, "desktop.webviewInstalling")
            );
        }
    }
}
