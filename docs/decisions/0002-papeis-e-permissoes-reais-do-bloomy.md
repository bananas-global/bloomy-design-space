# 0002 — Papéis e permissões vêm do monólito, não de arquétipos

**Data:** 2026-08-01
**Status:** aceita
**Contexto:** início do porte do sistema real para o Design Space

## Decisão

As personas do Bloomy Design Space passam a ser os dez papéis que existem no
campo `roles` de `Bloomy.Backoffice.User`, com os rótulos que o produto mostra e
com as permissões derivadas das vinte e seis policies do monólito.

A matriz não é escrita à mão. `scripts/gen-permissions.mjs` guarda a tradução das
policies e emite `src/personas/permissions.ts`; `src/personas/index.ts` só
acrescenta objetivo e descrição.

## O que havia antes

Cinco personas inventadas — recepcionista, recepcionista líder, profissional de
saúde, analista financeiro e gestora da unidade — com permissões plausíveis
(`agenda.cancel`, `claims.retry`, `patients.record.restricted`) que não existem
no produto.

Elas descreviam uma clínica genérica. O Bloomy é um sistema de terapia ABA para
autismo: programas, protocolos, fases de aquisição, aplicadores sob supervisão,
planos de intervenção comportamental. Nenhum dos cinco arquétipos correspondia a
um papel real, e três das permissões citadas não existiam em lugar nenhum.

## O que muda no comportamento descrito

Trocar as personas mudou o que os cenários afirmam, e isso é o ponto:

- **A recepção cancela.** `SchedulePolicy` dá `cancel`, `edit` e `revert` a
  coordenador, admin e recepção. A distinção entre "recepcionista" e
  "recepcionista líder" não existia no produto — foi inventada aqui. Quem de fato
  não cancela é quem atende, e `agenda.cancel-no-permission` passou a ser a
  terapeuta.
- **Cancelar e reagendar caem juntos.** As duas permissões têm exatamente a mesma
  lista de papéis. O cenário antes prometia que reagendar continuaria disponível
  para quem não pode cancelar; era falso. A tela de atendimento foi corrigida: o
  campo de horário agora respeita `schedules.edit` em vez de ficar sempre
  operável.
- **A recepção não vê o financeiro.** `authorizations.hub` é de admin, admin de
  clínica e operação. Quem atende o telefone do convênio o dia inteiro não alcança
  a central de autorizações.
- **Prontuário restrito virou tipo de documento.** No monólito a pergunta é
  `can?(role, :can_view_document, tipo)`. Só `:clinical` tem cláusula permissiva;
  `:personal` e `:administrative` caem no `false` final e ninguém os vê.

## Três divergências registradas, não reproduzidas como intenção

Derivar em vez de transcrever expôs coisas que merecem revisão com o time. Estão
reproduzidas fielmente na matriz, e anotadas aqui para que ninguém as leia como
desenho pretendido.

1. **`UnitPolicy.can?(role, :list)` compara com `"admin_clinic"`.** O papel se
   chama `clinic_admin`. A string invertida não corresponde a papel nenhum, então
   o admin de clínica não consegue listar unidades. Tem cara de erro de digitação
   com efeito de permissão.

2. **Metade das policies concede por lista negativa.** `role not in ~W(...)`
   libera por omissão para qualquer papel que o autor não considerou. É por isso
   que `people` — explicitamente barrado de listar e de abrir paciente — aparece
   com permissão de ver visão geral, serviços e financeiro do paciente. São
   permissões mortas hoje, porque outra policy bloqueia antes; passam a valer no
   dia em que alguém der `patients.list` a `people`.

3. **`patients.see_behavior_intervention_plan` exclui quem conduz.** A lista
   negativa remove `therapeutic_companion` e `specialist`, e não remove
   `applicator`. Quem executa a intervenção não vê o plano; quem aplica sob
   supervisão, vê.

Há ainda uma quarta observação, de outra natureza: a Central de Autorizações
verifica `view_authorization_hub` na entrada da tela, e nenhuma das ações internas
— adicionar autorização, editar agendamento, abrir token — tem verificação
própria. Não é divergência de tradução; é superfície sem policy.

## Consequências

- `src/personas/permissions.ts` é gerado. Editar à mão é perder a rastreabilidade
  que justifica a decisão. Para mudar, mude o script e rode
  `node scripts/gen-permissions.mjs src/personas/permissions.ts`.
- Os ids de permissão passam a ser `recurso.acao`, casando com o módulo da policy
  e o átomo do `can?/2`. Quem for conferir contra o Elixir acha a linha.
- Papéis são acumuláveis: `roles` é bitwise no monólito. Nenhuma tela deve
  perguntar "qual é o papel desta pessoa" — só "esta pessoa tem esta permissão".
- Existe um papel `app` em `ClinicalHourRecordPolicy` que não é pessoa, e por isso
  não virou persona.
