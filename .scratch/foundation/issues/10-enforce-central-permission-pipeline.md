# 10: Aplicar a pipeline central de Permissions

**What to build:** uma operação real de configuração da Organization é autorizada por uma política central, demonstrando comportamentos distintos para Owner, Admin e Member.

**Blocked by:** 09 — Alternar a Active Organization com segurança.

**Status:** ready-for-agent

- [x] Permissions têm identificadores centrais e não dependem de comparações de Role espalhadas pela aplicação.
- [x] A operação avalia identidade, Active Organization, Membership ativa, estado da Organization, Capability, Permission e invariantes do recurso na ordem acordada.
- [x] Owner e Admin executam somente as ações concedidas pela matriz padrão; Member recebe Forbidden consistente.
- [x] Permissions de billing, ownership e Organization Deletion permanecem exclusivas de Owner mesmo antes desses módulos existirem.
- [x] Controles do frontend refletem a política para UX, mas requisições forjadas continuam negadas pela API.
- [x] Testes HTTP cobrem permissão concedida, ausente, Membership suspensa e contexto organizacional incompatível.
