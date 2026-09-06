# 资源传输与配乐

运行 `python scripts/compress-assets.py` 生成衍生文件。PNG 和 MP3 原文件保留，浏览器加载压缩版本，不重复加载兼容副本。统计见 game/assets/compression-report.json，数值是选定资源的文件总量，不等于单次首次加载流量。

- 14 张图：PNG 23,156,754 字节 → 无损 WebP 16,418,688 字节，减少 29.1%。保留尺寸、透明通道和可见像素，不降低像素精灵分辨率。
- 27 段音频：MP3 5,892,291 字节 → Opus 3,108,617 字节，减少 47.2%。音乐立体声 VBR 64 kbps，音效 VBR 40 kbps；有损音频保留原版，不宣称无损。WebAudio 首选 Opus，下载或解码失败逐文件重试原 MP3。
- 新素材均使用版本化名称；重复执行仅转换源文件有变更的资源。

格式依据：[Google WebP FAQ](https://developers.google.com/speed/webp/faq)、[MDN 音频编码指南](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Audio_codecs)。尚未在 TikTok 实际开播工具的 WebView 中验证，浏览器有 MP3 解码回退。

## 场景主题配乐

按用户试听反馈恢复上一版配乐：病房 ward-exploration-v3／ward-alt-theme-v1，仓库 warehouse-theme-v1／warehouse-alt-theme-v1，机房 plant-theme-v1／plant-alt-theme-v1，菜单 menu-theme-v1。追逐和通电音乐保持不变。

新生成的七首文件保留作备份，当前 game/music.json 不引用、不加载。恢复各旧曲实测响度与混音补偿，保留轮换、从开头切入和患者声音优先机制。

曲长维持 40／48 秒。主菜单不随选关按钮切歌；每个场景首次随机、下次开局避开上次开局曲，localStorage 记忆选择。第一枚保险丝切到本场景另一首，后续不反复切；暂停不重新抽取。结算使用菜单主题。

只有当前需要的音乐层才调度音源；新选曲从开头交叉淡入，避免未选曲静音播放导致错过开头。暂停菜单显示当前曲目，便于核实选曲。追逐层由实际危险压力驱动，探索主题在追逐中仍保留；通电高潮保持精确 8 秒，暂停恢复按游戏时间定位。

## 混音与患者声音优先级

每首生成后用 FFmpeg 重新测量响度，game/music.json 的 measuredLufs 与 mixGain 对齐 -21.5 LUFS 混音参考。探索层 0.98、追逐层最高 0.52、通电层 0.9；参考值不是用户设备最终响度。

患者哭声、起身、扑击和闪光压制声音直接进入音效通道；所有音乐走独立 BGM 通道，患者声音期间降到 20%（约 -14 dB），35 ms 时间常数避让，最后一段结束后以 1.1 秒时间常数恢复。多个患者声音重叠不会提前恢复，普通脚步不触发避让。

扑击尖叫更新为 ElevenLabs patient-lunge-v2，约 1.8 秒，增益 0.95。扑击开始先停止起身声音再播放尖叫，BGM 以 10 ms 时间常数降至 20%，其他患者音效保持 35 ms。保留 MP3 原件和 Opus 网络版本，闪光／撞墙等终止事件仍可打断尖叫。生成提示与来源见音效目录和同名 JSON。
