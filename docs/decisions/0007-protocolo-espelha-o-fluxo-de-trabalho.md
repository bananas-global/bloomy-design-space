# 0007 — Protocolo espelha o fluxo de trabalho do monólito

## Contexto

A aplicação de protocolo mostrava todas as áreas e questões simultaneamente em
uma pilha de cards. Esse arranjo preservava os dados, mas não o modo como o
Bloomy é usado: no sistema real a pessoa escolhe uma área, trabalha em uma
questão por vez e alterna entre a questão e a visão geral daquela área.

A referência é
`lib/bloomy_web/backoffice/live/protocols_live/components/patient_protocol.ex`
do monólito.

## Decisão

A tela de aplicação usa a mesma anatomia do sistema:

- painel esquerdo com nome do protocolo, progresso e áreas;
- uma questão em foco no painel direito;
- navegação anterior/próxima e alternância entre questão e lista;
- rodapé fixo com a ação “Voltar”.

As regras próprias da especificação — explicitar que progresso mede
preenchimento, retomar no primeiro item sem resposta e respeitar a faixa de cada
item ABLLS-R — continuam visíveis dentro dessa anatomia.

## Consequência

Uma jornada que compara faixas ABLLS-R precisa navegar entre questões, em vez
de esperar duas configurações simultaneamente na tela. A visão passa a reproduzir
o trabalho real sem perder os critérios verificáveis do cenário.
