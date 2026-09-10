# Pursuit escape tuning

- Keep monster count, movement speeds, flashes, box blink and breach durations unchanged.
- Listener walking range is 80 px with clear sight and 40 px through occlusion; loud activity retains its existing range. Walking clues last 1.5 seconds, other heard clues at most 3 seconds.
- Visual tracking remembers the last sighting for at most 2.5 seconds. After 2 seconds without sight, reacquisition needs 0.6 seconds of uninterrupted sight; within 70 px, discovery is immediate.
- Search around a remembered clue lasts 5 seconds after arrival. Later nights resume patrol after the search, including the finale.
- The finale alarm supplies its initial clue but no recurring player-location refresh. The exit interceptor chooses an initial checkpoint once, then updates its chase clue only on sight. Door routing for primary and interceptor enemies uses remembered positions.
- Validation: `npm test`, `npm run build`, `node tests/pursuit-escape.browser.mjs`. Browser regression runs actual scene frames and checks stale listener clues and fixed intercept checkpoints; this is controlled verification, not a complete difficulty playthrough.

## Encounter frequency follow-up

- After searching, the primary patrol visits remaining key/box objectives, the ward doorway and the entry corridor. Completed boxes leave the circuit; closed-room objectives wait until the door opens. Targets are checked for reachability and a stalled leg is abandoned after 16 seconds.
- Night 1 retains retreat after search, with the off-screen return cooldown capped at 10 seconds. Its finale stays in the map and patrols the return route like later nights.
- Finale patrols visit the original return checkpoints and the exit. The interceptor cycles through its initial checkpoint, exit, alternate checkpoint and entry after losing sight, instead of standing at a single checkpoint. Neither circuit receives the player's live position.
- Repeated-visit unit simulations and the browser's actual scene movement check cover the renewed patrol behavior. These increase route coverage; they do not guarantee an encounter on a fixed timer for every player route.
