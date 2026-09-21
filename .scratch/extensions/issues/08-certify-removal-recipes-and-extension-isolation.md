# 08: Certify removal recipes and Extension isolation

**What to build:** a template adopter can remove an enabled Extension by recipe
and all enabled Extension resources remain isolated by Organization.

**Blocked by:** 02 — Store and access Organization Files; 03 — Issue and revoke an API Key; 05 — Send a durable operational notification; 06 — Operate through a separate Operator boundary; 07 — Localize a declared supported locale.

**Status:** ready-for-agent

- [ ] Each recipe identifies the module's configuration, contract, migration, queue, route, and test removal steps.
- [ ] A clean clone follows each recipe without dangling references or failed quality gates.
- [ ] Negative API and worker tests prove Organization isolation for every enabled Extension resource.
