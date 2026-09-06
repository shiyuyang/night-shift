# 0.2 生成素材记录

生成方式：内置 image_gen，未使用 CLI/API fallback。生成原图复制到 public/assets；使用 Phaser 最近邻缩放。贴图不是 LDtk / Aseprite 原生工程。

## public/assets/hospital-floor-v2.png

最终提示词：

```text
Use case: stylized-concept
Asset type: actual repeating raster environment texture for a top-down pixel survival horror browser game, not a mockup.
Primary request: a single square texture sheet showing ONLY old abandoned hospital FLOOR, perfectly overhead orthographic flat view, filling the entire canvas edge to edge. Small square dirty gray-green ceramic floor tiles in a regular grid, fractured ceramic, uneven dark grout, dried rust-colored water stains, scattered subtle dirt and scratched wear. Muted desaturated blue-gray / olive gray / charcoal with very restrained brown-red stains. Rich hand-painted pixel art texture, visible crisp square pixels, restrained 32-color palette, late 1990s survival horror game aesthetic. Tile size roughly one eighth canvas width, all tiles same scale. Flat diffuse dim light without perspective, shadows of objects, light sources or vignette; must remain legible in a dark game. No furniture, no walls, no characters, no text, no border, no UI, no watermark. Seamless edges where possible. Deliver a square PNG image.
```

## public/assets/hospital-wall-v2.png

最终提示词：

```text
Use case: stylized-concept
Asset type: game environment texture, a single square flat seamless wall surface PNG, actual asset for a pixel horror hospital.
Primary request: oppressive decaying institutional wall, charcoal blue-green painted steel panels with peeling grey-green paint, aged plaster, dark seams, scratches, mottled dampness, subtle rust-red corrosion and dirt. Large rectangular plates, richer detail than clean vector graphics, authored pixel art with crisp visible square pixels, restrained desaturated colors, late 1990s survival horror aesthetic. Flat front-on orthographic material surface, no perspective. No objects, characters, lighting fixtures, windows, doors, text, logos, border, vignette or illustration scene. Medium-dark tonal range, enough visible texture to use as a wall tile and old hospital console panel background. Uniform diffuse light. Fill the entire image.
```

## public/assets/hospital-corridor-v2.png

最终提示词：

```text
Use case: stylized-concept
Asset type: landscape title-screen illustration for NIGHT SHIFT pixel survival horror game, 3:2 composition.
Primary request: looking down a terrifying abandoned hospital corridor at night, a distant unnaturally tall thin motionless human silhouette standing beneath a faint red emergency lamp at the far end. Rusted empty wheelchairs and gurney on the sides, peeling grey blue-green paint, wet cracked tile reflecting sparse cold fluorescent lamps, ajar doors leading into total darkness, dangling wires, subtle fog. Rich authored pixel art with sharp discrete pixel clusters and dithering, late 1990s 2D adventure horror, not smooth photorealistic, not cartoon cute. Muted teal grey, grimy bone ivory and restrained rusty crimson. Strong perspective depth, large deep near-black shadow in center foreground to place real HTML title text on top later. The distant silhouette must be barely discernible, no gore. Cinematic tension with readable architecture rather than completely black image. No text, typography, logos, UI or borders.
```

