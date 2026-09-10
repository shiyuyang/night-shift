use fs2::FileExt;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::{
    collections::{HashMap, VecDeque},
    fs::{self, File, OpenOptions},
    io::{self, Write},
    net::{SocketAddr, TcpStream},
    path::PathBuf,
    sync::{mpsc, Arc, Mutex},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};
use tungstenite::{client, Message};

fn now() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}
#[derive(Clone, Default, Serialize)]
struct Launch {
    session: String,
    play: String,
    language: Option<String>,
}
fn launch(args: Vec<String>) -> Result<Option<(Launch, u16, String)>, String> {
    let mut m = HashMap::new();
    let mut i = 0;
    while i < args.len() {
        if let Some(a) = args[i].strip_prefix("--") {
            let (k, v) = if let Some((k, v)) = a.split_once('=') {
                (k.to_string(), v.to_string())
            } else {
                i += 1;
                (a.to_string(), args.get(i).cloned().unwrap_or_default())
            };
            m.insert(k, v);
        }
        i += 1;
    }
    if !["ws-port", "session-id", "auth-token", "play-id"]
        .iter()
        .any(|k| m.contains_key(*k))
    {
        return Ok(None);
    }
    let get = |k: &str| {
        m.get(k)
            .filter(|s| !s.is_empty() && s.len() < 256)
            .cloned()
            .ok_or_else(|| format!("Invalid {k}"))
    };
    let port = get("ws-port")?.parse::<u16>().map_err(|_| "Invalid port")?;
    if port < 49152 {
        return Err("Invalid port range".into());
    }
    Ok(Some((
        Launch {
            session: get("session-id")?,
            play: get("play-id")?,
            language: m.get("language").cloned(),
        },
        port,
        get("auth-token")?,
    )))
}
#[derive(Default)]
struct Inbox {
    status: String,
    messages: VecDeque<Value>,
}
#[derive(Serialize, Deserialize, Default)]
struct Save {
    schema: u32,
    values: HashMap<String, String>,
}
struct Disk {
    dir: PathBuf,
    _lock: File,
}
impl Disk {
    fn open(dir: PathBuf) -> io::Result<Self> {
        fs::create_dir_all(&dir)?;
        let f = OpenOptions::new()
            .create(true)
            .truncate(false)
            .read(true)
            .write(true)
            .open(dir.join("save.lock"))?;
        f.try_lock_exclusive()?;
        Ok(Self { dir, _lock: f })
    }
    fn read(&self) -> Result<Option<Save>, String> {
        let mut damaged = false;
        for name in ["save.json", "save.backup.json"] {
            let p = self.dir.join(name);
            if !p.exists() {
                continue;
            }
            let bytes = fs::read(p).map_err(|e| e.to_string())?;
            if let Ok(s) = serde_json::from_slice::<Save>(&bytes) {
                if s.schema != 1 {
                    return Err("Unsupported save version".into());
                }
                return Ok(Some(s));
            }
            damaged = true;
        }
        if damaged {
            Err("Both save files are damaged".into())
        } else {
            Ok(None)
        }
    }
    fn write(&self, values: HashMap<String, String>) -> Result<(), String> {
        let data = serde_json::to_vec(&Save { schema: 1, values }).map_err(|e| e.to_string())?;
        if data.len() > 2_000_000 {
            return Err("Save too large".into());
        }
        let tmp = self.dir.join("save.tmp");
        let target = self.dir.join("save.json");
        let backup = self.dir.join("save.backup.json");
        let mut f = File::create(&tmp).map_err(|e| e.to_string())?;
        f.write_all(&data)
            .and_then(|_| f.sync_all())
            .map_err(|e| e.to_string())?;
        drop(f);
        // Keep the last valid snapshot. An interrupted rename is recovered from backup on startup.
        if target.exists() {
            if serde_json::from_slice::<Save>(&fs::read(&target).map_err(|e| e.to_string())?)
                .is_ok()
            {
                if backup.exists() {
                    fs::remove_file(&backup).map_err(|e| e.to_string())?;
                }
                fs::rename(&target, &backup).map_err(|e| e.to_string())?;
            } else {
                fs::rename(
                    &target,
                    self.dir.join(format!("save.damaged.{}.json", now())),
                )
                .map_err(|e| e.to_string())?;
            }
        }
        fs::rename(tmp, target).map_err(|e| e.to_string())?;
        Ok(())
    }
}
fn save_scope(base: PathBuf, play: Option<&str>) -> PathBuf {
    match play {
        Some(id) => base
            .join("plays")
            .join(format!("{:x}", Sha256::digest(id.as_bytes()))),
        None => base,
    }
}
pub struct Desktop {
    disk: Mutex<Disk>,
    launch: Launch,
    inbox: Arc<Mutex<Inbox>>,
    ack: mpsc::Sender<(String, bool)>,
}
impl Desktop {
    pub fn new(dir: PathBuf) -> Result<Self, Box<dyn std::error::Error>> {
        let parsed = launch(std::env::args().skip(1).collect());
        // Reject partial session arguments before opening any offline save.
        if let Err(e) = &parsed {
            return Err(e.clone().into());
        }
        let play = parsed
            .as_ref()
            .ok()
            .and_then(|v| v.as_ref())
            .map(|v| v.0.play.as_str());
        let disk = Disk::open(save_scope(dir, play))?;
        let (tx, rx) = mpsc::channel();
        let inbox = Arc::new(Mutex::new(Inbox {
            status: "offline".into(),
            ..Default::default()
        }));
        let mut config = Launch::default();
        match parsed {
            Ok(Some((l, port, token))) => {
                config = l.clone();
                let shared = inbox.clone();
                shared.lock().unwrap().status = "connecting".into();
                std::thread::spawn(move || {
                    if run_socket(l, port, token, shared.clone(), rx).is_err() {
                        shared.lock().unwrap().status = "disconnected".into();
                    }
                    shared.lock().unwrap().messages.clear();
                });
            }
            Err(_) => inbox.lock().unwrap().status = "invalid-launch".into(),
            _ => {}
        }
        Ok(Self {
            disk: Mutex::new(disk),
            launch: config,
            inbox,
            ack: tx,
        })
    }
}
#[tauri::command]
pub fn desktop_boot(state: tauri::State<Desktop>) -> Result<Value, String> {
    let s = state.disk.lock().unwrap().read()?;
    Ok(
        json!({"save":s.map(|s|s.values),"launch":state.launch,"scoped":!state.launch.play.is_empty()}),
    )
}
#[tauri::command]
pub fn desktop_save(
    state: tauri::State<Desktop>,
    values: HashMap<String, String>,
) -> Result<(), String> {
    if values.keys().any(|k| !k.starts_with("night-shift-")) {
        return Err("Invalid save key".into());
    }
    state.disk.lock().unwrap().write(values)
}
#[tauri::command]
pub fn desktop_poll(state: tauri::State<Desktop>) -> Value {
    let mut q = state.inbox.lock().unwrap();
    json!({"status":q.status,"messages":q.messages.drain(..).collect::<Vec<_>>()})
}
#[tauri::command]
pub fn desktop_ack(state: tauri::State<Desktop>, id: String, result: bool) -> Result<(), String> {
    state
        .ack
        .send((id, result))
        .map_err(|_| "Disconnected".into())
}
fn ack(id: &str, play: &str, result: bool) -> Value {
    json!({"type":"GAME_EVENT","message_id":uuid::Uuid::new_v4().to_string(),"timestamp":now(),"version":"1.0.0","payload":{"event":"GAME_TRIGGER_ACK","data":{"play_id":play,"ack_data":{"interaction_id":id,"result":result,"ack_timestamp":now().to_string()}}}})
}
fn run_socket(
    l: Launch,
    port: u16,
    token: String,
    inbox: Arc<Mutex<Inbox>>,
    rx: mpsc::Receiver<(String, bool)>,
) -> Result<(), Box<dyn std::error::Error>> {
    let addr: SocketAddr = format!("127.0.0.1:{port}").parse()?;
    let tcp = TcpStream::connect_timeout(&addr, Duration::from_secs(3))?;
    tcp.set_read_timeout(Some(Duration::from_secs(3)))?;
    tcp.set_write_timeout(Some(Duration::from_secs(3)))?;
    let (mut ws, _) = client(format!("ws://127.0.0.1:{port}"), tcp)?;
    ws.get_mut()
        .set_read_timeout(Some(Duration::from_millis(50)))?;
    let config: Value =
        serde_json::from_str(include_str!("../../game/live-studio-instructions.json"))?;
    ws.send(Message::Text(json!({"type":"AUTH","session_id":l.session,"auth_token":token,"timestamp":now(),"version":"1.0.0","client_info":{"game_id":config["gameId"],"game_version":env!("CARGO_PKG_VERSION")}}).to_string().into()))?;
    drop(token);
    let started = Instant::now();
    let mut last = Instant::now();
    let mut authed = false;
    // Never evict deduplication entries within a session; reject new traffic on saturation.
    let mut seen: HashMap<String, Option<bool>> = HashMap::new();
    let mut waiting: HashMap<String, Instant> = HashMap::new();
    loop {
        for (id, result) in rx.try_iter() {
            if seen.get(&id) == Some(&None) {
                seen.insert(id.clone(), Some(result));
                waiting.remove(&id);
                ws.send(Message::Text(ack(&id, &l.play, result).to_string().into()))?;
            }
        }
        if !authed && started.elapsed() > Duration::from_secs(10) {
            return Err("AUTH timeout".into());
        }
        if authed && last.elapsed() > Duration::from_secs(90) {
            return Err("Host heartbeat timeout".into());
        }
        if waiting
            .values()
            .any(|t| t.elapsed() > Duration::from_secs(180))
        {
            return Err("Renderer stalled".into());
        }
        let msg = match ws.read() {
            Ok(m) => m,
            Err(tungstenite::Error::Io(e))
                if matches!(
                    e.kind(),
                    io::ErrorKind::WouldBlock | io::ErrorKind::TimedOut
                ) =>
            {
                continue
            }
            Err(e) => return Err(e.into()),
        };
        last = Instant::now();
        match msg {
            Message::Ping(_) => {
                ws.flush()?;
                continue;
            }
            Message::Close(_) => break,
            Message::Text(text) => {
                if text.len() > 65536 {
                    return Err("Oversize message".into());
                }
                let m: Value = serde_json::from_str(&text)?;
                match m["type"].as_str() {
                    Some("AUTH_RESULT") => {
                        if authed || m["success"] != true || m["session_id"] != l.session {
                            return Err("AUTH rejected".into());
                        }
                        authed = true;
                        inbox.lock().unwrap().status = "authenticated".into();
                    }
                    Some("DISCONNECT") => break,
                    Some("GAME_COMMAND") if authed => {
                        let d = &m["payload"]["data"];
                        let Some(id) = d["interaction_id"]
                            .as_str()
                            .filter(|id| !id.is_empty() && id.len() < 256)
                        else {
                            continue;
                        };
                        if let Some(result) = seen.get(id) {
                            if let Some(result) = result {
                                ws.send(Message::Text(
                                    ack(id, &l.play, *result).to_string().into(),
                                ))?;
                            }
                            continue;
                        }
                        if seen.len() >= 4096 {
                            return Err("Session interaction limit".into());
                        }
                        let valid = m["payload"]["command"] == "TRIGGER_EFFECT"
                            && d["play_id"] == l.play
                            && d["count"].as_u64().is_some_and(|n| n > 0 && n <= 100)
                            && waiting.len() < 64;
                        if !valid {
                            seen.insert(id.to_string(), Some(false));
                            ws.send(Message::Text(ack(id, &l.play, false).to_string().into()))?;
                            continue;
                        }
                        seen.insert(id.to_string(), None);
                        waiting.insert(id.to_string(), Instant::now());
                        inbox.lock().unwrap().messages.push_back(d.clone());
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }
    inbox.lock().unwrap().status = "disconnected".into();
    let _ = ws.close(None);
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn launch_validation() {
        assert!(launch(vec![]).unwrap().is_none());
        assert!(launch(vec!["--ws-port=80".into()]).is_err());
        let p = launch(
            [
                "--ws-port",
                "55000",
                "--session-id=s",
                "--auth-token=t",
                "--play-id=7682641099949034247",
            ]
            .map(String::from)
            .to_vec(),
        )
        .unwrap()
        .unwrap();
        assert_eq!(p.0.play, "7682641099949034247");
    }
    #[test]
    fn save_recovery() {
        let dir = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
        {
            let d = Disk::open(dir.clone()).unwrap();
            assert!(d.read().unwrap().is_none());
            d.write(HashMap::from([("night-shift-test".into(), "one".into())]))
                .unwrap();
            d.write(HashMap::from([("night-shift-test".into(), "two".into())]))
                .unwrap();
            fs::write(dir.join("save.json"), b"broken").unwrap();
            assert_eq!(d.read().unwrap().unwrap().values["night-shift-test"], "one");
            assert!(Disk::open(dir.clone()).is_err());
        }
        fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn socket_auth_dedup_ack_ping() {
        use std::net::TcpListener;
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let port = listener.local_addr().unwrap().port();
        let inbox = Arc::new(Mutex::new(Inbox::default()));
        let shared = inbox.clone();
        let (tx, rx) = mpsc::channel();
        let client_thread = std::thread::spawn(move || {
            run_socket(
                Launch {
                    session: "session".into(),
                    play: "7682641099949034247".into(),
                    language: None,
                },
                port,
                "token".into(),
                shared,
                rx,
            )
            .map_err(|e| e.to_string())
        });
        let (tcp, _) = listener.accept().unwrap();
        tcp.set_read_timeout(Some(Duration::from_secs(5))).unwrap();
        let mut server = tungstenite::accept(tcp).unwrap();
        let auth: Value = serde_json::from_str(server.read().unwrap().to_text().unwrap()).unwrap();
        assert_eq!(auth["type"], "AUTH");
        assert_eq!(auth["client_info"]["game_id"], "7682641099949034247");
        server
            .send(Message::Text(
                json!({"type":"AUTH_RESULT","success":true,"session_id":"session"})
                    .to_string()
                    .into(),
            ))
            .unwrap();
        let command = json!({"type":"GAME_COMMAND","payload":{"command":"TRIGGER_EFFECT","data":{"interaction_id":"interaction","play_id":"7682641099949034247","instruction":"gift_flash","count":2}}});
        for _ in 0..2 {
            server
                .send(Message::Text(command.to_string().into()))
                .unwrap();
        }
        let start = Instant::now();
        while inbox.lock().unwrap().messages.is_empty() {
            assert!(start.elapsed() < Duration::from_secs(3));
            std::thread::sleep(Duration::from_millis(10));
        }
        std::thread::sleep(Duration::from_millis(100));
        assert_eq!(inbox.lock().unwrap().messages.len(), 1);
        tx.send(("interaction".into(), true)).unwrap();
        let first: Value = serde_json::from_str(server.read().unwrap().to_text().unwrap()).unwrap();
        assert_eq!(first["payload"]["data"]["ack_data"]["result"], true);
        server
            .send(Message::Text(command.to_string().into()))
            .unwrap();
        let replay: Value =
            serde_json::from_str(server.read().unwrap().to_text().unwrap()).unwrap();
        assert_eq!(
            replay["payload"]["data"]["ack_data"]["interaction_id"],
            "interaction"
        );
        assert_eq!(inbox.lock().unwrap().messages.len(), 1);
        server.send(Message::Ping(vec![1, 2, 3].into())).unwrap();
        assert!(matches!(server.read().unwrap(), Message::Pong(_)));
        server
            .send(Message::Text(
                json!({"type":"DISCONNECT"}).to_string().into(),
            ))
            .unwrap();
        assert!(client_thread.join().unwrap().is_ok());
    }

    #[test]
    fn play_saves_are_isolated() {
        let base = std::env::temp_dir().join(uuid::Uuid::new_v4().to_string());
        let a = save_scope(base.clone(), Some("7682641099949034247"));
        let b = save_scope(base.clone(), Some("7682641099949034248"));
        assert_ne!(a, b);
        assert_ne!(a, save_scope(base.clone(), None));
        assert!(save_scope(base.clone(), Some("../../outside")).starts_with(&base));
        {
            let d = Disk::open(a.clone()).unwrap();
            d.write(HashMap::from([(
                "night-shift-campaign-v1".into(),
                "{\"unlocked\":7}".into(),
            )]))
            .unwrap();
        }
        {
            let d = Disk::open(b).unwrap();
            assert!(d.read().unwrap().is_none());
        }
        {
            let d = Disk::open(a).unwrap();
            assert!(d
                .read()
                .unwrap()
                .unwrap()
                .values
                .contains_key("night-shift-campaign-v1"));
        }
        fs::remove_dir_all(base).unwrap();
    }
}

#[tauri::command]
pub fn desktop_diagnostic(error: String) {
    eprintln!(
        "Desktop startup: {}",
        error.chars().take(1000).collect::<String>()
    );
}
