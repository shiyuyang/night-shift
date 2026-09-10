# Monster death presentations

Fatal contact now selects the killer's closeup: listener, light-shy, patroller (including the finale interceptor), weeper, or the existing gift shade. Nonlethal hits retain ordinary damage feedback; environmental deaths have no enemy portrait. No combat damage or AI tuning changes are included.

Four dedicated generated portraits retain the monsters' existing visual identities. The listener, light-shy and weeper use revised v2 attacking poses; the accepted IV-pole patroller remains v1. Original PNGs are source assets; only WebP derivatives ship. Previous rejected portraits are local output artifacts and are not in the delivery manifest.

All portraits use the existing shade treatment: 256×170 logical canvas, twelve cold luminance steps, pixel scaling, screen blending and a radial edge mask. The actual rendered room is captured after lethal contact. New portraits dim that room more strongly at peak to prevent the player sprite showing through dark facial areas. The shade keeps its original room exposure. Directional entry poses distinguish listening/leaning, forward lunge, lateral impact and abrupt head lift.

The 1.1-second sequence hides and disables the result panel until complete. Retry clears animations immediately; run-ID changes also cancel old sequences. Reduced motion uses a still portrait fade and removes both zoom and room flicker. Existing audio cues distinguish breath, breaker arc, metal and patient lunge; they use the normal mute/volume path.

Validation: `npm run test:browser:deaths` uses controlled positions/health to trigger actual contact handlers for all six death routes (three primary types, weeper, interceptor, shade), verifies nonlethal exclusion, reduced palette, result locking, completion and reset. Animation time is paused only for reproducible screenshots in `output/monster-death/`; the test resumes and verifies completion. This is contact/visual regression coverage, not a full gameplay difficulty playthrough.
