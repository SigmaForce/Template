# 03: Estabelecer saúde, configuração e logging

**What to build:** operadores distinguem serviço saudável, pronto, degradado ou mal configurado e correlacionam uma requisição entre os processos sem registrar secrets ou PII.

**Blocked by:** 01 — Inicializar o monorepo executável; 02 — Estabelecer o contrato REST versionado.

**Status:** ready-for-agent

- [ ] Health e readiness distinguem dependências críticas de integrações opcionais ou degradadas.
- [ ] Configuração é validada de forma tipada e falha antes de aceitar tráfego quando uma dependência crítica está inválida.
- [ ] Cada requisição recebe ou preserva um correlation ID retornado de forma segura ao consumidor.
- [ ] Logs são estruturados em JSON e permitem relacionar serviço, ambiente, requisição e resultado.
- [ ] Authorization, cookies, tokens, assinaturas, payloads sensíveis e PII conhecida são redigidos.
- [ ] PostHog e Sentry desconfigurados não enviam dados e não impedem startup ou requests.
