# Difficulty evaluation and repair work

The automated evaluation and repair scope is complete locally. Results and retained limits are documented in [the final assessment](difficulty-assessment-2026-09-11.md). No release is part of this task.

## Completed

- Actual Phaser campaigns cover objective progression, optional searches, daily encounters and re-encounters, countdown evasion, alternate opening routes, item restrictions, and endless nights. Navigation fixtures remain separate from combat outcomes.
- Reports preserve settings, source snapshots, fingerprints, full input replay, damage including healing, item gain/spending, active versus controlled pressure, chase/recovery censoring and diagnostic history. Final rendered replay matched all 1,556 steps.
- Final-box activation ends the third-night patient introduction; late approaches cannot delete the primary pursuer. An exhausted old-clue route becomes local search and still accepts a fresh cue.
- Furniture validation uses runtime monster clearance and task-room approaches, including the extended morgue drawer. Actual interactions require clear physical access. The three-box/key chain, empty one-shot task boxes, 4–6 cabinets, exactly two rewards and uncapped inventory are covered.
- Third-night speed remains at night 2's 109 while introducing the patient. The original 113 baseline, a rejected extra-supply candidate, and a separate evasion-policy comparison are retained. Countdown pressure decreased in the speed comparison; injury did not consistently decrease, so no human-difficulty improvement is claimed.
- The acceptance selection contains 132 runs: 125 full campaigns and seven navigation-only searches. It includes 44 endless campaigns and all 21 map/primary-kind combinations; 39 unflagged endless cases still cover those 21 combinations. Route-loop cases remain visible and are excluded from fairness conclusions.
- Fourteen held-out cases validate frozen settings. CPU coverage checks the 252-night rule cycle's 126 combinations; real next-night/retry checks cross nights 7/8, 252/253 and 10,000/10,001.
- Final CPU suite passed: 205 ordinary tests plus 1,400 layouts, 19.3 seconds, zero fallbacks. Browser regressions, the final third-night real-scene check, TypeScript/build and diff-format checks passed.

## Boundaries

The policies know static objective locations and are not novice exploration models. The opening curve has a third-night pressure peak and fourth-night relief; it is not strictly monotonic. More items did not consistently improve robot performance and that candidate was reverted. Human playtesting should next check third/fourth-night teaching, warning readability, exploration and long-session fatigue. These are limits of automated balance evidence, not failed functional checks or proof that every generated run is equally difficult.

The machine-readable acceptance selection, raw replay paths, source fingerprints and comparison statistics are in `output/balance/final-assessment.json`. Historical v5/v6/v7 and rejected candidate artifacts are not current-build acceptance evidence.
