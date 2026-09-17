# 12: Gerenciar o ciclo de Memberships

**What to build:** administradores autorizados promovem, suspendem, restauram ou removem Memberships, enquanto ownership e histórico permanecem protegidos.

**Blocked by:** 11 — Convidar e integrar uma Membership.

**Status:** ready-for-agent

- [x] Owner pode alterar Roles e administrar qualquer Membership respeitando a regra do último Owner.
- [x] Admin pode administrar Memberships não-Owner, mas não promover para Owner nem modificar Owner existente.
- [x] Membership Suspension revoga acesso imediatamente, preserva histórico e pode ser revertida.
- [x] Membership suspensa não é tratada como ativa nem como futura consumidora de Seat.
- [x] O último Owner não pode sair, ser removido, suspenso ou demovido sem outro Owner ativo.
- [x] User removido ou que saiu perde acesso sem apagar dados da Organization criados anteriormente.
- [x] UI, API e testes apresentam resultados coerentes para cada transição autorizada ou negada.
