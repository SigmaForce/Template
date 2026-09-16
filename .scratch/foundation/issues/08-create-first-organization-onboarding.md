# 08: Criar a primeira Organization pelo onboarding

**What to build:** um User autenticado sem Invitation cria sua primeira Organization, recebe uma Membership Owner e chega à rota organizacional correta.

**Blocked by:** 05 — Entregar formulários, overlays e feedback; 07 — Autenticar um User ponta a ponta.

**Status:** ready-for-agent

- [x] User sem Organization ou Invitation recebe um onboarding claro e acessível.
- [x] Criar a Organization persiste seu identificador, nome, slug e padrões regionais válidos.
- [x] A criação também estabelece exatamente uma Membership Owner para o User criador.
- [x] A Organization criada torna-se a Active Organization e abre sua rota por slug.
- [x] Slug inválido ou já utilizado retorna validação consistente sem deixar estado parcial.
- [x] Repetir acidentalmente a submissão não cria Organizations ou Memberships duplicadas.
