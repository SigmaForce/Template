# Record Audit Events separately from operational logs

Audit Events are immutable Organization-scoped domain records for security and
administrative actions, while structured operational logs remain redacted,
ephemeral diagnostics. This preserves a reviewable security history without
turning logs into an unreliable or secret-bearing system of record.
