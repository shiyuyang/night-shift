# Pursuit behavior and difficulty tests

The benchmark runs the production Phaser scene: movement, collision, stamina, inventory, damage and monster decisions. It does not duplicate monster AI. Reports are developer artifacts; behavior changes belong in the production runtime.

## Run

Requires Node 24+, installed Chrome and project dependencies. The runner owns a temporary Vite server and browser; it does not interrupt the player's port 5174 session.

```sh
# Default: nights 1,3,5,7; seed 0; ordinary policy; 180 simulated seconds
npm run test:balance

# Fixed calibration matrix; use a distinct output directory for every experiment
npm run test:balance -- --nights 2,3,4,5,6,7 --seeds 0,1,2 --policies conservative,ordinary,practiced --searches nearby --seconds 300 --out output/balance/baseline

# Search every optional container with monsters disabled; this is a navigation check
npm run test:balance -- --scenario navigation --nights 1,2,3,4,5,6,7 --searches all --strict --out output/balance/navigation

# The same searches with ordinary health, inventory and enemies
npm run test:balance -- --nights 1,2,3,4,5,6,7 --searches all --out output/balance/searches

# Fresh validation seeds; do not use these results to tune the same candidate
npm run test:balance -- --nights 2,3,4,5,6,7,8,9,10,11,12,13,14 --split holdout --seeds 313 --searches nearby --out output/balance/holdout

# Controlled final-stage fixture: task finished, normal health/items, 30-second countdown
npm run test:balance -- --scenario finale --nights 4,5,6,7 --seconds 60 --out output/balance/finale

# Compare matching cases after changing one production parameter family
npm run test:balance -- --nights 2,3,4,5,6,7 --seeds 0,1,2 --policies conservative,ordinary,practiced --searches nearby --seconds 300 --compare output/balance/baseline/report.json --out output/balance/candidate

# Exact input replay, including every simulation-step fingerprint
npm run test:balance -- --replay output/balance/baseline/campaign-2-0-ordinary-both-key-first-reserve0-aware-route-burst-quiet-counters-search-nearby.json --out output/balance/replay
```

`--nights` supports 1–1,000,000 and opens the requested real ledger page; the runner asserts the scene's night and seed. Night 1 has fixed geometry, so additional seeds are not independent map samples. Calibration seeds are below 100; holdout seeds are 100 or above. `--seconds` is positive and at most 600. Each case has a two-minute wall-clock timeout. `--strict` returns nonzero for diagnostic flags, including route loops that may later prove intentional.

## Policies and controls

Current versions: **policy 8, metrics 7**. Conservative, ordinary and practiced are different reaction/resource policies, not calibrated levels of human skill. Their observation delays are 0.70, 0.35 and 0.15 seconds; faster reactions do not guarantee a better outcome because item timing and routing also differ.

All policies know static objective locations. They observe enemies only within 260 world units and unobstructed sight, then retain a short memory of visible tells. They receive no hidden enemy positions for navigation. These are **known-route benchmarks, not novice exploration bots or human win-rate estimates**. They do not measure how difficult it is to discover keys or recognize a container.

| Option | Choices / default | Purpose |
| --- | --- | --- |
| `--route` | `key-first` / `box-first`; key-first | Objective order; both then use the second box, door, final box and exit |
| `--searches` | `off` / `nearby` / `all`; off | Optional searches after the first box and before the last |
| `--items` | `both` / `none` / `flash` / `decoy`; both | Offensive tools allowed; **bandages remain available** in every condition |
| `--reserve` | `0` / `1`; 0 | Keep one of each offensive tool until the last box, even in emergencies |
| `--counters` | `on` / `off`; on | Listener quiet walking and light-shy face/recoil/escape response |
| `--weeper-aware` | `on` / `off`; on | Read visible patient tells, dim light, walk around quiet patients, flash a lethal wind-up |
| `--movement` | `route` / `legacy`; route | Collision-aware threat bypass versus older local evasion diagnostic |
| `--stamina` | `burst` / `pulse`; burst | Sprint/recovery hysteresis versus older repeated-start diagnostic |
| `--mixed` | `quiet` / `urgent`; quiet | Whether another close active pursuer overrides quiet patient avoidance |

Nearby searches select visible optional furniture within 190 units. All-search tries every reachable cabinet and empty task box and revisits candidates after the room door opens. Selection never reads reward contents. A navigation-only all-search run fails if it misses a placed cabinet, empty task box or guaranteed reward, even if it reaches the exit.

The planner checks usable sides of keys and boxes. A visible pursuer reaching the unpowered exit triggers a reachable detour; power restoration immediately restores the exit goal. Waiting is exempt from stall detection only when nearby active danger is absent.

A visibly stunned weeper clears the avoidance zone, allowing passage during the six-second control window while the flashlight stays off. The browser regression checks actual passage and objective pickup before the stun ends. A visible dangerous weeper gets emergency-flash priority over healing; item availability and the reserve floor still apply. These remain simple policies and can take expensive detours in mixed encounters.

## Reproduction and report contract

The scene starts before its first simulation tick. Tests skip tutorial dialogs, then advance the real scene and camera at 50 ms per step. Campaigns keep normal progression, health and inventory. Only explicitly labeled navigation/finale fixtures change actors or progress. `--render` also executes drawing methods for parity checks; it is not a realtime human-play recording mode.

Production blackout/atmosphere random consumers use seeded test streams, isolated from asynchronous audio/renderer timing. Every case saves full inputs and gameplay-state fingerprints. Replay requires the original source fingerprint and compares every recorded step. `--allow-version-mismatch` permits a diagnostic run on changed code, still fails on divergence, and writes `divergence.json`. Equality is not promised across different browser versions or platforms.

Each output directory retains:

- `report.md` and `report.json`, exact settings, outcomes and environment;
- one full input replay per case and separate anomaly exports;
- `source/` with tracked and untracked source/content/harness files, plus package manifests, and `source-files.json` with Git commit, dirty state and content fingerprint.

A dirty-source hash alone cannot recover the tested code; preserve its source snapshot. Vite HMR is disabled. Editing, adding or removing hashed source files during a run invalidates the report. A new experiment should use a fresh directory; the default `latest` can overwrite matching artifacts. No live gifts or external viewer commands are injected.

## Interpret the measurements

- Daily ends at the last real box. Finale continues until death, exit or timeout. Its **countdown** subsection covers only the 30 seconds before exit power, so a late arrival is not mislabeled as extra countdown pressure.
- Damage includes actual healing on the same frame as a hit. Item gain and spending are independent; a simultaneous pickup cannot conceal a used flash. Reports include placed/searched cabinets, empty task boxes and gained rewards.
- Threat time includes an active pursuit with a valid cue or nearby unsuppressed danger. Nearby controlled enemies are counted separately. A stun timer alone is not pressure or a successful escape.
- Per-enemy escape requires two seconds without a valid cue. Player-wide recovery requires **all** enemies to lose cues and no nearby active danger for two seconds. Switching pursuers cannot create a false recovery window. Initial quiet before any threat is excluded.
- Unfinished chases, stage-crossing episodes, end-of-run recovery and short item windows are explicitly censored. A timeout is not a win; a censored chase is not an escape.
- Three-second post-item windows record the nearest present enemy after input, damage and distance change. That enemy may not be the affected target, because knockback can change which enemy is nearest. These are observations, not causal item benefits. Use same-case item restrictions and the isolated real-scene counter tests together.
- Diagnostic flags cover stationary pursuit, abandoning a visible player, policy stalls and route loops. A flag captures the preceding 30 seconds of inputs, positions, goals, cue decisions and transitions plus its replay link. Eight detailed anomalies per run are retained to bound memory. Review flags before interpreting aggregates; unresolved policy faults disqualify difficulty conclusions from that case. A single deliberate detour can legitimately trigger a route-loop flag.

Paired comparisons require identical scenario/night/seed/policy/split sets, policy/metric versions and durations. Missing, duplicated or incompatible cases fail. Scenario fixtures are separate from campaigns. Thresholds detect possible errors; they are not proven fairness targets.

## Regression, coverage and tuning

```sh
# Existing CPU budget: ordinary tests, then 1,400 layouts
npm test

# Real-scene fixtures; use a local Vite server on 5174 or BASE_URL
npm run test:balance:regression
```

The browser regressions cover pursuit/contact/escape transitions, safe opening placement, differentiated item interruptions, interceptor movement, weeper responses, the seven-night gates, old-clue search, physical interaction access, pickup/spending accounting, exit evasion and actual next-night/retry state reset.

The full layout pool includes furniture safety, monster approaches to task rooms, the extended morgue drawer and container/reward counts. The CPU difficulty test covers the complete 252-night rule cycle; real continuity fixtures cross nights 7/8, 252/253 and 10,000/10,001. Endless campaign coverage should include all **21 map/primary-kind combinations**, not only high night numbers that repeat one map. Night-number bounds and reset correctness do not establish human long-session fatigue.

The benchmark runs one browser case at a time. Keep at most two independent benchmark/browser jobs active locally; browser concurrency stays separate from the CPU suite. Do not add a second heavy CPU pool. Increase seed/combination coverage before browser concurrency.

Tuning sequence: pass navigation and regressions; inspect flags; freeze a baseline; change one parameter family; compare the same cases; validate fresh held-out seeds. Judge damage, resources, pressure and recovery together. Preserve meaningful final encounters while providing usable counterplay and a learnable opening. Human playtests are still needed to establish warning readability, discovery difficulty and perceived fairness.

Historical v5 and intermediate policy artifacts are retained under `output/balance/`; their obsolete policy behavior must not be treated as current-build evidence. The final assessment records selected datasets, source fingerprints, reviewed flags and remaining limits.

## Listener and light-shy focus

`npm run test:browser:listener` runs `tests/listener-light-focus.browser.mjs` against the local Vite server (or `BASE_URL`). The existing command name is retained, but its coverage now includes both primary kinds. It replaces the obsolete footsteps test that stunned the listener while expecting it to hear.

```sh
# Daily encounter speeds; normal health, stamina and item use
FOCUS_OUT=output/balance/focus-daily npm run test:browser:listener

# Final ten-second pursuit speed, using the same controlled encounters
FOCUS_STAGE=finale FOCUS_OUT=output/balance/focus-finale npm run test:browser:listener
```

Each run uses 20 isolated encounters in the authored ward: 18 mechanism cases and two distant-decoy diagnostics. Other actors are disabled only in these explicitly labeled fixtures. The nine behavioral assertions cover quiet/noisy pursuit, flash deafness and recovery, decoy investigation, physical wall occlusion, light recoil with real sprint stamina, repeated-light cooldown, battery-dependent reach, and item interruption. Diagnostic observations of distant decoys are recorded separately, without treating current behavior as approved balance. Reports retain complete scripted inputs, sampled actor state, hashes and source snapshots; unlike campaign tapes, these custom setup fixtures are not accepted by the campaign replay command.

The September 11 focus assessment also pairs active counter policies on/off in unchanged full campaigns, covers both primary kinds on all seven maps, and separates full-search runs, mixed-enemy deaths and driver warnings. See [listener-light-assessment-2026-09-11.md](listener-light-assessment-2026-09-11.md). Turning counters off disables the bot's deliberate quiet-walking/light-face response; it does not switch off the game's flashlight, item effects, Weeper behavior or incidental light hits.


## 2026-09-11 行为优化观测

实际扣血通过 `damage-source` 记录攻击者实例；闪光和诱饵通过 `control-hit` 记录声源/道具实例及实际接收者。`sound-decision` 记录接受、距离、失聪和持续接收状态。日常改派另记 `patrol-assignment`，包含原因、目标区域、无接触和脱战保护计时。

`attackRecoverySeconds` 单独统计近距巡逻者收招，不加入道具控制时长，也不因此认定玩家已完全脱战。保留原有所有敌人失去线索、周边没有活动威胁的完整脱战条件。归因记录只用于诊断，不参与游戏决策。

`--render` 现在执行 Phaser 的实际渲染流程；无绘制基准与绘制回放各自只推进一次相机，输入和状态指纹仍需逐步一致。场景回归新增命中后的停步/逃离/原地再受伤、同帧诱饵改变破门意图、环境机器接收、日常调度阶段边界，以及七图出口等待后再接敌。见 [本轮结果](monster-balance-results-2026-09-11.md)。


## 第三夜货架与关门等待回归

`tests/patroller-corners.browser.mjs` 在真实第三夜货架旁比较步行和短时冲刺绕角，使用正常体力，不使用道具；检查实际间距、减速搜索和绕回视线后的再接敌。它是明确隔离其他怪物的机制样本。

`tests/finale-room.browser.mjs` 从第三夜开场实际收齐保险丝，再步行到门内侧按 E 关门，保持正常生命并等待；检查主怪在通电前撞门进入。该策略故意不反抗，不能把它的死亡率当作普通整局难度。种子 2 执行实际渲染。两项已纳入浏览器回归命令。见 [本轮对照](patroller-room-balance-2026-09-11.md)。
