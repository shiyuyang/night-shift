# Night difficulty progression

Runtime source of truth: src/runtime/difficulty.ts. The seven-map opening order remains unchanged.

| Night | Patient | Exit interceptor | Final-box blink | Automatic blackout | Door breach | Empty task boxes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | None | Off | Off | Off | 4 s | 1 |
| 2 | None | Off | Off | Off | 3 s | 1 |
| 3 | Fixed | Off | Off | Off | 3 s | 2 |
| 4 | Fixed | On | Off | Off | 2 s | 2–3 |
| 5 | Random roaming, 45% roll | On | On | On | 2 s | 2–3 |
| 6 | Random roaming, 60% roll | On | On | On | 2 s | 2–3 |
| 7+ | Random roaming, 75% roll | On | On | On | 2 s | 2–3 |

Occurrence rolls are seed-deterministic; actual placement additionally requires a valid authored socket and route. Fixed patients can react, chase and return home; only idle roaming is disabled.

Night 1 cannot start a primary pursuit before the first real box. Night 2 starts with 18 seconds before automatic patrol arrival. Both start with four flashes and four decoys; night 3 onward settles at two of each. Enemy item counters remain unchanged. Night 2 still randomizes within authored room pools but permits visible opening items and reduces key-to-first-box separation to 180 pixels; night 3+ retains cover and 300-pixel separation. The nearest supply cabinets contain the two items on nights 1–4.

The first visible approach within 280 pixels of the third-night patient clears the primary pursuit and reserves 30 active-game seconds for learning. Opening the final box ends this protection; approaching the patient during evacuation cannot restart it or remove the primary pursuer. This resets for a new run and does not repeat within the same run. Night 4 removes this protection. Night 3 retains night 2's 109 speed ceiling while introducing the patient, so learning a new enemy does not also increase the pursuit speed.

Finale speed is 103, 109, 109, then 117 pixels/second, below the player's 125 sprint speed and above the 83 walk speed. Night 5+ can reach 121 during the last ten seconds. Every fourth endless night omits that final speed burst and has a longer retreat rest interval when applicable; enemy counters and learned mechanics persist.

Blink candidates and landing revalidation exclude a 220-pixel square radius around the patient's current position. The existing six-second interceptor guard staggers its approach after the final-box blink.

Validation: difficulty.test.mjs, difficulty.browser.mjs (controlled real scene calls and patient route motion), box-blink.browser.mjs, tutorial.browser.mjs, and focused search/encounter regressions. This verifies implementation, not first-time-player completion rates; onboarding balance still needs fresh-player playtests.
