# Pursuit behavior and balance validation

Behavior correctness is a prerequisite for tuning difficulty. A passing layout sweep is not evidence of fair encounters or an appropriate win rate.

## Current regression checks

- `npm test` includes distraction reacquisition, interceptor distant-noise A/B, hidden and reachable opening placement, and existing escape/pathfinding checks. The ordinary test phase shares the existing worker budget; no additional heavy pool is created.
- With Vite running on port 5174, run `node tests/pursuit-transitions.browser.mjs` and `node tests/item-balance.browser.mjs`. These exercise the actual scene update: Listener contact retains a short clue, separation lets it expire, a close-range decoy stops Light-Shy damage, and nights 2–7 start their first patrol outside sight with no player-position memory.
- Browser fixtures deliberately control positions and health to isolate bugs. They do not measure win rate or establish gameplay balance.

Opening placement applies only to the first primary appearance before any task box is opened. It requires at least 400 world units from both the player and initial spawn, no direct sight from either, and at least six seconds of reachable walking distance at pursuit speed. Candidates are ranked toward eight seconds. The existing three-second warning remains. If no safe candidate exists, retry rather than place nearby. The initial clue is the monster's own position, allowing local search; real player sounds or sight can still attract it. Later encounters and finale entry rules remain independent.

## Next measurement layer (planned, not implemented)

1. Add a bounded 30-second event buffer. Record seed, night, code/config version, fixed-step input, each enemy's selected target and source, accepted/rejected cues, timers, item interruptions, hits, path blockage, and transitions with explicit reasons. Export on an anomaly. Replay must preserve random decisions and timing, not merely reuse the map seed.
2. Build short scripted scenarios using the production simulation and real movement/stamina/collision. Cover two corners, hiding, walking versus sprinting, visible versus occluded decoys, door breach, escape interception, and re-encounters. Test weepers separately. Do not copy AI into a simplified test-only implementation.
3. Run paired baseline/candidate seeds with conservative, ordinary and practiced input policies. Policies vary reaction delay, noise, stamina and item decisions; they must not know hidden enemies. Keep unused seeds for evaluation. Heavy simulation runs use a sequential phase in the existing budget; browser parity checks stay small.
4. Report per-night, per-monster and per-stage distributions: first encounter time, chase duration, successful escape time, time until next encounter, damage, item effectiveness and finale survival. Define escape by loss of valid pursuit cues and an actionable recovery interval, not distance alone. Flag sustained contact without valid targeting and prolonged motionless pursuit as correctness failures.
5. Establish the baseline before proposing target ranges. Change one parameter family at a time and compare identical seeds/policies. Human playtests still decide whether warnings are readable, escape feels earned, and final-stage pressure feels fair. Automated win rate is supporting evidence only.
