# 哭泣患者素材

图像通过内置 imagegen 工具生成，源文件：`public/assets/weeping-patient-v1.png`。游戏在 `src/weeper-art.ts` 按动作裁切并统一到原生像素画布，保持完整头部、手和脚的锚点。不覆盖原有巡逻者素材。

动作：蜷坐抽泣、抬头起身、侧身扑击、遮脸跪倒。生成提示词：

```
Use case: stylized-concept. Production asset: original refined pixel-art hospital horror patient sprite atlas, genuine transparent background, no scenery, no text, no labels, no grid lines, no shadow under feet. Square sheet, exact 4 columns by 4 rows of equal cells, sixteen full-body poses of SAME adult gaunt hospital patient with dull grey-blue striped hospital gown, wrist admission band, bare feet, long dark hair concealing a human face, pale muted skin, no weapons, no gore. 2D top-down RPG three-quarter overhead perspective, crisp deliberate pixel clusters like a carefully hand-drawn 48x64 sprite, flat limited muted palette, no smooth gradients or realistic rendering, no glow. All sixteen cells must have ample transparent padding, body entirely inside its cell, foot anchor consistently horizontally centered and near bottom of each cell. Row 1: four distinct seated weeping poses, curled knees with head bowed, subtle rocking, same body scale as standing poses. Row 2: four progressive rising alarm poses, first lifting head then pushing up then standing hunched then arms opening. Row 3: four attack animation poses viewed facing right, hunched running, reaching forward, horizontal lunging with outstretched hands, staggered landing; full head, hands and feet inside each cell. Row 4: four flash-stunned recoil poses, hands shielding face, arched recoiling, dropping to knees, huddled seated recovery. Believable expressive anatomy, slender frightening posture, readable silhouette at small size, not crude stick figures, not cartoon cute, not an existing franchise character. Produce a usable evenly spaced sprite atlas.
```

音效由 ElevenLabs `eleven_text_to_sound_v2` 生成。`game/audio-sfx.json` 保存最终提示词、音量和版本路径；每个 MP3 旁边的 JSON 保存来源。最新哭声是 `public/audio/sfx/patient-cry-v2.mp3`，6.5 秒请求时长，包含阴森走廊回音与长尾混响。起身、扑击、闪光压制各为独立音效。闪光、扑击、死亡及暂停会终止前一个患者声音，避免哭声继续覆盖救场反馈。

患者红光通过现有遮挡灯光系统绘制，使用单独的 `colorStrength`，在地面形成两片交叠的暗红反光。该参数默认保持原有灯光颜色强度，仅新患者灯调整；受闪光压制时反光衰减。
