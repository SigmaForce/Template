# 08: Criar a primeira Organization pelo onboarding

**What to build:** um User autenticado sem Invitation cria sua primeira Organization, recebe uma Membership Owner e chega à rota organizacional correta.

**Blocked by:** 05 — Entregar formulários, overlays e feedback; 07 — Autenticar um User ponta a ponta.

**Status:** ready-for-agent

- [ ] User sem Organization ou Invitation recebe um onboarding claro e acessível.
- [ ] Criar a Organization persiste seu identificador, nome, slug e padrões regionais válidos.
- [ ] A criação também estabelece exatamente uma Membership Owner para o User criador.
- [ ] A Organization criada torna-se a Active Organization e abre sua rota por slug.
- [ ] Slug inválido ou já utilizado retorna validação consistente sem deixar estado parcial.
- [ ] Repetir acidentalmente a submissão não cria Organizations ou Memberships duplicadas.
