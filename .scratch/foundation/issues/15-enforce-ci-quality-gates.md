# 15: Aplicar os quality gates no CI

**What to build:** toda contribuição pública passa por uma pipeline reproduzível que impede merge de código, contrato, interface ou dependência que viole a Foundation.

**Blocked by:** 05 — Entregar formulários, overlays e feedback; 06 — Entregar componentes de dados e estados de produto; 14 — Certificar isolamento e proteção da Foundation.

**Status:** ready-for-agent

- [ ] CI usa instalação congelada, runtime documentado e cache somente para tarefas determinísticas.
- [ ] Formatting, lint, typecheck, testes unitários/integração, Storybook, acessibilidade e builds são gates obrigatórios.
- [ ] Playwright executa os fluxos críticos com paralelismo e retries controlados para CI.
- [ ] OpenAPI e cliente gerado divergentes fazem a pipeline falhar.
- [ ] Dependency Review, CodeQL, Dependabot, secret scanning e verificações de workflows estão configurados quando suportados.
- [ ] Actions usam referências imutáveis e permissões mínimas; logs e caches não carregam secrets.
- [ ] Migration, deploy e seed não são cacheados nem executados concorrentemente contra o mesmo banco.
