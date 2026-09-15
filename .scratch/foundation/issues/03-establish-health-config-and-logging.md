# 03: Estabelecer saúde, configuração e logging

**What to build:** operadores distinguem serviço saudável, pronto, degradado ou mal configurado e correlacionam uma requisição entre os processos sem registrar secrets ou PII.

**Blocked by:** 01 — Inicializar o monorepo executável; 02 — Estabelecer o contrato REST versionado.

**Status:** ready-for-agent

- [x] Health e readiness distinguem dependências críticas de integrações opcionais ou degradadas.
- [x] Configuração é validada de forma tipada e falha antes de aceitar tráfego quando uma dependência crítica está inválida.
- [x] Cada requisição recebe ou preserva um correlation ID retornado de forma segura ao consumidor.
- [x] Logs são estruturados em JSON e permitem relacionar serviço, ambiente, requisição e resultado.
- [x] Authorization, cookies, tokens, assinaturas, payloads sensíveis e PII conhecida são redigidos.
- [x] PostHog e Sentry desconfigurados não enviam dados e não impedem startup ou requests.
