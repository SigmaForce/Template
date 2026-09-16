# 09: Alternar a Active Organization com segurança

**What to build:** um User com múltiplas Memberships alterna a Active Organization sem observar ou modificar dados mantidos no contexto anterior, inclusive entre abas.

**Blocked by:** 06 — Entregar componentes de dados e estados de produto; 08 — Criar a primeira Organization pelo onboarding.

**Status:** ready-for-agent

- [x] Um User com Memberships em duas Organizations consegue listar e selecionar ambas.
- [x] Toda chamada protegida usa a Active Organization derivada do token verificado.
- [x] Slug da rota incompatível com a Active Organization é rejeitado ou redirecionado com segurança.
- [x] Trocar Organization invalida ou particiona cache, estado remoto e navegação anterior.
- [x] Requisições concorrentes em abas distintas não utilizam a Organization errada por causa de contexto singleton.
- [x] O seam Playwright demonstra alternância sem vazamento visual ou persistente de dados.
