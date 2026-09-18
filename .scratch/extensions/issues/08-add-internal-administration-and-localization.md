# 08: Add internal administration and localization

**What to build:** separately authorized operational administration plus
localization infrastructure for supported product copy and civil data.

**Decision:** ADR-0019 for administration; localization remains undecided until
supported locales are selected.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- Internal administration is not an Organization Role and has explicit access controls.
- Localization preserves existing timezone, locale, and accessibility behavior.
- No translation framework is added until supported locales are declared.
- Administrative actions produce Audit Events and cannot bypass Organization isolation.
