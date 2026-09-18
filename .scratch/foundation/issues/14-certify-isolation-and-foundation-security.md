# 14: Certificar isolamento e proteção da Foundation

**What to build:** uma suíte de segurança demonstra externamente que recursos, Memberships e configurações não atravessam Organizations e que a API aplica o baseline defensivo acordado.

**Blocked by:** 09 — Alternar a Active Organization com segurança; 12 — Gerenciar o ciclo de Memberships; 13 — Editar configurações e slug da Organization.

**Status:** ready-for-agent

- [x] Tentativas de ler, alterar e enumerar recursos de outra Organization falham sem revelar sua existência ou seus dados.
- [x] Body, query, slug e headers controlados pelo cliente não conseguem substituir a Active Organization verificada.
- [x] Membership suspensa ou removida perde acesso em todos os endpoints protegidos relevantes.
- [x] CORS allowlist, headers de segurança, limites de payload e unknown-field rejection têm testes observáveis.
- [x] Rate limiting diferencia ao menos tráfego anônimo, User autenticado e Organization sem permitir bypass trivial.
- [x] Erros e logs produzidos pelos cenários hostis não contêm tokens, cookies, stack traces, assinaturas ou PII indevida.
- [x] O Playwright cobre o percurso crítico e os testes HTTP cobrem a matriz adversarial com PostgreSQL real.
