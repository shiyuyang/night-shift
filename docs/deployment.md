# 夜班档案部署

当前入口：https://games.liveinteractivegame.com/night-shift/

游戏目录：https://games.liveinteractivegame.com/

## 当前部署：Cloudflare

HTML、JS、CSS 托管在 Workers Static Assets；图片、音频、字体仍由 R2 提供。Night Shift 页面和旧路径重定向均不回源 Linode。旧 `api.liveinteractivegame.com/games/night-shift` 地址及其子路径在边缘执行 308 跳转，保留路径后缀及查询参数。新域名不迁移旧域名的本地游戏进度。

```sh
npm run deploy:cloudflare
```

该命令校验 R2 素材版本，构建静态页面，执行 Wrangler dry-run、本地正常音频和 MP3 回退检查，再部署并检查线上。测试禁止游戏访问旧 API 域名和 Linode IP。构建输出 `dist-cloudflare/` 只包含目录首页、游戏 HTML、两份 JS、CSS 及响应头配置。媒体不重复上传。

域名与未来游戏路径约定见 [Cloudflare 托管设计](cloudflare-hosting.md)。

以下为保留的 Linode 部署与回滚说明；日常发布使用上面的 Cloudflare 命令。仅重新发布 Linode 不会改变已启用的 Cloudflare 路由。

## 服务器与隔离

- SSH 别名 `linodeu`；Caddy 负责反向代理和 HTTPS。
- 每个游戏独立前缀 `/games/<slug>/`；本游戏只匹配 `/games/night-shift` 和 `/games/night-shift/*`。
- 静态文件 `/srv/games/night-shift/releases/<UTC时间>/`，`current` 软链接指向当前版本。
- Caddy 站点内部导入 `/etc/caddy/games/*.caddy`，本游戏片段见 `deploy/night-shift.caddy`。
- 原有 `/body-copilot`、`/ttmg-auth`、`/privacy` 和默认 relay 路由保留。
- 部署时发现 Nginx 默认站点占用 80，导致原有 Caddy 启动失败和域名 521。按用户明确要求停止并禁用 Nginx，恢复 Caddy；没有启动第二套代理。

## 发布

```sh
npm run build:deploy
npm run test:browser:deployment
npm run deploy:linode
DEPLOY_URL=https://api.liveinteractivegame.com/games/night-shift/ npm run test:browser:deployment
```

`npm run assets:compress` 从原素材生成交付文件（需 cwebp 和 ffmpeg）；8 张背景用 WebP Q95，角色及笔记本纹理保持无损。压缩产物入库，日常构建无需编码器。

构建按 `game/assets/delivery.json` 与当前音乐/音效目录裁剪 `dist/`，排除原 PNG、旧音频、生成记录和旧背景版本；保留 MP3 兼容回退与字体许可证。`delivery-report.json` 记录交付文件大小和 SHA-256，部署前在服务器校验。

部署脚本先通过本地浏览器检查，再只上传 `dist/`，不会上传 `.env`、Git 历史、源代码或服务端凭据。`release.json` 同时记录源提交、工作区是否含未提交修改、交付清单哈希。每次创建新版本目录，校验 Caddy 后原子切换软链接、平滑重载；失败恢复路由及旧版本链接。旧版本不自动删除，避免误删其他业务。

入口 HTML 使用 no-cache；哈希 JS/CSS 一年 immutable；其他资源一小时缓存。缺失文件返回 404，不把 HTML 当音频或图片返回。不设置禁止 iframe 的响应头，以兼容直播 WebView。

手动回滚：将 `/srv/games/night-shift/current` 原子切换到已验证的旧 release；若涉及路由则使用脚本打印的 `/etc/caddy/Caddyfile.bak-night-shift-*` 备份，并先执行 `caddy validate` 再重载。不要直接覆盖其他游戏的片段。

## R2 发布

静态素材使用 R2 Standard 桶 `night-shift-assets`，专用域名 `night-shift-assets.liveinteractivegame.com`。账号与域名配置在 `deploy/r2.json`，已验证的素材版本在 `deploy/r2-release.json`。不使用 r2.dev 或 Worker 代理。

```sh
npm run assets:publish
npm run deploy:linode
DEPLOY_URL=https://api.liveinteractivegame.com/games/night-shift/ npm run test:browser:deployment
```

`assets:publish` 先构建、合包与裁剪，再将发布清单上传到 `games/night-shift/<素材清单SHA256前16位>/`；通过公开域名逐文件核验 SHA-256、缓存头与 CORS 后才写入已验证版本。部署脚本检查当前素材仍与该版本完全一致，然后同时设置运行时图片/音频和 CSS 背景/字体的 CDN 地址。素材发生变化而没有重新上传时，部署会失败。

所有素材采用一年 `public, immutable` 缓存；图片、字体、`.ogg` 音乐和 `.bin` 音效包均为 Cloudflare 默认可缓存扩展名，已验证 MISS 后 HIT。CORS 允许公开素材的匿名 GET/HEAD（包含本地预览和嵌入场景），没有浏览器写权限。HTML、JS、CSS 仍由 Linode 交付；Linode 保留相同素材用于回滚及性能对照。

18 个音效按原始文件字节合并为一个 Opus 包和一个 MP3 回退包，偏移索引编入 JS，无需额外请求 manifest。加载时校验完整包长度与 SHA-256，再逐音效解码；损坏、请求失败或解码不支持时尝试 MP3 包。音乐 Opus 只复制为 `.ogg` 文件名，没有重新编码。`npm run assets:pack` 可重建，dev/build/test 都会先执行。

如需完整回到 Linode 素材交付，可使用 `USE_R2=0 npm run deploy:linode`；已有 release 仍可按上文切换软链接回滚。修改源码后应重新构建和检查，不直接改动已上传的版本前缀。

## 直播指令边界

当前上线为可玩的静态游戏。Vite 的 `/api/events` 和 `/api/webhook` 仅用于本地开发，未作为生产服务暴露；生产构建默认不连接开发 SSE。

后续 TT 协议确定后需要部署带身份认证、直播间隔离、幂等与限速的服务，再配置 `VITE_EVENTS_URL`。不能把开发环境的全局广播直接暴露给多名主播。暂停菜单、玩法、音频不依赖该服务。
