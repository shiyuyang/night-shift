# 冷光医院封面

分支：`codex/cold-hospital-cover`。采用深夜冷光走廊、蓝灰登记簿、手写批注、图片印章和局部灯管闪烁。

前七夜依次为废弃病房、门诊大厅、药品仓库、医院中庭、手术区、太平间、地下机房。第一夜保留固定教学；场景几何、难度数值与按夜数计算的敌人规则不调整，药品仓库的固定哭泣者随场景移至第三夜。第八夜起继续原来的七场景轮换和种子随机布局策略。已有存档继续按解锁夜数读取，不重置进度。目录显示夜数和场景名，档案、游戏 HUD 与结算标题使用本地化的“第 X 夜 · 场景名”。

照片批注为“封楼前留影”，按钮为“开始巡查”。手写字使用内置 Ma Shan Zheng 子集，许可证和来源随素材交付；顶部三个文件标签继续使用像素字体。

近处灯管首次进入约 1.8 秒闪烁，此后间隔 8～20 秒；墙面与地面反光一起变暗，登记簿不受影响。后台页面与减少动态效果偏好下暂停闪烁。

每轮灯闪的暗拍中，走廊出现一次长发遮脸、灰白衣裙的日式鬼影，持续 180 毫秒，随后立即消失，对应暗拍同时结束。连续四次灯闪由走廊深处逐步靠近值班窗，之后回到远处循环；每次只出现一个鬼影，沿通道略微错开，避开候诊椅和窗台。以原图 y=370 的视平线估算透视，脚点越靠下，身形越大、明暗细节越清楚。鬼影与灯光共用动画起点，按背景原图裁切比例定位；后台页面与减少动态效果偏好下同时停用。素材为生成的透明 WebP，不含文字。

## 素材交付

从源 PNG 生成 WebP，背景、登记簿、实心印章使用 Q95；空心印章保持无损透明。四张新增图片合计约 1.2 MiB。源 PNG 和未采用的试稿不进入线上交付清单。

鬼影使用独立透明素材 `desk-yurei-v1.webp`，由源 PNG 以 `cwebp -q 90 -resize 320 0` 生成，约 27 KiB。可运行 `node tests/desk-apparition.browser.mjs` 检查两种灯闪节奏、桌面和手机尺寸、减少动态效果与开始游戏；设置 `DEPLOY_URL` 可对线上版本执行相同检查。

鬼影置于灯光衰减层下方，与墙面一起变暗；降低衣裙亮度并染入冷青灰色，轻微软化边缘，衣摆逐渐隐入地面暗部，脚下保留淡接触阴影，避免完整白色轮廓像贴在背景上。

闪现的 180 毫秒内，走廊叠加三条横向错位带与低强度颗粒噪声，切片同时包含背景和鬼影；第 70～90 毫秒将鬼影压至几乎不可见，形成一次短暂断影。干扰结束即隐藏，不持续扫描、不做全屏白闪，登记簿不受影响；减少动态效果时全部停用。

鬼影出现时同步播放现有 `shade-contact` 音效的前 0.55 秒，包含电流爆裂、低频冲击和短促气声，使用淡入淡出与较低增益，随四个落点逐步增强。声音接入总音量，不切换背景音乐；浏览器允许音频且音效包就绪后才播放，不补播错过的闪现。静音、离开封面、后台及减少动态效果会取消待播声音。

实心印章源图仍有浅色底，页面用 SVG 颜色矩阵移除，矩阵保留原有透明度，避免黑边。状态文字保持 HTML 渲染；按钮正常态空心，按下态实心。

通过 `npm run assets:publish` 上传不可变 R2 版本并默认不做远程哈希或可达性校验（仅在用户明确要求时执行），再以 `npm run deploy:cloudflare` 发布当前分支。部署检查覆盖实际闪烁透明度变化、开始巡查、媒体解码和Chrome Opus 音频（不再保留 MP3 回退）。

登记簿标题下增加值班日期和星期的本地预览，以 1998-10-14 为第一夜，按所选夜数逐日递增。日期使用当前语言的数字日期格式，星期采用本地化短名；HUD 和结算仍只显示夜数与场景。该起始日为待确认的故事日期。


第一夜终局关门等待回归：入口选择允许规划经过可破坏的房门，但候选出生点仍以真实障碍和可见性筛选；实际移动保留关门碰撞，由现有撞门流程破门。修复关门时所有追击入口被排除、倒计时结束仍无怪物来袭的问题。`npm run test:browser:ward-finale` 检查完整倒计时、门外接近、破门和入室接触，教学暂停在受控场景中显式关闭。

听声者近距脚步修复：普通行走的落脚声每约 0.45 秒提供一次线索，半径 200；疾跑及开箱等大声动作仍使用 260 半径。收到声音立即清除旧拦截点并重算路线。近处静止和远处轻走不产生新线索，普通脚步不激怒哭泣病人，其他怪物的听觉规则保持不变。`npm run test:browser:listener` 使用真实方向键验证从旧箱子位置转向近处脚步、静止与远距轻走不更新目标。

压力调校：破门连续撞击时长由 5 秒缩为 2 秒；听声者最低追赶速度为 103，高于步行 83、低于疾跑 125。普通脚步听觉半径扩至 200，疾跑仍为 260。真实按键连续步行 4 秒的回归要求怪物至少追回 45 距离单位。


### Patrol density

Current patrol density: every night uses one ordinary patrol during search. When the alarm starts, one additional interceptor enters from the exit side (within 224 world pixels of the exit and at least 180 from the player). Any existing crying patient remains independent. The exit interceptor holds its entry for six simulation seconds before advancing, and reacts immediately if a visible player comes within 260 world pixels; pause freezes this guard period. The ordinary patrol can roam across the map after losing its clue; the interceptor advances to a forward checkpoint on the return route, refreshed every 1.2 seconds. Hiding and decoys suspend player-clue refresh. The interceptor uses speed 115 (player walk 83, sprint 125). Doors, flash, decoys and shared contact invulnerability still apply. The density browser test checks zero extra patrols before the alarm and exactly one afterwards across all seven maps, plus the garden closed-door regression.

### Opening search placement

- Night 1 retains the authored tutorial route. Later seeded nights choose key/first-box pairs from functional room pools, with both occluded from spawn, at least 300 world pixels apart, and no direct ray between them through the architecture/furniture.
- Added search points beside existing furnishings in registration, gatehouse, scrub and morgue rooms. Random fallback retains the same opening-search constraints and validates collisions, reachability and fixed-patient clearance.
- `tests/random-level.test.mjs` checks the opening constraints across its 1,400 seeded layouts and forced fallback. `node tests/opening-search.browser.mjs` checks real keyboard traversal and pickup in nights 1, 2 and 6, with sanctuary assistance to isolate placement from combat.

### Final-box blink and Listener immunity

The final fuse may trigger one blink for the primary pursuer only when its physical approach exceeds six seconds. A 0.8-second signal/opacity warning precedes relocation to a reachable side/rear approach, approximately 2.5–4.5 walking seconds away. Landing excludes the player's final room, the exit area and visible positions; visibility, clearance and reachability are checked again on arrival. Stun, recent successful flash knockback, hiding and distraction prevent or cancel the blink. Exit interceptors keep their existing guard behavior.

The Listener is immune to flash stun and knockback. The first-night tutorial skips the flash exercise and introduces the decoy instead. Other enemies retain their current flash response. All 29 catalogs include the exception in the Listener lesson, gameplay help and relevant command descriptions; translations remain drafts. Tests: `tests/box-blink.test.mjs`, `tests/box-blink.browser.mjs`, `tests/listener-localization.browser.mjs` and the updated tutorial browser flow.

### Implemented monster item roles

Listener remains sound-driven and immune to flash. Light-Shy prioritizes a visible player over all decoy/distraction sources; breaking sight makes sound diversion possible again. Its existing flashlight recoil and recovery protection remain, and flash stun is now four seconds. Patrollers (including the exit interceptor) receive two seconds of flash stun. They investigate a sound only within 180 world pixels, move at most 120 from their original position, and spend at most two seconds investigating before returning. The same continuing sound cannot restart the investigation; a six-second recovery also prevents rapid replacement sounds from chaining diversions. The item still makes sound for eight seconds, which the Listener can continue following. Tutorial and threat hints cover these distinctions in all required catalogs, with locale-formatted stun durations and draft translation status.
