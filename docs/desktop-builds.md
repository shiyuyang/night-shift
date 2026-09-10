# Windows / macOS 桌面测试版

桌面端使用 Tauri 2，复用游戏代码和全部语言资源。运行资源内置在应用中，不需要启动本地服务器，也不连接网站 CDN。直播事件接口不包含在离线版中。

## 平台范围

| 平台 | 输出 | 运行要求 |
| --- | --- | --- |
| Windows x64 | NSIS `-setup.exe` | Windows 10 / 11 和 WebView2；安装器检测运行库，仅在缺少时联网下载安装 |
| macOS Apple Silicon | `.app` / `.dmg` | macOS 15.4 及以上，使用系统 WKWebView |
| macOS Intel | 单独的 `.app` / `.dmg` | macOS 15.4 及以上；单独打包以免每位用户下载两种架构 |

macOS 最低版本取决于游戏使用的 Ogg/Opus 解码支持，不能只按 Tauri 框架的最低版本判断。依据：[WebKit Safari 18.4 更新](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/)。

WebView2 运行库不计入游戏安装包；缺少运行库的 Windows 电脑首次安装需要额外下载，因此本方案不保证全新系统可以完全离线安装。依据：[Tauri Windows 分发说明](https://v2.tauri.app/distribute/windows-installer/)。

## 构建

安装 Node.js、Rust stable 和对应平台的原生构建工具。Windows 原生构建需要 Visual Studio C++ Build Tools 和 Windows SDK；macOS 需要 Xcode Command Line Tools。先执行 `npm ci`。

```sh
# 独立构建完整离线前端；不覆盖网站 dist/，不上传 R2
npm run build:desktop

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
- 不随应用分发 Chromium 或 Node.js，也不内置完整 WebView2 运行库。

## 验证与分发边界

```sh
npx playwright install webkit
npm run test:browser:desktop
```

测试在 Chromium / WebKit 中加载 `dist-desktop/`，应用桌面 CSP，阻断并检查外部请求，验证菜单、语言持久化、进入游戏、暂停恢复，并逐一解码所有已发布音乐和音效。Chromium 还验证网页全屏回退。截图保存在 `output/desktop/`。

浏览器测试不等于原生安装测试。macOS 还应打开最终 `.app` 检查菜单、实际游戏画面、原生全屏和音频就绪状态；Windows 必须在真机或虚拟机上检查安装、WebView2 补装和游戏运行。

当前配置用于本地测试版，不包含 Windows 代码签名或 Apple Developer ID 签名、公证。对外分发前需要配置对应签名流程；本地能打开不能证明其他电脑没有系统拦截。
