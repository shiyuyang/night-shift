# 夜班档案部署

入口：https://api.liveinteractivegame.com/games/night-shift/

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

部署脚本只上传 `dist/`，不会上传 `.env`、Git 历史、源代码或服务端凭据。每次创建新版本目录，校验 Caddy 后原子切换软链接、平滑重载；失败恢复路由及旧版本链接。旧版本不自动删除，避免误删其他业务。

入口 HTML 使用 no-cache；哈希 JS/CSS 一年 immutable；其他资源一小时缓存。缺失文件返回 404，不把 HTML 当音频或图片返回。不设置禁止 iframe 的响应头，以兼容直播 WebView。

手动回滚：将 `/srv/games/night-shift/current` 原子切换到已验证的旧 release；若涉及路由则使用脚本打印的 `/etc/caddy/Caddyfile.bak-night-shift-*` 备份，并先执行 `caddy validate` 再重载。不要直接覆盖其他游戏的片段。

## R2 状态

Cloudflare 已登录，R2 后续已开通。由于没有官方免费额度硬停开关，用户决定暂不接入。当前静态资源由服务器提供，使用现有 WebP／Opus 和 MP3 回退；并未上传 R2。

已预留 `VITE_ASSET_BASE_URL`：未来可将运行时图片、音乐放到独立 CDN 的版本前缀，如 `https://assets.example.com/games/night-shift/<release>/`。R2 需先开通，配置正式自定义域名与允许游戏站点的 GET/HEAD CORS，上传并核验所有资源后再设置此变量。CSS 背景与字体仍由游戏路径提供。不要直接把受限的 r2.dev 地址当正式 CDN。

## 直播指令边界

当前上线为可玩的静态游戏。Vite 的 `/api/events` 和 `/api/webhook` 仅用于本地开发，未作为生产服务暴露；生产构建默认不连接开发 SSE。

后续 TT 协议确定后需要部署带身份认证、直播间隔离、幂等与限速的服务，再配置 `VITE_EVENTS_URL`。不能把开发环境的全局广播直接暴露给多名主播。暂停菜单、玩法、音频不依赖该服务。
