# 游戏站点与互动服务

2026-09-07 已部署。Cloudflare Worker：`interactive-games`；版本 `4615d311-3e51-4d6e-81b4-2f49dd6957b1`。

## URL 约定

| 用途 | 地址 | 状态 |
|---|---|---|
| 站点根路径 | `https://games.liveinteractivegame.com/` | 不公开目录，返回 404 |
| Night Shift | `https://games.liveinteractivegame.com/night-shift/` | 已上线 |
| 未来游戏 | `https://games.liveinteractivegame.com/<game-slug>/` | 路径约定 |
| 互动 HTTP 接口 | `https://api.liveinteractivegame.com/v1/games/<game-slug>/sessions/...` | 预留设计，尚未实现 |
| 素材 | `https://night-shift-assets.liveinteractivegame.com/games/night-shift/<version>/...` | 现有 R2，继续使用 |

游戏标识采用稳定的小写英文和连字符；页面地址不含版本，版本放在静态文件哈希或素材前缀。R2 目前保留已发布域名；以后若建立共享素材域名，可统一为 `assets.liveinteractivegame.com/games/<game-slug>/<version>/...`，此次未创建它。

生产互动连接由 `VITE_EVENTS_URL` 显式配置；未配置时不会建立 SSE 连接。未来实现需补充服务端鉴权、会话隔离和 CORS；以上 API 路径只是约定，不表示端点已上线。

## 托管边界

`wrangler.jsonc` 为游戏域名配置 Custom Domain。旧入口使用 `api.liveinteractivegame.com/games/night-shift*` 路由，以覆盖无尾斜杠且带查询参数的 URL。Worker 内严格判断游戏路径边界；类似 `night-shift-2` 的无关后缀仍转发原服务，避免吞掉其他路径。

新站静态资源由 Cloudflare Static Assets 直接提供；Worker 对实际 Night Shift 旧路径直接跳转，对新站缺失文件返回 404；这两类请求均不访问 Linode。HTML/JS/CSS 已按构建清单进行字节校验，R2 编码与素材版本不变。不发布游戏目录首页。旧域名进度不迁移。

当前只发布各游戏的独立路径，不提供公开目录页。增加游戏时须将其构建结果加入独立目录，不得覆盖其他游戏目录。游戏数量增加或需要独立发布时，可将每个 `/<game-slug>/*` 路由拆到各自的 Worker，保持浏览器地址不变。

## 发布与回滚

- 日常：`npm run deploy:cloudflare`。
- 素材修改：先 `npm run assets:publish`，再发布页面。
- 配置类型：`npx wrangler types deploy/worker-configuration.d.ts --include-runtime=false`。
- Cloudflare 后续版本可在确认目标版本后通过 Wrangler rollback 回滚；第一次迁移之前没有 Worker 版本可回滚。
- 紧急恢复旧站：只移除旧 API 游戏路径的 Worker 路由，旧 Linode 发布目录仍在。新 games 域名不能靠移除路由恢复到 Linode，需单独恢复已知可用的 Cloudflare 版本。
- Linode 的 Caddy 配置与发布目录本次未修改。

## 验证

构建、TypeScript 检查、Wrangler dry-run、本地游戏启动通过。线上 Chrome 在主动阻断 API 域名与 Linode IP 的条件下，正常音频与强制 MP3 回退均通过：游戏启动、16 张图片解码、9 首音乐和 1 个音效包就绪，原始素材路径返回 404。线上四份游戏代码文件的 SHA-256 与构建清单一致，并包含 Cloudflare 静态托管标识。根路径及 `/index.html` 的 404、游戏直达链接与旧链接重定向另行做 HTTP 检查。没有关闭 Linode 来进行故障演练，未验证所有移动浏览器。

参考：[Static Assets](https://developers.cloudflare.com/workers/static-assets/)、[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)、[静态资源计费](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)。静态资源请求免费且不限量；旧入口重定向执行 Worker 代码，受 Worker 套餐用量约束；R2 仍按自身规则计费。
