# 记事簿主菜单

使用原有 watch-desk-v1 医院监控室背景，UI 位于画面左侧；新记录簿由无字像素贴图和程序文字组成。开始夜班按钮完整置于纸页内，中英文共用布局；窄屏使用单页排版。

图片通过内置 imagegen 生成。原件 public/assets/patrol-book-pixel-v1.png；无损压缩版 public/assets/patrol-book-pixel-v1.webp。未采用的手绘背景 watch-desk-painted-v2 保留，但不在运行时加载。

## 记录簿生成提示

A single blank open hospital night-duty logbook sprite, transparent background, isolated game UI asset, straight overhead orthographic view, perfectly horizontal, landscape aspect ratio 3:2. Genuine carefully authored retro pixel art with crisp block clusters, limited 12-color desaturated olive parchment palette, no smooth shading, no antialiasing, no realistic grain. Both pages form broad flat empty rectangular writing areas. Dark worn olive cloth cover visible as narrow stepped pixel border around pages, subtle chipped corners, layered paper edges at bottom, thin dark central spine exactly at horizontal center. Very restrained stains only on outermost margins, central 85 percent of each page remains uniformly muted gray-olive parchment without lines or marks. Page brightness medium, aged dirty military hospital notebook, not fresh cream stationery. Pixel dither ONLY near binding and outside page edges, no noisy texture in writing areas. No letters, words, numbers, writing, ruled lines, grid lines, symbols, stamps, bookmarks, buttons, pen or other objects. Fill canvas almost completely with the book, generous page areas, actual alpha outside stepped silhouette. Designed as a readable blank UI background with live multilingual text overlaid later.

## 多语言范围

未采用的手绘背景同样由内置 imagegen 生成，提示留档：

Create a finished background illustration for an indie hospital horror game's title menu, landscape 16:9. A midnight nurse station desk seen from a near top-down seated-player angle, restrained hand-painted gouache and ink with limited dirty olive, bone, charcoal and muted rust palette, visibly drawn shapes and dry brush texture, NOT photorealistic, no 3D render, no UI. Center and lower center 70 percent of image is a dark worn wooden desktop left EMPTY for a large interactive open journal to be overlaid in code. Frame the empty space with an old green-shaded desk lamp in upper left casting subdued amber light, a black rotary telephone with receiver askew upper right, medicine bottle and folded gauze at far right, tarnished keys and a dark red pencil near lower corners. Upper background a narrow strip of deserted hospital corridor with a faint cold blue doorway and distant ambiguous shadow. Intimate, ominous, carefully composed illustrated adventure game art, legible silhouettes and rich tactile detail without excessive visual noise. No open book in the image, no paper in the central empty area, no letters, words, numbers, symbols, logos or watermarks anywhere. No neon glow, no large blood splashes. The center desktop is illuminated enough for a paper book overlay; darkest values reserved for outer edges. Full bleed landscape.

game/locales/zh-CN.json 和 en.json 覆盖主菜单、选关、设置、操作说明及新的出口镜头教学。src/i18n.ts 提供类型检查、参数插值与语言记忆。默认简体中文，玩家通过记录簿语言书签选择 English；不清除存档。

游戏内其他 HUD、结算和环境文字尚未全部迁移，不宣称整款游戏已完成英文版。新增文案应使用稳定键，图片中不加入语言相关内容。

## 出口教学

第一关且 exit 教学未完成时，集齐保险丝触发：冻结模拟 → 850ms 镜头移向绿光出口 → 显示说明并等待确认 → 700ms 镜头返回玩家 → 恢复跟随和模拟。倒计时、怪物、生命与电量在教学中保持不变。确认后记录已学习；跳过教学恢复镜头，后续关卡不触发。

教学提示为无背景像素文字，无窗口底板和边框；教学时全屏暗化 42%，确认后恢复。重复的搜寻／目标信息框在教学期间隐藏。桌面菜单左边距 4vw，开始按钮完全置于纸页安全区。
