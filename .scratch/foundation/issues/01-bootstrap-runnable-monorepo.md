# 01: Inicializar o monorepo executável

**What to build:** uma experiência de clone em que o mantenedor instala dependências e inicia web, API, worker, PostgreSQL e Redis, vendo a aplicação pública confirmar que a API está disponível.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] Uma instalação limpa e determinística funciona com a versão documentada do Node.js e com o lockfile.
- [ ] Um comando documentado inicia a infraestrutura local e os três processos da aplicação.
- [ ] Configuração obrigatória ausente ou inválida interrompe o startup com uma mensagem acionável.
- [ ] A página pública consulta um health check real da API e apresenta os estados disponível e indisponível.
- [ ] Web, API e worker compilam independentemente sem compartilhar modelos de persistência ou serviços de domínio.
- [ ] Um smoke test automatizado comprova o percurso web → API durante desenvolvimento local.
