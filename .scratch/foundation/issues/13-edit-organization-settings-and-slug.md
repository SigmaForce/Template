# 13: Editar configurações e slug da Organization

**What to build:** Owner e Admin autorizados mantêm as configurações básicas da Organization e alteram seu slug sem quebrar links nem transformar o slug em prova de autorização.

**Blocked by:** 05 — Entregar formulários, overlays e feedback; 10 — Aplicar a pipeline central de Permissions.

**Status:** ready-for-agent

- [ ] Configurações suportam nome, slug, billing contact, locale e timezone com validação consistente.
- [ ] Alterar o slug mantém o ID imutável e reserva ou redireciona o slug anterior sem ambiguidade.
- [ ] Seguir um link antigo conduz à Organization correta somente quando a Membership autenticada permite.
- [ ] Member não autorizado não consegue alterar configurações por UI nem por requisição direta.
- [ ] Slugs têm unicidade segura entre Organizations e condições de corrida não criam duplicidade.
- [ ] Logo e custom domain aparecem claramente como capacidades futuras, sem campos parcialmente funcionais.
