# 01: Document removable extension recipes

**What to build:** module boundaries and removal recipes for every Extension
module before adding its runtime behavior.

**Blocked by:** Commerce 12.

**Status:** ready-for-agent

- Each recipe names code, migration, configuration, route, worker, and test changes.
- No extension is hidden behind a permanent runtime feature flag.
- Removal leaves no dangling contract, queue, or authorization reference.
