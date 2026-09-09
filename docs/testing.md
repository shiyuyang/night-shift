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

`tests/test-workers.test.mjs` checks budgeting (including a simulated 32-CPU machine), complete sample coverage, deterministic ordering, crash handling and timeout cleanup using fast fixture workers. Actual map assertions live in `tests/helpers/layout-worker.mjs`; the shared opening-search assertions remain in `tests/helpers/layout-assertions.mjs`.
