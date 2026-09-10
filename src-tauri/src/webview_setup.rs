//! Runs before Tauri creates a window. No WebView, JS or network crate required.
#[cfg(windows)]
mod windows {
    use std::{os::windows::process::CommandExt, process::Command};
    use windows_sys::Win32::{
        Globalization::GetUserDefaultLocaleName, System::SystemInformation::OSVERSIONINFOW,
        UI::WindowsAndMessaging::*,
    };
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
    #[link(name = "ntdll")]
    extern "system" {
        fn RtlGetVersion(info: *mut OSVERSIONINFOW) -> i32;
    }
    fn needs_acl() -> bool {
        let mut info: OSVERSIONINFOW = unsafe { std::mem::zeroed() };
        info.dwOSVersionInfoSize = std::mem::size_of::<OSVERSIONINFOW>() as u32;
        (unsafe { RtlGetVersion(&mut info) }) != 0 || info.dwBuildNumber < 22000
    }
    fn configure() -> bool {
        let Ok(exe) = std::env::current_exe() else {
            return false;
        };
        let Some(parent) = exe.parent() else {
            return false;
        };
        let runtime = parent.join("WebView2");
        if !["msedgewebview2.exe", "msedge.dll", "icudtl.dat"]
            .iter()
            .all(|name| runtime.join(name).is_file())
        {
            return false;
        }
        if needs_acl() {
            // Fixed Version 120+ needs both AppContainer groups on unpackaged Windows 10.
            // Grant read/execute only to this runtime directory; never disable the sandbox.
            let icacls = std::env::var_os("SystemRoot")
                .map(std::path::PathBuf::from)
                .unwrap_or_else(|| "C:\\Windows".into())
                .join("System32/icacls.exe");
            let status = Command::new(icacls)
                .arg(&runtime)
                .args([
                    "/grant",
                    "*S-1-15-2-2:(OI)(CI)(RX)",
                    "*S-1-15-2-1:(OI)(CI)(RX)",
                ])
                .creation_flags(0x08000000)
                .status();
            if !status.is_ok_and(|s| s.success()) {
                return false;
            }
        }
        std::env::set_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER", &runtime);
        tauri::webview_version().is_ok_and(|v| !v.trim().is_empty() && v != "0.0.0.0")
    }
    pub fn ensure() -> bool {
        let bundled = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.join("WebView2").exists()))
            .unwrap_or(false);
        if !bundled {
            std::env::remove_var("WEBVIEW2_BROWSER_EXECUTABLE_FOLDER");
            return crate::webview_download::ensure();
        }
        if configure() {
            return true;
        }
        let text = super::message(&language(), "desktop.bundledRuntimeError");
        unsafe {
            MessageBoxW(
                std::ptr::null_mut(),
                wide(&text).as_ptr(),
                wide("夜勤病棟").as_ptr(),
                MB_OK | MB_ICONERROR,
            );
        }
        false
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
                super::message(input, "desktop.bundledRuntimeError"),
                super::message(locale, "desktop.bundledRuntimeError")
            );
        }
    }
}
