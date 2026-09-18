# Store Organization files in Railway Buckets

The Files extension stores opaque object bytes in Railway Buckets and keeps
Organization-scoped metadata in PostgreSQL. This fits the existing Railway
deployment boundary and avoids placing large binary data in Neon, while signed
object access remains secondary to API authorization.
