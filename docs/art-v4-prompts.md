# 0.3 美术生成记录（最终使用 v4 资产）

生成方式：内置 image_gen。所有选用 PNG 已复制进项目，未使用 CLI fallback。v3 写实帧图已被替换；代码、样式不再使用 v3 人物和物件。v4 人物先生成四方向帧图，再用内置工具执行透明背景编辑。

人物在游戏中分为固定上半身与活动腿部，避免生成帧交换挎包和手电位置。行走帧由实际移动距离驱动，静止与受阻时回到站姿。PNG 原始帧保留在下列路径，运行时按均分单元解析，不改变原图。

## public/assets/watchman-sheet-v4.png

生成提示词：

```text
Use case: stylized-concept
Asset type: low-resolution PIXEL ART game sprite sheet, genuinely transparent PNG. Four columns, four rows, 16 cells. Read this as a strict sprite design, NOT realistic illustration.
PIXEL LANGUAGE: imagine each cell is authored on a 32 x 48 pixel grid and then enlarged 8x NEAREST NEIGHBOR. Every mark must be a chunky square pixel or an intentional cluster of 2-6 such pixels. Exactly 16 muted colors maximum across entire sheet. No gradients, antialiasing, microtexture, dithering, photorealism, painterly noise or fine details. Clean graphic silhouettes, strong dark outline with selective breaks, three-step shading. Similar craft to a carefully hand-pixeled atmospheric indie horror adventure, not high-resolution realism or a tiny stick figure.
Character: adult hospital caretaker, stylized 4.5-head proportions, short dark hair, readable pale tired face, muted grey-green jacket with one cream chest patch and small brown satchel, deep blue-grey trousers, dark boots, small ivory flashlight. No tiny buckles or texture. Face is a few deliberately placed pixels. Top-down game view: camera elevated 45 degrees, show top of head and shoulders. Character occupies 60% cell width and 85% height, equal scales and exact same foot baseline in every cell, generous transparent padding.
ANIMATION: four distinct correct walking phases per row. Column1 left foot forward/right foot back with opposite arm swing. Column2 both feet passing under pelvis upright. Column3 right foot forward/left foot back with opposite arm swing (clearly different from column1). Column4 both feet passing under pelvis. Head stays almost still and center of mass stable. Row1 faces DOWN viewer, Row2 faces RIGHT, Row3 faces UP away, Row4 faces LEFT. Upper body outfit identical across all frames. Feet stay attached to legs, no gliding or stretched torso. Front/back rows alternate which boot is lower. Side rows alternate which leg is in front. Whole body fits each cell.
No background, no shadow, no beam, no effect, no text, no grid lines. Actual alpha transparent negative space. The result must look BLOCKY AND INTENTIONAL even viewed full size; do not sneak in high frequency realistic detail.
```

透明背景编辑提示词：

```text
Edit this sprite sheet only to remove ALL background completely, producing genuine alpha transparency, including the entire dark gradient background between and around all sixteen figures. Preserve the sixteen pixel art characters, their colors, poses, positions, and exact 4 by 4 layout. Remove any glow around figures. No new shadows or background. Do not add a checkerboard; actual transparency. Keep crisp pixel art edges and full bodies.
```

## public/assets/patient-sheet-v4.png

生成提示词：

```text
Use case: stylized-concept
Asset type: a FOUR columns by FOUR rows pixel art walking enemy sprite sheet, transparent background PNG. 16 equally spaced cells with consistent scale.
Subject: unsettling hunched hospital patient, abnormally long thin forearms, dark hollow face obscured by a few pale bandage strips, torn pale grey patient smock, bare dark feet. Stylized, not realistic: readable 4.5-head silhouette, bent head, asymmetric shoulders, three ragged points on gown. 12-color palette only: charcoal outline, dark desaturated teal shadows, three cold grey-green midtones, three bone-white highlights, muted rust brown. Hands are shaped claw-like pixel clusters, no anatomical microdetail, no blood, no glowing eyes.
Strict pixel art: logical 32x48 sprite canvas per cell enlarged by nearest neighbor. Each mark chunky square pixels. No microtexture, gradients, dithering, painted realistic wrinkles, realistic skin, blur, glow, mist, halo, aura, particles or shadows. Clean contiguous shapes, intentional sparse highlights, hard pixel edges. Like an authored narrative horror indie game sprite.
Animation rows: row1 down/front, row2 right, row3 up/back, row4 left. Each row has contact left foot, passing, contact right foot, passing. A slow uneven limping walk. Whole figure stays within cell, same center and consistent shared foot baseline. Do not mirror torso patterns between frames in same row. Camera elevated 45 degrees, top of head visible, orthographic adventure view. Generous truly TRANSPARENT negative space. NO text, borders, ground or gradient background.
```

## public/assets/bed-overhead-v4.png

生成提示词：

```text
Use case: stylized-concept
Asset type: a single clean 2D orthographic TOP-DOWN hospital bed game sprite on transparent background.
Strict geometry: camera looks STRAIGHT DOWN at the floor, ninety degrees overhead. The bed is a vertical AXIS-ALIGNED RECTANGLE: both long sides parallel to image sides, head edge and foot edge perfectly HORIZONTAL. No isometric angles, no diagonal bed, no vanishing point, no visible front vertical face, no visible wheels. Show only top surfaces of mattress, pillow, folded blanket, narrow rails. This should fit a rectangular collision box without ambiguity.
Art: intentional hand-authored LOW RESOLUTION pixel art, logical grid 40 pixels wide by 72 pixels tall enlarged with nearest neighbor. Crisp square pixel clusters, ONLY 12 muted colors: charcoal outline, three grey-green tones, three dirty cream tones, two muted brown rust tones. Big readable shapes and carefully placed edge highlights. One off-white pillow at top, pale mattress, grey-green folded blanket at bottom, subtle single-pixel wear in just a few places. NOT photorealistic, not painted, no gradients, no noisy texture, no tiny creases, no dithering, no perspective. Premium thoughtful pixel art means controlled clusters not real-world texture.
One bed centered, full object visible, large blank transparent margin. Actual alpha transparent PNG background, no floor, no glow, no background gradient or shadow, no text or border.
```

