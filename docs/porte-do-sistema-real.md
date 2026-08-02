# Porte do sistema real para o Design Space

Log do trabalho de trazer o Bloomy que existe — o monólito Elixir/Phoenix em
`brucesantos/bloomy` — para dentro desta especificação executável.

Começou em 2026-08-01. Uma branch por módulo, `pnpm check` e `pnpm test:e2e`
verdes antes de cada commit.

## O que o Design Space era antes

Vinte e quatro cenários em três módulos — agenda, pacientes, financeiro —
descrevendo uma clínica genérica. Bom como demonstração do modelo; errado como
descrição do produto.

## O que o Bloomy é

Sistema de gestão de clínicas de **terapia ABA para autismo**. Não é uma clínica
médica genérica, e o vocabulário revela isso: programas com fases de intervenção,
generalização, manutenção e transição; protocolos ABLLS-R; tentativas com ajuda
verbal ou motora; objetivos que passam a adquiridos; aplicadores sob supervisão
formal; planos de intervenção comportamental; mapa de horas do paciente.

Superfície medida em 2026-08-01:

| | |
| --- | --- |
| Contextos de domínio (`lib/bloomy/*/`) | 39 |
| Arquivos web (`.ex` + `.heex`) | 579 |
| Rotas LiveView do backoffice | ~60 |
| Policies | 26 |
| Papéis | 10 |
| Migrações | 455 |
| Portais além do backoffice | 3 — operadora, responsável legal, público |

## Ordem de trabalho

1. **Fundação** — papéis, permissões e vocabulário reais.
2. **Clínico** — atendimentos, na-clínica, protocolos, programas, supervisão,
   prontuário.
3. **Financeiro e TISS** — fechamentos, guias, central de autorizações, operadoras.
4. **Cadastros e administração** — unidades, serviços, colaboradores,
   profissionais, gerência, notificações.
5. **Portais externos** — operadora, responsável legal, público (auto-checkin,
   anamnese, NPS).

## Andamento

### 1. Fundação — `porte/fundacao-papeis-reais`

Concluída.

- As cinco personas inventadas deram lugar aos dez papéis reais, com rótulos do
  `enums.po` do produto: Admin, Admin de Clínica, Recepção, Operação, People,
  Coordenador, Supervisor, Especialista, Terapeuta, Aplicador.
- 104 permissões derivadas das 26 policies por `scripts/gen-permissions.mjs`, que
  emite `src/personas/permissions.ts`. Nada de matriz escrita à mão.
- Os ids de permissão passaram de inventados (`agenda.cancel`, `claims.retry`)
  para os reais (`schedules.cancel`, `authorizations.hub`), casando módulo da
  policy com átomo do `can?/2`.
- Três cenários mudaram de sentido porque a permissão real contradizia o que
  afirmavam. Detalhe na decisão 0002.
- Uma correção de tela: o campo de reagendamento em `AppointmentDetail` não
  consultava permissão nenhuma. Agora respeita `schedules.edit`.

Verde: `pnpm check` e 76 jornadas Playwright.

## Achados sobre o sistema real

Coisas encontradas ao ler o monólito que valem conversa com o time. Não são
bugs do Design Space; são observações sobre o produto.

| # | Achado | Onde |
| --- | --- | --- |
| 1 | `UnitPolicy.can?(role, :list)` compara com `"admin_clinic"`; o papel se chama `clinic_admin`. O admin de clínica não lista unidades. | `lib/bloomy/units/unit_policy.ex:6` |
| 2 | Metade das policies concede por lista negativa (`role not in`), liberando por omissão para papéis não considerados. `people` aparece com permissões de paciente que outra policy bloqueia antes. | várias |
| 3 | `patients.see_behavior_intervention_plan` exclui `therapeutic_companion` e `specialist`, e não exclui `applicator`. Quem conduz a intervenção não vê o plano; quem aplica, vê. | `lib/bloomy/patients/patient_policy.ex:29` |
| 4 | A Central de Autorizações verifica permissão na entrada da tela; nenhuma ação interna — adicionar autorização, editar agendamento, abrir token — tem verificação própria. | `lib/bloomy_web/backoffice/live/authorization_hub/` |
