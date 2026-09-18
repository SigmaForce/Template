# Keep Operator authorization separate from Organization Roles

Internal operational administration uses an explicit Operator identity and
authorization boundary rather than adding a privileged Organization Role. This
prevents staff access from inheriting customer Membership semantics and makes
operational access independently auditable and revocable.
