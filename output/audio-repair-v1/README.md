# 追逐与新地图音频素材

2026-09-09 已通过 ElevenLabs 生成 21 个音效和 2 首音乐，已接入本地游戏的音频目录和运行时；尚未发布 R2 或部署。

打开 `index.html` 逐个试听；页面同时只播放一个声音，单独试听不是最终游戏混音。`sources/` 保存 API 原始 MP3 及来源记录；根目录 MP3 做了响度、峰值与起止淡化处理，Opus 为交付候选（音效 40 kbps，音乐 64 kbps）。原始生成提示、类别和用途 ID 在 `manifest.json`；时长、编码、响度与真峰值在 `verification.json`，`auditioned:false` 表示未完成真人听感审查。

23 个 Opus 文件合计约 921 KiB。时长符合请求，均可解码、非静音且测得真峰值低于 0 dBTP。已完成浏览器全部 49 个音乐/音效的 Opus 解码检查。真人试听仍需检查 BGM 与尖叫的自动压低、音源距离衰减、连续撞门重叠以及循环接缝。供电曲为 30 秒，血月曲为 48 秒。

重跑 `python3 scripts/generate-repair-audio.py` 会跳过已有原始生成文件，避免重复生成费用；密钥只从环境或 .env 读取，不写入来源记录。

生成接口依据 ElevenLabs 官方 [Sound Effects](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert) 与 [Music](https://elevenlabs.io/docs/api-reference/music/compose/) 文档；使用 eleven_text_to_sound_v2 与 music_v1，BGM 强制纯器乐，所有环境音无可辨认语言。

完整玩法接入顺序见 `docs/pursuit-repair-plan.md`。

最终复检覆盖全部 23 个文件；货架音效增加 3 dB 峰值余量后重新编码，全部交付 Opus 的真峰值低于 0 dBTP。试听页现含全部 23 项。
