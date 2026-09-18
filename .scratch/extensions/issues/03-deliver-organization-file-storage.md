# 03: Deliver Organization file storage

**What to build:** managed-object-storage upload, download, metadata, and
deletion lifecycle for Organization-owned files.

**Blocked by:** 01, 02.

**Status:** ready-for-agent

- Metadata and authorization are Organization scoped; object keys are opaque.
- Upload validation covers content type, size, ownership, and safe filenames.
- Signed URLs are short-lived and never substitute for API authorization.
- Deletion and retention actions write Audit Events.
