# 多语言本地化

开发基线：main f01a9df；分支 codex/localization-core。核心及资源与封面分支共用，视觉适配放在独立 localization.css。此次不部署，不迁移封面图片或 R2 release manifest。

## 语言范围与回退

P0：en id es ar vi fr th pt tr ru ja de。
P1：it ro ms zh-Hant ko uk az pl nl el bg my hu he hr sv，以及 zh（匹配繁体）。
额外支持：zh-Hans。共 29 个独立语言资源包。

解析先判断中文脚本，再判断地区。zh-Hans / zh-CN / zh-SG → 简体；zh-Hant / zh-TW / zh-HK / zh-MO / zh → 繁体。简体资源缺失时依次繁体、英文；其余已支持语言缺失时英文。pt-BR、es-419 等先使用对应基础语言。未来需要地区用词差异时增加覆盖，不把同一语言误判为不支持。

## 文案协议

`t(key, values)` 返回纯文本，适用于 textContent 和 Canvas。HTML 插入使用 `htmlMessage`，禁止直接把变量插入 innerHTML。变量使用 seconds、count、area 等语义名称；数字和日期使用 ICU number/date，计数使用 plural；必须保留完整句子，不能在代码里拼接语序。物品列表用 formatList 处理语言各自的分隔习惯。

新增功能必须提交源文案、所有目标语言译文及字体变更。原文改变需更新翻译；CI 对键与占位符进行校验。自动翻译初稿不能标为母语审校。游戏标题 DNT 与其他例外集中记录；氛围文字不是自动豁免。

## 长文案与排版决策

W3C 指出短字符串翻译后可能成倍增长，因此不能只预留固定百分比，也不能普遍缩小字体。标签允许两行；内容页内部滚动；固定构图不因文案高度改变；正文允许自然断行。关键动作、规则和目标不使用省略号。长教程采用可滚动对话框，操作按钮保持可达。

阿拉伯语、希伯来语设置 HTML dir=rtl。文字区域按阅读方向排列，场景、地图、游戏控制及登记簿背景不镜像。动态外来名称需要 bidi isolation。泰语、缅甸语关闭字距、假粗体和强制大写，保留组合标记及 shaping。

测试代表：德国长词、越南语变音、日文、繁体、阿拉伯语、希伯来语、泰语、缅甸语；另外用扩展伪本地化检查最坏布局。验证桌面、窄屏、宽屏下的固定 16:9 舞台及文本溢出。

## 字体

采用按文字系统配置的本地 Noto 字体。字体生成脚本保留 OpenType 布局表，输出 WOFF2 子集及覆盖报告；语言选择器的原生语言名称也纳入字库。字体不依赖玩家安装系统字体。手写中文保留既有字体；其他语种在专用手写字体确认前使用协调的正文字体。

## 两个分支的集成

核心、翻译资源、校验合入 main 后，封面分支 rebase main。保留各自 watch-desk.css、背景、登记簿素材和部署清单。冲突优先按共同 key 接口处理。临时集成工作区用于验证冷光封面，不直接改写或发布原分支。

## 调研来源

- https://www.w3.org/International/articles/article-text-size
- https://www.w3.org/International/articles/inline-bidi-markup/Overview.en.php
- https://unicode-org.github.io/icu/userguide/format_parse/messages/
- https://formatjs.github.io/docs/intl-messageformat/
- https://huggingface.co/mlx-community/Qwen3.5-9B-4bit （本地机器翻译初稿模型；非母语审校）

## 日常开发步骤

1. 在 en.json 与 zh-CN.json 定义完整句子和语义 key；变量命名表达含义，例如 `{seconds, number}`，不要用 value1。
2. 页面使用 `t(key, values)`；需要拼入 HTML 的位置使用同样具有参数类型检查的 `htmlMessage`。玩家昵称通过 `isolate` 隔离双向文本。
3. 更新所有目标语言。编辑覆盖项对应的英文原文保存在 localization-override-sources.json；原文变化时必须重新确认覆盖译文，未确认会阻止资源整理。`game/localization-overrides` 记录明确的编辑修订，`translate-local.py` 只生成可续跑的本地机器翻译草稿。
4. 执行 `node scripts/i18n/finalize.mjs` 整理资源，再运行 `npm run i18n:types`、`npm run i18n:fonts` 和 `npm run i18n:check`。字体文件带内容哈希，避免浏览器继续使用旧子集。
5. 运行 `npm run test:i18n`、`npm run test:browser:i18n` 及相关玩法测试。`node scripts/i18n/audit-translations.mjs` 输出数字、未译英文和意外汉字的审查线索；它不能代替语义审校。

目前译文元数据明确记录为 draft、nativeReviewed=false。机器生成、编辑修订和母语审校是不同状态；结构校验通过也不代表译文已经通过母语审校。

## 本次验证（2026-09-08）

- 29 个语言包，每包 313 条；key、ICU 参数、活动源码文字与跨文字系统混入检查通过。
- 本地字体覆盖全部译文字符；共用符号通过既有像素字体回退。WOFF2 子集保留字形组合表。
- 主界面 29 种语言均验证菜单、进入游戏、扩展文本及 16:9 比例；构建后的中英文验证语言记忆、章节锁定、须知/设置及四种窗口尺寸。
- 冷光封面临时集成验证 en、zh-Hans、zh-Hant、ja、de、ar、he、th、my、vi；设置层级修复后追加 en、ja、ar 的须知和设置点击检查。
- 本地生产构建及静态资源检查通过；Opus 音频可播放。未执行远端部署。
- 译文仍是机器草稿加编辑修订，未经过母语审校，尤其低资源语言不应将资源齐全等同于发行文案定稿。
