# Windows / macOS 桌面测试版

桌面端使用 Tauri 2，复用游戏代码和全部语言资源。运行资源内置在应用中，不需要启动本地服务器，也不连接网站 CDN。传入 LIVE Studio 本地会话参数时通过原生 WebSocket 接收互动；无参数时作为单机游戏运行。

## 平台范围

| 平台 | 输出 | 运行要求 |
| --- | --- | --- |
| Windows x64 | 绿色 ZIP / NSIS `-setup.exe` | Windows 10 / 11 x64；内置固定版 WebView2 |
| macOS Apple Silicon | `.app` / `.dmg` | macOS 15.4 及以上，使用系统 WKWebView |
| macOS Intel | 单独的 `.app` / `.dmg` | macOS 15.4 及以上；单独打包以免每位用户下载两种架构 |

macOS 最低版本取决于游戏使用的 Ogg/Opus 解码支持，不能只按 Tauri 框架的最低版本判断。依据：[WebKit Safari 18.4 更新](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)。

自 0.4.6 起，Windows 提供两个绿色 ZIP，使用同一个 Release EXE：

- `full.zip`：完整内置 WebView2 Fixed Version 152.0.4191.62 x64，正常启动不联网准备运行库。完整解压到可写本地目录，保留 EXE 旁的 `WebView2/`。
- `lite.zip`：只有游戏 EXE，使用已安装的 WebView2；缺失时自动下载微软 Bootstrapper、验证 Microsoft Corporation Authenticode 签名并执行 `/silent /install`。原生窗口显示安装状态，可取消；失败时显示微软手动下载地址。下载限时 120 秒，安装等待上限 10 分钟，并发启动通过文件锁避免重复安装。

启动器发现 `WebView2/` 时只使用包内版本，文件缺失或权限失败会提示错误。没有该目录时才进入系统检测及在线补装。Tauri 使用 `webviewInstallMode: skip`，由启动器负责运行库选择，避免框架强制固定路径导致精简版无法启动。Windows 专用资源配置仍将完整运行库纳入 NSIS。

Windows 10 按微软要求为包内目录授予两个 AppContainer 组读取/执行权限，保持沙箱开启。固定版保留全部文件与许可证，更新需要重新打包；精简版运行库由微软更新。依据：[微软运行库分发说明](https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution)。

游戏按原启动参数连接 LIVE Studio，以宿主返回的 `TOKEN_EXPIRED` 判断凭证过期，显示“关闭游戏并从 LIVE Studio 重新打开”的确认弹窗；不会用本机计时猜测令牌是否有效，也不会复用旧令牌重连。当前平台有效期按用户提供的 90 秒规则理解。

## 构建

安装 Node.js、Rust stable 和对应平台的原生构建工具。Windows 原生构建需要 Visual Studio C++ Build Tools 和 Windows SDK；macOS 需要 Xcode Command Line Tools。先执行 `npm ci`。

```sh
# 独立构建完整离线前端；不覆盖网站 dist/，不上传 R2
npm run build:desktop

# 从微软 Fixed Version 页面下载锁定版本 CAB，先还原运行库
python3 scripts/restore-webview2.py /path/to/Microsoft.WebView2.FixedVersionRuntime.152.0.4191.62.x64.cab

# Windows 电脑构建 x64 安装器
rustup target add x86_64-pc-windows-msvc
npm run desktop:windows

# Mac 构建本机架构应用和 DMG
npm run desktop:macos

# Apple Silicon Mac 交叉编译 Intel 版
rustup target add x86_64-apple-darwin
npm run desktop:macos:intel
```

macOS 交叉编译 Windows 安装器：

```sh
brew install llvm nsis
cargo install --locked cargo-xwin
rustup target add x86_64-pc-windows-msvc
PATH="$(brew --prefix llvm)/bin:$PATH" npm run desktop:windows -- --runner cargo-xwin
```

Rust 的 `bin` 目录也必须在 `PATH` 中。需要强制使用已锁定的 Rust 依赖时，在上述构建命令最后加 `-- -- --locked`；如果已经传入其他 Tauri 参数，则在参数之后加 `-- --locked`。

输出位于 `src-tauri/target/[目标架构/]release/bundle/`，本机默认构建没有目标架构这一层。`Cargo.lock` 和 `package-lock.json` 都应随代码保留。应用版本读取根目录 `package.json`。

macOS 构建脚本使用 `--ci`，避免制作 DMG 时依赖前台 Finder 的交互状态。

## 体积控制

- 前端输出到 `dist-desktop/`，明确清空 CDN 和直播事件地址，避免 `.env` 中的网站配置进入离线包。
- 使用与网站相同的发布资源清单和本地哈希校验，排除原始 PNG、备用音频、预览图等。保留所有必需语言和字体。
- Rust Release 开启 LTO、体积优化和符号移除；Windows 安装器使用 LZMA。图标使用现有游戏 icon（磨砂玻璃后的人影），原图保存在 `src-tauri/icon-source.png`，转换为 ICO、ICNS 和对应 PNG 尺寸。
- Windows 包包含完整 WebView2，优先保证兼容性；不分发 Node.js。macOS 继续使用系统 WKWebView。

## 验证与分发边界

```sh
npx playwright install webkit
npm run test:browser:desktop
```

测试在 Chromium / WebKit 中加载 `dist-desktop/`，应用桌面 CSP，阻断并检查外部请求，验证菜单、语言持久化、进入游戏、暂停恢复，并逐一解码所有已发布音乐和音效。Chromium 还验证网页全屏回退。截图保存在 `output/desktop/`。

浏览器测试不等于原生安装测试。macOS 还应打开最终 `.app` 检查菜单、实际游戏画面、原生全屏和音频就绪状态；Windows 必须在真机或虚拟机上检查安装、离线启动、运行库目录权限、中文/空格路径和游戏运行。

当前配置用于本地测试版，不包含 Windows 代码签名或 Apple Developer ID 签名、公证。对外分发前需要配置对应签名流程；本地能打开不能证明其他电脑没有系统拦截。

## 0.4.3 本地协议与文件存档

- 原生层读取 `--ws-port`、`--session-id`、`--auth-token`、`--play-id`、`--language`（支持空格和等号形式），仅连接本机高位端口。令牌只用于本次 AUTH，不落盘，不自动复用重连。
- 六个 instruction 使用 `game/live-studio-instructions.json`。ID 全部保留字符串；count 为增量，支持 JavaScript 可安全表示的正整数。重复 interaction_id 不重复执行，完成后重发原 ACK；记录保留到会话结束，不再限制累计互动次数。
- 电池、闪光、治疗和幽影在状态更新后 ACK；故障在整个效果结束后 ACK；鬼打墙在移动完成并结束过场后 ACK。多个 count 全部执行后才成功。排队可跨暂停等待，不再设置固定 120 秒超时；本局结束或断开时取消并返回失败。渲染端停止轮询超过 180 秒视为异常。
- 菜单、结算、暂停、教学或正在位移时拒绝新效果；旧局退出、断开时清理生效及排队效果，包括幽影与备用电量。未知指令、错误 play_id、非法 count 不执行。
- 存档范围：解锁、语言和音量/声音设置、最近 30 局历史、本夜编号和地图种子、已学怪物教学。中途退出重新选中本夜，从相同地图的开头重玩，状态和未完成互动不恢复。
- 按 **play_id** 隔离全部文件数据，目录为 `应用数据目录/plays/SHA256(play_id)/`；不带会话参数的单机启动使用应用数据根目录。macOS 根目录为 `~/Library/Application Support/com.hospitalnightshift.game`，Windows 为系统 `%APPDATA%`（RoamingAppData）下应用标识目录（以 Tauri app_data_dir 为准）。
- 不做 localStorage 或旧版存档迁移。新范围从新进度开始。文件包含 schema 版本，未来未知版本拒绝覆盖。
- 通过临时文件落盘并同步、主文件与备份轮换、每范围独占文件锁来保护存档。主文件损坏时读取备份；两份都损坏时提示错误并保留文件。
- LIVE Studio 的 language 只设本次会话初始语言；用户主动切换才更新长期语言设置。

验证：`cargo test --manifest-path src-tauri/Cargo.toml`；启动 Vite 5194 后运行 `node tests/desktop-live.browser.mjs`。浏览器测试用契约桩替代 IPC，执行真实游戏逻辑；原生包联调另外记录，不混同为 Windows 实机验证。

### 生命周期

- 正常关闭窗口先完成存档、取消效果并等待回执，然后发送 `DISCONNECT / GAME_EXIT (101)` 和 WebSocket Close，最后退出。应用菜单退出也由原生层发送通知；强制终止进程仍由宿主检测。
- 保留宿主的断开原因码，清理互动后继续游戏；不会切换存档范围。提示连接错误或断开原因码，重新连接需从 LIVE Studio 启动新会话，不复用令牌。
- 就绪、等待、游戏中、暂停、结算分别通过 `GAME_READY` 和 `GAME_STATE_CHANGED` 上报；启动、存档和运行错误通过 `GAME_ERROR` 上报分类码，不上报令牌或本地路径。
- `GAME_EFFECT_MODE_CHANGED` 初始上报默认空字符串；`setDesktopEffectMode` 接受平台约定的字符串，包括空字符串。当前游戏没有额外玩法模式，不自行定义 power 模式。
- 观众头像使用消息中的 HTTPS 地址，加载失败显示昵称占位图；只有图片 CSP 开放 HTTPS。
- 去重记录保留整个会话；不设置累计互动次数上限，相关内存随会话互动数量增长，在进程结束时释放。

`tauri.windows.conf.json` 显式将 `WebView2/` 纳入安装器资源，避免交叉构建时只复制到 release 目录而漏入 NSIS；该资源配置只对 Windows 生效。

Windows 运行库锁定版本、CAB SHA-256 和完整文件哈希在 `scripts/webview2-runtime.json`；二进制目录不进入 Git。使用 `scripts/package-windows.py OUTPUT.zip` 生成并校验绿色 ZIP。Windows 真机验证仍需覆盖没有系统 WebView2、断网、Windows 10/11、中文/空格路径，以及 LIVE Studio 带参启动。

## ZIP 输出选项

```sh
# 先构建 Release EXE（不生成安装器）
npm exec -- tauri build --target x86_64-pc-windows-msvc --no-bundle --runner cargo-xwin
# 同时生成 full / lite
python3 scripts/package-windows.py output/desktop/0.4.6 --runtime both
# 只生成某一类
python3 scripts/package-windows.py output/desktop/full.zip --runtime full
python3 scripts/package-windows.py output/desktop/lite.zip --runtime lite
```

默认 `--runtime full`。精简 ZIP 的打包步骤不读取运行库；Windows 构建仍需还原运行库供资源配置使用。两个 ZIP 都校验 PE x64、ZIP CRC 和每个文件 SHA-256。0.4.6 还包含幽影随显隐变化的淡冷白微光。
