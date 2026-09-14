# Coordinate full-stack preview environments

Each pull request receives a coordinated Vercel web preview, Railway API and worker environment, and short-lived Neon branch that is migrated and seeded with synthetic or anonymized data. The pipeline must pass the preview API and database URLs across providers and destroy all resources when the pull request closes, because independently created platform previews can otherwise mix ephemeral web code with persistent API or production data.
