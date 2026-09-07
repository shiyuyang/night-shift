# 夜勤病棟：像素恐怖标题 v2

使用内置 image_gen 生成及编辑。根据用户反馈改为粗像素、错位断笔与黑底；主标题 DNT，副标题日英中本地化。非透明 PNG，未接入游戏。生成式编辑不保证三版主标题逐像素一致；正式接入宜共用单一主标，副标题独立文本层渲染。

## 初稿提示词

Use case: logo-brand. Create a radically new title graphic for a LOW RESOLUTION PIXEL ART Japanese horror game. This is pixel art drawn by hand on a coarse pixel grid, NOT a movie poster, NOT weathered realistic typography. Landscape 1536x1024 canvas but artwork looks designed at 384x256 then nearest-neighbor enlarged 4x: EVERY contour and texture uses crisp square pixel steps, no antialiasing, gradients, blur, lighting bloom, 3D extrusion or realistic stone texture.
Main title exactly 夜勤病棟, all four Japanese kanji legible and correct, preserve 棟 not 栋. Custom monstrous pixel lettering with thick blunt uneven strokes, off-kilter character baselines, occasional missing pixel chunks, asymmetric broken stems, short vertical pixel trails hanging from selected strokes like corrupted hospital signage. Letters feel roughly assembled and slightly crooked, heavy ragged silhouettes rather than orderly typeset serif. Maintain each kanji identity, do not scramble strokes into illegibility. Bone-white and dirty pale grey-green pixels, a FEW dark crimson misaligned pixel fragments within/below letters, mostly monochrome. Uneasy, handmade, abandoned Japanese hospital on a retro game screen. Large title occupying the central 80% of width, 40% height with wide black negative space surrounding. Flat absolute black backdrop. No objects, scenery, ghosts, eyes, faces, extra symbols, decorative frame or watermark.
Below title, substantially smaller crisp pixel Japanese subtitle exactly 交代の職員は、まだ来ない。 centered, pale muted grey and readable, with generous separation from ragged title. Only these two text lines. Preserve DNT title globally. The artistic energy must come from coarse pixel shapes, disjointed rhythm, damaged letter geometry; not realistic surface grunge.

## 修订提示词

Edit this title into CLEAN HARD-EDGED LOW-RES PIXEL ART. Keep exact title 夜勤病棟 and exact subtitle 交代の職員は、まだ来ない。. The single most important correction: REMOVE ALL GLOW AND ALL BLUR. Background must be SOLID #080a09 with absolutely NO gradients or haze. No soft pixels anywhere. REDRAW the lettering as solid opaque bone-white coarse pixel shapes with sparing flat grey missing chunks, not hundreds of noisy tiny pixels. Use only 5 FLAT colors total: black, ivory, grey-green, dark grey, dark red. Every visible pixel block should be a crisp 6x6 or larger square in this 1536x1024 image. Lettering needs heavy angular stair-stepped strokes, squared ends, irregular height, subtle unequal rotations, genuinely custom rough game-title pixel lettering, no smooth serif or calligraphy strokes. Add short dislocated horizontal pixel breaks within a few strokes, retain legibility of all four kanji. Keep red accents tiny, no long dripping blood. Subtitle in a crisp legible bitmap Japanese font, entirely solid grey, no glow. Title at center, with black margins on all sides. Strict pixel-art game asset, flat 2D.

## 英文

Use case: text-localization. Edit ONLY the small subtitle of this coarse pixel horror game title. Replace it with EXACT text: "Your replacement still hasn’t arrived.". Render subtitle in a crisp hard-edged low resolution bitmap font, muted grey-green, centered in same band and fitting within 80% of image width. Keep main title 夜勤病棟 DNT completely unchanged, particularly Japanese 棟 (never simplify to 栋), including all its pixel shapes, colors, irregular geometry, scale, position and tiny red fragments. Keep black background and all other artwork unchanged. No glow, no blur, no smooth font, no new elements.

## 中文

Use case: text-localization. Edit ONLY the small subtitle of this coarse pixel horror game title. Replace it with EXACT text: "接班的人，还没有来。". Render subtitle in a crisp hard-edged low resolution bitmap font, muted grey-green, centered in same band and fitting within 80% of image width. Keep main title 夜勤病棟 DNT completely unchanged, particularly Japanese 棟 (never simplify to 栋), including all its pixel shapes, colors, irregular geometry, scale, position and tiny red fragments. Keep black background and all other artwork unchanged. No glow, no blur, no smooth font, no new elements.

