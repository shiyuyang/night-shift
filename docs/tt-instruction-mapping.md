# TT 后台指令配置

游戏 ID：`7682641099949034247`。JSON、前端和原生通信中均使用字符串，避免 64 位 ID 精度丢失。

用户已确认：由游戏侧定义 instruction，用户负责录入 TT 后台。以下是首批配置，来源为 `game/live-studio-instructions.json`。

| 后台 instruction | 对应效果 | 每份执行效果（当前代码） |
| --- | --- | --- |
| `gift_battery` | 电池补给 | 增加 25 电量，超过 100 的部分进入备用电量 |
| `gift_flash` | 闪光补给 | 闪光道具 +1 |
| `gift_heal` | 急救补给 | 恢复最多 60 生命，绷带 +1 |
| `gift_failure` | 手电故障 | 加入故障队列，按现有条件与冷却依次执行 |
| `gift_warp` | 鬼打墙 | 加入位移队列，按现有落点规则与冷却执行 |
| `gift_shade` | 背后幽影 | 增加 20 秒人影持续时间，多份叠加时长 |

名称展示继续复用已有 `gift.*` 本地化 key。此表是后台配置说明，不新增游戏文案。

## 录入与下发约定

- 后台把具体礼物/互动绑定到表中的 instruction。礼物 ID 与价格由后台配置；这里不要求沿用游戏开发测试中写入的礼物 ID。
- `payload.command` 使用参考文档中的 `TRIGGER_EFFECT`；表中的 instruction 放在 `payload.data.instruction`，不是放进 `command`。
- instruction 按表中小写字符串原样录入。后续若新增效果，追加新指令；不改变已发布指令的含义。
- `count` 必须为正整数。增量/累计语义、连击重发和批量 ACK 仍需用真实平台样本确认；不假定现有 LiveGifts 的 combo 累计计数就是平台的计数规则。
- `interaction_id`、`play_id`、观众 ID 均按字符串传递。`play_id` 不是游戏 ID，也不是游戏内部每局生成的 runId。
- 正式执行 ACK 仍按参考文档在实际效果执行完成后上报；配置定义完成不代表 ACK 或本地通信已经实现。

协议外壳参考：[LIVE Studio 本地游戏接入文档](https://bytedance.larkoffice.com/wiki/JQaDwDOG2i7x19kG1eicpiqKnwL)。

目前仅在本地分支定义了上述配置；未修改 TT 后台，未推送代码，也未生成包含正式通信能力的新安装包。
