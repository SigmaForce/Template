# Separate web and API in one monorepo

The foundation keeps Next.js and NestJS as separate applications in one monorepo, sharing only explicit contracts, configuration, and design-system packages. The web application deploys to Vercel, the API and Redis-backed worker deploy independently to Railway, and PostgreSQL is provided by Neon, preserving a clear backend authority while keeping the clone-and-customize workflow simpler than coordinating separate repositories.
