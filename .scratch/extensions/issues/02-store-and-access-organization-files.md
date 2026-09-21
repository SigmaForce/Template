# 02: Store and access Organization Files

**What to build:** an Owner can upload, list, download, and delete a File for
the Active Organization through Railway Buckets and Organization-scoped metadata.

**Blocked by:** 01 — Record and review Audit Events.

**Status:** ready-for-agent

- [ ] File type, size, safe filename, ownership, and authorization are validated before object storage access.
- [ ] Download access is short-lived and secondary to the API's Organization authorization.
- [ ] File lifecycle actions create Audit Events and cross-Organization file access is denied by tests.
