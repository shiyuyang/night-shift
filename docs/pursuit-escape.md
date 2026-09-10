# Pursuit escape tuning

- Monster counts, chase speeds, flashes, box blink and breach durations remain unchanged. Search movement is 65% of chase speed so losing sight provides room to escape.
- Listener walking range is 80 px with clear sight and 40 px through occlusion. Running remains audible to the listener. Walking clues last 1.5 seconds, other heard clues at most 3 seconds.
- Patrollers do not acquire footstep clues, including sprinting. Nearby loud interactions can alert them only without occlusion; footsteps no longer bypass the visual reacquisition delay. Light-shy loud/runner clues also respect occlusion.
- After 0.75 seconds without sight, visual enemies enter slower search. Reacquisition takes 0.9 seconds of uninterrupted sight; within 35 px, discovery is immediate. This applies to the exit interceptor too. Brief glimpses do not reset the search state.
- Search around the last clue lasts 5 seconds after arrival. Later nights then resume ordinary patrol. Night 1 keeps its original retreat/rest behavior.
- The finale supplies an initial clue, without recurring player-location refresh. The interceptor retains its initial checkpoint. After 1.2 seconds without meaningful progress, it checks reachable positions within 88 px of the checkpoint or nearest reachable approach (path length at most 220 px). It does not circulate between exit and objectives or read the live player position while searching.
- The previous objective-focused circuit, repeated exit circuit and 10-second first-night return cap have been removed following difficulty feedback.
- Validation: `npm test`, `npm run build`, `node tests/pursuit-escape.browser.mjs`. Browser coverage includes real wall occlusion, stale clues, sprint hearing and entry into search. These are controlled scenarios, not a full difficulty playthrough.

- `node tests/interceptor-search.browser.mjs` reproduces the fifth-night closed-room wait / door-open transition with seeds 0, 1 and 42, and checks continued local movement after checkpoint arrival. Unit tests cover unreachable targets, pause, flash and visual reacquisition.
