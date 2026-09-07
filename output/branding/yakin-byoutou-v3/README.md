# 夜勤病棟 主标 v3

内置 image_gen，参考现有 public/assets/watch-desk-v1.q95.webp。仅主标题，副标题由界面文本本地化。

状态：风格预览，未接入游戏。生成和一次透明背景修订均输出 RGB PNG（2172×724），棋盘格是图片实际内容，没有 alpha 通道。不能作为透明主标直接使用。

## 生成提示词

Use case: logo-brand. Generate a NEW standalone transparent game title asset. Attached image is STYLE AND PALETTE REFERENCE ONLY: match its finely detailed pixel art, muted grey-green hospital decay, old yellow-grey paperwork, dim restrained mood. Do NOT reproduce the hospital scene, desk, screen or any background.
Output ONLY the exact four Japanese title characters 夜勤病棟 arranged horizontally as a single tightly composed logo. DNT brand: preserve these exact kanji, including Japanese 棟, no simplified 栋. No subtitle, no romanization, no other text whatsoever.
Design: subtly narrow, uneven custom Japanese lettering with angular strokes, slightly mismatched heights and very slight individual lean. Unsettling local fractures and chipped edges, like lettering peeling from an old hospital sign. Clear readable four-character silhouette at 300px display width. Finely clustered hard-edged pixel art consistent with reference, not gigantic 8-bit square blocks, not smooth calligraphy or an ordinary unmodified font. Letter faces use restrained aged ivory #c8c0a1 and grey-olive #91947a with limited charcoal recesses. Very sparse desaturated dark rust accents #634338 only, NOT bright blood red. No dripping blood, no scattered glitch debris. Fine wear concentrated near edges, central strokes mostly solid for readability. Flat painted pixel material, not carved stone, chrome, embossed 3D type or cinematic poster lettering. No bloom, glows, blur, gradients, lighting halos or broad shadows.
The logo should feel native above an old grey-green pixel duty logbook, not dominate as a bright banner. Transparent background with true alpha everywhere outside the four letters and their tiny edge texture; NO signboard or rectangular backing, no checkerboard baked into artwork. Wide compact horizontal composition about 3:1 ratio, trim generous unnecessary canvas margins, keep modest safe padding and all strokes fully in frame. The image itself is the pure title asset, not a screenshot or mockup.

## 透明背景修订提示词

Use case: background-extraction. Edit this image: preserve the existing four-character pixel game title 夜勤病棟 exactly, including irregular worn grey-olive ivory lettering and dark outlines. REMOVE the entire white/light-grey checkerboard background, including every checkerboard area inside character holes and gaps. Output a true transparent PNG with actual alpha=0 outside the title; the checkerboard is NOT part of artwork and must not remain as opaque pixels. Do not draw a simulated checkerboard. Do not change, redraw, translate, simplify, recolor or rearrange the letters. No subtitle or extra text. Return only isolated logo on genuine transparency.

