# Multicore tests

Use Node.js 24 or newer and run `npm test`. Content export and audio packing run once, before any test workers start.

The runner uses one resource budget in two sequential phases:
1. Ordinary unit/regression files run with Node's `--test-concurrency`.
2. The 1,400-layout sweep runs in a fixed child-process pool. Each job contains 14 seed/night pairs; free workers immediately take the next job. This phase does not overlap the first phase.

The automatic budget is the smaller of:
- 75% of `os.availableParallelism()`, rounded down;
- available memory minus 1 GiB, divided by a 512 MiB per-worker allowance.

At least one worker is used. Available memory comes from Node's `process.availableMemory()`, falling back to OS free memory. These are scheduling estimates, not memory limits. On a machine reporting 32 available logical CPUs, the CPU budget is 24 workers; lower available RAM can reduce it. This is suitable as a starting point for a future 9950X machine, not a benchmark of that hardware.

Override the automatic budget when sharing the machine, diagnosing problems, or measuring scaling:

```sh
TEST_WORKERS=16 npm test
TEST_WORKERS=1 npm test
npm run test:layouts -- --workers 24
npm run test:layouts -- --seed 42 --night 5 --workers 1
```

An explicit override bypasses the automatic CPU/RAM cap. Browser tests keep their separate existing commands and are not included in this pool; running this CPU suite does not launch many Chrome instances.

The full matrix remains seeds 0–199 × nights 2–8, exactly once each. Per-layout assertions are unchanged. Global aggregation still requires fewer than six fallbacks and more than 150 unique layouts; these checks must not be weakened to per-shard thresholds. A targeted seed/night run reports subset results without applying the full-matrix diversity thresholds.

Workers report assertion failures with the original stack, night, seed and reproduction command. Duplicate/missing batch results, early worker exit, IPC errors and a five-minute batch timeout fail the suite and stop the pool. Progress is logged approximately every 15 seconds when batches finish. Ctrl-C/SIGTERM stops the pool; on macOS/Linux the main runner forwards signals to the complete phase process group.

## Reachability performance

The shared runtime validator rasterizes built-in actor footprints into a byte grid before breadth-first search. Exact overlap checks preserve edge-touching behavior, and neighbor order remains right/left/down/up so seeded placement retains its point ordering. The integer queue is allocated once per search. Grids are not cached across calls: doors, boxes and extended morgue drawers can change collision geometry. Custom footprints retain direct collision evaluation.

`tests/level-validation-grid.test.mjs` compares full ordered point arrays against the frozen pre-optimization implementation in `tests/helpers/reference-reachability.mjs`, including fractional coordinates, both actor sizes, custom footprints, closed doors, blocked spawns and geometry edits. The full layout sweep still validates every original seed and all global assertions.

Local measurement (Ryzen 9950X, DDR5-6000 EXPO, Node 26.8.1, 13 workers): the full layout phase dropped from 160.6 s to 24.06 s; all 1,400 layouts passed with zero fallbacks and 949 unique layouts. The complete two-phase CPU suite passed in 50.2 s, excluding preparation. A 448-layout subset dropped from 50.58 s to 8.39 s. These are individual runs, not statistical performance guarantees.

For that subset, core PMU DRAM-to-L2 fill counts fell from a historical 23.596 billion to 3.300 billion (about 86% fewer). The historical counter baseline used DDR5-4800, so it is supporting evidence rather than an EXPO-controlled counter comparison. At 64 bytes per fill this estimates total read traffic, not memory-controller read/write utilization; average estimated traffic per second remained around 25 GB/s. The optimization reduces work and total traffic, not necessarily instantaneous bandwidth demand.

A second optimization packs escape-route BFS membership, queue and distances into typed arrays, replacing coordinate strings and hash sets for integer 8-pixel grids. Fractional, off-grid and excessively sparse input sets retain the original algorithm. Regression tests compare shortest distances against the frozen implementation, including disconnected grids, duplicate points and fractional coordinates.

With the same DDR5-6000 / Node / 13-worker setup, this reduced the full layout phase from 24.06 s to 13.43 s (zero fallbacks, 949 unique layouts); the full CPU suite passed in 33.9 s excluding preparation. For 448 layouts, core PMU measurements changed from 520.34 to 285.07 billion cycles, from 199.65 to 84.72 billion load-incomplete retirement-stall cycles (38.4% to 29.7%), and from 3.300 to 1.850 billion DRAM-to-L2 fills. Counter groups ran at 100% coverage. These are aggregate user-thread counters, not wall-clock waiting seconds or direct memory-controller bandwidth; instantaneous estimated reads still reached about 27.6 GB/s, so they do not establish that memory bandwidth has ceased to be a bottleneck.

Optional-content sorting now computes wall-distance scores once per point and room-occupancy scores once per candidate round, rather than allocating obstacle arrays and repeating those computations inside sort comparators. Stable ordering and RNG calls are preserved. A before/after SHA-256 comparison of complete level JSON for nights 1–8 × seeds 0–7 matched (`eed4605d5ec8f8074211bf87770474ceadfa7dc60da5d60736e82133ea8a475f`). Under the same setup, the full layout phase fell to 8.94 s, with zero fallbacks and 949 unique layouts; the full CPU suite passed in 28.0 s. For 448 layouts, DRAM-to-L2 fills fell from 1.850 to 1.280 billion and load-incomplete retirement-stall cycles from 84.72 to 48.76 billion (23.0% of 211.60 billion cycles), with 100% counter coverage. This further reduces total traffic but is not proof of bandwidth saturation or its elimination.

Local proximity checks now use a per-call 32-pixel spatial index with typed coordinate and bucket-link arrays instead of repeatedly scanning all reachable points. Exact `Math.hypot` thresholds remain unchanged; empty and excessively sparse inputs are covered by regression tests. Complete level JSON hashes for the same 64 samples still match. The final packed-index implementation passed the full CPU suite in 25.9 s, with the 1,400-layout phase at 8.07 s (zero fallbacks, 949 unique layouts). An intermediate object-bucket implementation measured 7.75 s, so the small difference between index representations is not evidence of an improvement from packing alone. For 448 layouts, packed-index counters recorded 202.56 billion cycles, 57.21 billion load-incomplete cycles (28.2%), and 1.202 billion DRAM-to-L2 fills at 100% coverage. Compared with pre-index measurements, wall time and total reads improved, but load-incomplete cycles increased; this change must not be described as reducing measured memory waiting.

`tests/test-workers.test.mjs` checks budgeting (including a simulated 32-CPU machine), complete sample coverage, deterministic ordering, crash handling and timeout cleanup using fast fixture workers. Actual map assertions live in `tests/helpers/layout-worker.mjs`; the shared opening-search assertions remain in `tests/helpers/layout-assertions.mjs`.
