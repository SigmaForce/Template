# 11: Convidar e integrar uma Membership

**What to build:** Owner ou Admin convida uma pessoa para a Organization e o User convidado aceita a Invitation, adquirindo a Membership e o Role esperados.

**Blocked by:** 10 — Aplicar a pipeline central de Permissions.

**Status:** ready-for-agent

- [ ] Owner e Admin podem criar Invitation para Role permitido; Member não pode convidar.
- [ ] Invitation registra Organization, destinatário, Role, expiração e estado sem criar Seat ou Membership antecipadamente.
- [ ] Invitation pode ser reenviada ou revogada, sem duplicar a intenção ativa para o mesmo destinatário.
- [ ] Aceitar uma Invitation válida cria uma única Membership e ativa a Organization correta.
- [ ] Invitation expirada, revogada, já aceita ou destinada a outra identidade falha de maneira segura.
- [ ] O fluxo completo é verificável pela UI e pelo seam HTTP com identidades de teste determinísticas.
