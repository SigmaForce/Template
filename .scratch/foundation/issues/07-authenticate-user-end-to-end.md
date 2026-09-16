# 07: Autenticar um User ponta a ponta

**What to build:** um visitante autentica e encerra sessão pelo Clerk, entra na shell protegida e é reconhecido pela API somente a partir de um token verificado.

**Blocked by:** 02 — Estabelecer o contrato REST versionado; 03 — Estabelecer saúde, configuração e logging; 04 — Criar tokens, temas e AppShell acessível.

**Status:** ready-for-agent

- [x] Visitantes podem iniciar e encerrar uma sessão usando a instância de desenvolvimento configurada.
- [x] Rotas protegidas encaminham visitantes não autenticados ao fluxo correto sem expor conteúdo privado.
- [x] A API rejeita token ausente, inválido, expirado ou emitido para uma origem não autorizada com Problem Details seguro.
- [x] A API deriva o User somente do token verificado e ignora identidade declarada em body, query ou headers não confiáveis.
- [x] O User autenticado consegue consultar sua identidade pela API usando o cliente gerado.
- [x] O percurso de autenticação possui cobertura no seam HTTP e no seam Playwright adequado ao ambiente de teste.
