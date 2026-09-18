# 01: Inicializar o monorepo executável

**What to build:** uma experiência de clone em que o mantenedor instala dependências e inicia web, API, worker, PostgreSQL e Redis, vendo a aplicação pública confirmar que a API está disponível.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [x] Uma instalação limpa e determinística funciona com a versão documentada do Node.js e com o lockfile.
- [x] Um comando documentado inicia a infraestrutura local e os três processos da aplicação.
- [x] Configuração obrigatória ausente ou inválida interrompe o startup com uma mensagem acionável.
- [x] A página pública consulta um health check real da API e apresenta os estados disponível e indisponível.
- [x] Web, API e worker compilam independentemente sem compartilhar modelos de persistência ou serviços de domínio.
- [x] Um smoke test automatizado comprova o percurso web → API durante desenvolvimento local.
