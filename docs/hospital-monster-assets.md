# 医院怪物素材（内置 imagegen）

四方向、四步态，透明背景。原始图保留，运行时最近邻采样为 80×80 帧、统一脚底基线和比例；不修改碰撞体。

## listener

文件：public/assets/hospital-listener-v1.png

生成提示：

Use case: stylized-concept. Production sprite sheet for a top-down 2D pixel horror hospital game. True transparent alpha background. ONE character, sixteen full-body poses in an EXACT equal 4-column by 4-row grid, generous transparent padding each cell, NO overlapping cells. Row 1 facing down, row 2 facing right, row 3 facing up, row 4 facing left. Each row four walk cycle poses: left step, passing, right step, passing. Feet aligned to same baseline in every cell, consistent scale, entire head and props inside each cell. Slight overhead RPG perspective, anatomically coherent adult, hand-pixelled sprite style intended at 48 to 64 pixels tall, clean stepped clusters, limited 12-color muted palette, flat shadow planes, very readable silhouette. No realism, no painting texture, no gradients, no glow, no cast floor shadow, no labels, no grid lines, no scenery, no text. Character: unsettling blindfolded hospital patient, wide mummy-like gauze wrap completely covering eyes and top of head, head tilted sharply as if listening, elongated hunched neck, narrow emaciated adult body in dirty grey blue striped hospital pajamas, one arm bent cupping the ear, other arm hanging down, bare feet, loose bandage ends near shoulders. Distinct large horizontal bandaged head silhouette. Subtle old rust stains, no graphic gore. Walking sideways torso remains matching facing direction.

## light-shy

文件：public/assets/hospital-light-shy-v1.png

生成提示：

Use case: stylized-concept. Production sprite sheet for a top-down 2D pixel horror hospital game. True transparent alpha background. ONE character, sixteen full-body poses in an EXACT equal 4-column by 4-row grid, generous transparent padding each cell, NO overlapping cells. Row 1 facing down, row 2 facing right, row 3 facing up, row 4 facing left. Each row four walk cycle poses: left step, passing, right step, passing. Feet aligned to same baseline in every cell, consistent scale, entire head and props inside each cell. Slight overhead RPG perspective, anatomically coherent adult, hand-pixelled sprite style intended at 48 to 64 pixels tall, clean stepped clusters, limited 12-color muted palette, flat shadow planes, very readable silhouette. No realism, no painting texture, no gradients, no glow, no cast floor shadow, no labels, no grid lines, no scenery, no text. Character: unsettling photosensitive isolation patient, pallid adult in a heavy dirty ivory isolation gown falling almost to ankles, broad hunched shoulders and a hood-like drape around the head, BOTH unusually long arms raised shielding the face from light, black hollow gap between fingers hiding face, large folded forearms form an unmistakable peaked silhouette around head. Thin bare ankles, dragging uneven steps. Muted ivory and desaturated green-grey cloth, tiny old rust stains, no graphic gore. This is not a mummy and no eye bandages. Arms remain raised in all walk frames.

## patroller

文件：public/assets/hospital-patroller-v1.png

生成提示：

Use case: stylized-concept. Production sprite sheet for a top-down 2D pixel horror hospital game. True transparent alpha background. ONE character, sixteen full-body poses in an EXACT equal 4-column by 4-row grid, generous transparent padding each cell, NO overlapping cells. Row 1 facing down, row 2 facing right, row 3 facing up, row 4 facing left. Each row four walk cycle poses: left step, passing, right step, passing. Feet aligned to same baseline in every cell, consistent scale, entire head and props inside each cell. Slight overhead RPG perspective, anatomically coherent adult, hand-pixelled sprite style intended at 48 to 64 pixels tall, clean stepped clusters, limited 12-color muted palette, flat shadow planes, very readable silhouette. No realism, no painting texture, no gradients, no glow, no cast floor shadow, no labels, no grid lines, no scenery, no text. Character: unsettling walking hospital patient dragging an attached rusty IV infusion stand. Tall stooped adult in short dirty faded teal hospital gown, one shoulder slumped, thin bare lower legs, one hand grips IV stand, other arm limp, small dark hollow facial features. The IV stand has a clear hook and hanging dark red fluid bag, stays very close beside shoulder, compact small two-wheel base by feet; whole patient plus stand silhouette must fit inside each cell, not too wide. Stand extends a little above head. No graphic gore. Coherent equipment angles for all four directions.


## 哭泣患者威慑调整（2026-09-06）

- LDtk 预设点优先按可见搜寻路径距离排序，降低隔墙靠近物品却不构成遭遇的情况。开门后的路径仅用于排序；仍以完整警戒方形作为障碍验证钥匙链、搜箱和逃生路线，不堵死必需交互。
- 视线畅通且距离小于 150 像素时立即停止哭声，0.2 秒后固定抬头姿态；离开到 170 像素外或被墙遮挡后解除察觉。察觉独立于攻击积累，关闭手电正常走近也有反应。攻击警觉度达到 75% 进入下一起身姿态；0.8 秒正式预警使用 5→6→7 帧，朝向玩家，然后才扑击。平静后至少 3 秒再恢复哭声。
- 闪光保持 6 秒压制和范围／视线要求，恢复归位后保留 12 秒警觉（仅待机时计时）。警觉期间，进入原有 90 像素范围即开始积累惊动，仍有完整预警；远离可等待其平静。无加速秒杀、无全屏红框。
- 使用现有 ElevenLabs 哭声、起身与扑击音效，本轮未重新生成音频；音乐维持已恢复的旧版。
