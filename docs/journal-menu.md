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

## 生命与手电教学

第一关完成移动后，依次暂停说明白色生命条与右上角独立手电电量。生命说明确认后完成；手电必须实际关闭再打开才记为学会，支持 T 和点击混用。沿用无背景像素提示、全屏轻度暗化和目标角标。新增提示具备中英文文案，旧存档会补学尚未记录的新条目。

## 日恐主界面风格验证（2026-09-07）

主标统一为 DNT「夜勤病棟」，采用 `public/assets/yakin-byoutou-title-v4.png`，生成提示见 `output/branding/yakin-byoutou-v4/README.md`。源图为黑底 RGB，界面使用 CSS 亮度蒙版排除黑底，不是透明 PNG。副标题为本地化 DOM 文本，不嵌入图片。当前医院设定名为虚构机构「青葉市 松原総合病院」，菜单中文“青叶市 · 松原综合病院”，英文“AOBA CITY · MATSUBARA GENERAL HOSPITAL”；名称用于风格验证，不表示已完成同名检索。

主界面保留中英双语，页签和图像替代文字始终为「夜勤病棟」。英文选项标为 English (menu)。进入游戏后，HUD、教学、暂停菜单与操作说明统一中文；返回标题恢复已保存的菜单语言，不更改解锁存档。

文案以多出一位病人、停用三楼的呼叫和巡查簿形成气氛；功能提示继续明确说明实际机制。尚未实施六关剧情、全场景日式美术或日语版本。

本轮验证：构建、77 项现有测试；浏览器检查中英文菜单、无黑框标题、英文菜单进入中文 HUD/教学/暂停菜单，以及返回后恢复英文。未执行完整逐关通关测试。

当前副标题：今晚的病人，比名册上多一位。底部提示：三楼已停用。请勿回应该楼层的呼叫。主标通过 assetUrl 使用生产 R2 路径，开发环境使用本地素材。
