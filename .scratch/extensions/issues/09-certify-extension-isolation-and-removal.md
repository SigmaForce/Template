# 09: Certify extension security and removal

**What to build:** end-to-end isolation, operational, and removal certification
for enabled Extension modules.

**Blocked by:** 02, 03, 04, 05, 06, 07, 08.

**Status:** ready-for-agent

- Each Organization-owned resource has negative cross-Organization tests.
- Removal recipes are exercised against a clean clone.
- API Keys, files, and Webhook secrets are absent from logs and error responses.
- CI runs focused worker and API integration suites with synthetic data.
