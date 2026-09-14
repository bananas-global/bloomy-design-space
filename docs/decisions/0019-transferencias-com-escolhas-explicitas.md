# 0019 — Transferências com escolhas explícitas

Data: 2026-09-10 · Situação: proposta

A revisão da Central de Transferências mostrou que a seleção mista abria uma
exceção sem marcar o controle, e que a ordem automática decidia qual paciente
receberia um horário disputado. Esta decisão revisa a 0018 nesses pontos.

- O filtro de especialidade da lista delimita a rodada, sem um segundo seletor no painel (revisão de feedback em 10/09). Em “Todas”, a rodada considera toda a seleção e uma seleção mista exige exceção explícita. As outras
  permanecem selecionadas, entram na contagem de pendências e não são aplicadas
  nessa rodada. Trocar o filtro de especialidade limpa destino, exceção e simulação.
- Exceção exige marcação explícita, mesmo se `canSimulate` receber seleção mista.
  A justificativa permanece no registro local da rodada.
- A ordem inicial continua por dia, horário e nome. Na simulação, a coordenação
  pode priorizar um mapa que disputa apenas com a seleção. A simulação inteira
  é recalculada; mapas já pertencentes ao destino reservam seus horários antes
  de qualquer prioridade, evitando dupla ocupação.
- “Sugerir” informa profissional, quantidade que cabe e critérios de desempate.
  Aplicar continua dependendo de uma simulação revisável.
- “Mapa inteiro” passa a “Desde hoje”. A vigência da nova atribuição começa na
  data declarada da fixture ou em data futura, e a data aparece na simulação e
  no registro da rodada. Atendimentos anteriores ou realizados devem permanecer
  com o responsável original. A fixture contém mapas recorrentes, não um livro
  de atendimentos realizados: esta preservação é contrato para o handoff; não
  há integração nem alteração de atendimentos reais neste protótipo.
- Em vez de encerrar apagando pendências, a coordenação pode pausar e retomar
  a seleção e as rodadas na página. A interface informa que recarregar ou sair
  encerra esse estado local; não promete persistência entre visitas.
- O saldo de horas por sala é identificado como saldo, sem afirmar que houve
  validação da ocupação por horário ou realocação automática de salas.

Checkboxes da central têm 16 px, cor de ação existente e foco visível. Os rótulos
preservam a área de clique: a linha do mapa, o item do modal e o seletor geral.
A referência visual consultada foi `input/1` (checkbox) em
`lib/bloomy_web/components/core_components.ex` do monólito, sem alterá-lo.

Verificação: regras em `tests/rules.test.ts`, jornadas em
`tests/e2e/transferencias.spec.ts` e critérios de `transfers.queue`.
