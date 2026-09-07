# R2 接入与请求合并实测

> 后续更新：页面与代码已迁至 Cloudflare，当前入口为 https://games.liveinteractivegame.com/night-shift/ 。下文性能表是迁移前的 R2 对照实验，不能当作新托管方案的测速结果；当前设计见 [Cloudflare 托管](cloudflare-hosting.md)。
2026-09-07 已上线 release `20260907T033644Z`，入口 https://api.liveinteractivegame.com/games/night-shift/ 。素材版本 `c1405de20e423902`，域名 `night-shift-assets.liveinteractivegame.com`，R2 Standard 桶 `night-shift-assets`。源码仍含未提交修改，线上 release 如实记录 dirty 状态与交付清单哈希。

## 发布结果

- R2 共 39 个对象、19,233,921 B（18.34 MiB），包含交付图片、音乐、音效包、字体和许可证。每个对象均通过公开域名 GET、SHA-256、CORS 和 immutable 缓存头检查。
- 运行时图片和音频、CSS 背景与字体全部使用 R2 的不可变版本前缀。HTML、两份 JS 和 CSS 继续由 Linode 提供。
- Linode 当前 release 共 45 个文件，保留相同交付素材用于回滚/对照。原始 PNG、生成记录与未引用音频不参与部署。
- 默认使用 9 个 Opus 音乐文件（.ogg 扩展名）和 1 个音效包。18 个小音效在包中仍是原来的完整编码字节，没有拼接 PCM、重新编码或丢弃尾音；索引随 JS 发布，不额外请求 JSON。
- 音效包包含长度与 SHA-256 校验；请求失败、损坏或 Opus 不支持时使用 MP3 回退包。音乐也保留 MP3 回退。.ogg 音乐与源 .opus 逐字节一致。

## 文件请求数量

| 首次打开并启用声音 | 原版 | 当前 |
|---|---:|---:|
| 游戏图片 | 10 | 10 |
| 音乐 | 9 | 9 |
| 音效 | 18 | 1 |
| 字体 | 1 | 1 |
| HTML / JS / CSS | 4 | 4 |
| 游戏合计 | 42 | 25 |

项目请求减少 17 次（40.5%）。媒体部分从 37 次降到 20 次；加上字体，首次会请求 21 个 R2 对象。另有 Google Fonts 样式和 Cloudflare 统计请求，不计入游戏文件数。切换其他场景图、失败重试和 MP3 回退可能增加请求；重复访问的浏览器缓存可能减少请求。

音频字节未改变，减少请求是这次合包的主要收益。保留音乐按曲分开的结构，为以后按关卡加载保留空间。

## 性能测试

对比三组：原压缩版本、合包后 Linode、合包后 R2。前两组由已保留 release 复制到独立临时路径，改写资源前缀；游戏素材字节保持一致，正式入口没有切回旧版本。测试结束删除临时目录。

每组先预热一次，再使用新的 Chrome browser context 测 5 次，1440×900。浏览器缓存为冷状态，不清空 Cloudflare 全球缓存。为控制第三方资源干扰，在这组测试中将 Google Fonts CSS 和 Cloudflare 统计脚本替换为空响应；游戏 HTML、JS、CSS、字体、图片和音频均真实下载。

菜单就绪：导航开始到 `#start:enabled` 可见且场景缩略图加载完成。声音就绪：点击开始到 `#music-status` 显示已就绪。总时间：导航开始到游戏运行且声音就绪。测量等待 DOMContentLoaded 后检查游戏状态，不等待整个页面 load。跨域资源缓存状态和字节数通过 Chrome DevTools Protocol 获取。

| 5 次中位数 | 原版 Linode | 合包后 Linode | 合包后 R2 |
|---|---:|---:|---:|
| 菜单就绪 | 3.31 s | 3.53 s | 2.52 s |
| 点击开始后声音就绪 | 1.01 s | 0.59 s | 0.46 s |
| 导航到游戏和声音就绪 | 4.60 s | 4.27 s | 3.02 s |
| 总时间范围 | 2.59–5.58 s | 3.46–4.73 s | 2.80–4.06 s |

本组 R2 总时间中位数比原版低约 34%，比合包后的 Linode 低约 29%。这不是对全球用户的时延承诺，也不能把全部差异归因于 R2：样本只有 5 次/组，按组顺序采集，网络与 POP 会变化。观察到的 POP 包括 AMS、SJC、HKG。不同地区、移动网络和冷边缘缓存尚未测量。

早期未隔离第三方请求的实验出现过 load/navigation/启动等待超时和较大波动，原因未完整定位；这些不完整/不同计时口径的实验没有混入上述统计。因此上述表是游戏资源链路的对照数据，不是整站含全部第三方依赖的可用性或启动 SLA。

## 缓存与计费

默认可缓存的 .webp、.woff2、.ogg、.bin 使用 `Cache-Control: public, max-age=31536000, immutable`。已单独验证音乐、音效包、图片从 MISS 到 HIT。三组正式计时中：

- 原版：55 次图片/字体 HIT，135 次 Opus DYNAMIC。
- 合包后 Linode：105/105 次素材/字体请求为 HIT。
- 合包后 R2：105/105 次素材/字体请求为 HIT。

浏览器请求数不等于 R2 读取数，CDN 命中不再读取 R2 对象。按最保守的每次启动 21 个对象都回源、每月 100 万次新访问且无失败/回退估算，读取为 2,100 万次；若账号每月 1,000 万次免费 Class B 额度尚未使用，超额读取费用约 $3.96/月。实际使用缓存会降低回源量，但命中率需要线上流量统计，不能从本次预热后的 105 次 HIT 推算长期账单。

R2 还计存储与 Class A 操作；这里没有引入 Worker 代理或额外 Worker 请求费用。价格依据 [R2 官方价格](https://developers.cloudflare.com/r2/pricing/)；缓存行为依据 [默认缓存扩展名](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/) 和 [R2 自定义域名缓存](https://developers.cloudflare.com/r2/buckets/public-buckets/)。

## 验证与复现

75 项单元/回归测试通过，随后针对音频的 12 项测试复核通过。浏览器验证覆盖全部 16 张图片解码、9 首音乐和音效包、强制 Opus 失败时的完整 MP3 回退、正确 CDN 来源及原始文件 404。部署后线上验证正常游戏启动和 R2 加载，服务器 release/交付清单/全部文件 SHA-256 与本地产物一致。

命令：`ISOLATE_GAME=1 WARMUP=1 RUNS=5 OUTPUT=/tmp/r2-benchmark.json node scripts/benchmark-assets.mjs`。DEPLOY_URL 可指定对照页面。当前测速只读取网站，不会部署或改变缓存规则。

完整计时样本、预热样本、响应缓存状态及 POP 保存在 [r2-performance-results.json](./r2-performance-results.json)。发布及回滚操作见 [deployment.md](./deployment.md)。
