# 02: Estabelecer o contrato REST versionado

**What to build:** um consumidor acessa uma API `/v1` documentada e o frontend usa um cliente TypeScript gerado, recebendo respostas e falhas por contratos estáveis.

**Blocked by:** 01 — Inicializar o monorepo executável.

**Status:** ready-for-agent

- [x] A API expõe um documento OpenAPI reproduzível com identificadores de operação estáveis.
- [x] O frontend consome uma operação real por meio do cliente gerado, sem importar código do backend.
- [x] Falhas seguem RFC 9457 Problem Details e não revelam stack trace ou mensagens internas.
- [x] Uma operação de lista demonstra cursor opaco, limite validado e `pageInfo` sem total obrigatório.
- [x] Datas, IDs, dinheiro, `null` e campos ausentes seguem as convenções definidas na especificação.
- [x] Uma verificação automatizada falha quando o documento OpenAPI e o cliente gerado divergem.
