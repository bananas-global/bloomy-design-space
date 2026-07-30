# 0002 — Ação bloqueada explica o motivo, em vez de desaparecer

**Data:** 2026-07-30
**Status:** aceita

## Contexto

Nove das dez regras deste Design Space bloqueiam alguma ação: cancelar sem
permissão, registrar ausência antes da tolerância, agendar com cadastro
incompleto, reenviar guia sem documentação. Existem duas respostas comuns de
interface: esconder o controle, ou mantê-lo visível e desabilitado com explicação.

Esconder é mais limpo e é o que a maioria dos sistemas faz.

## Decisão

O controle permanece visível e desabilitado, com o motivo na tela e associado ao
botão por `aria-describedby`. O componente `Button` recebe `unavailableReason` —
a prop torna o caminho correto o mais fácil.

O motivo é redigido em linguagem de operação, não de sistema:

- ✅ "Seu perfil não cancela atendimentos. Peça à recepção líder."
- ✅ "A tolerância é de 15 minutos. Faltam 7 para poder registrar ausência."
- ✅ "Falta anexar: Relatório clínico assinado, Laudo do exame anterior."
- ❌ "Permissão insuficiente."
- ❌ "Ação indisponível."

## Raciocínio

Ação que desaparece sem explicação torna a regra de negócio invisível. Em clínica,
o efeito prático é observável no balcão: a recepcionista conclui que o sistema
está com problema, ou pede a alguém com outro login para "tentar aí". A regra
existe e ninguém a aprende pela interface.

Há também um efeito no handoff. Quando o protótipo esconde a ação, a engenharia
não tem como saber se ela deveria estar oculta, desabilitada, ou ausente do
backend — e escolhe por conta. Manter visível com motivo torna a regra parte da
especificação em vez de parte da suposição.

O terceiro motivo é o mais concreto: dizer **quantos minutos faltam** ou **quais
documentos faltam** transforma um bloqueio em uma instrução. A pessoa sai da tela
sabendo o próximo passo, em vez de sabendo que não pode.

## Consequências

- Toda ação condicional precisa de um motivo redigido. É trabalho de conteúdo, e é
  deliberado.
- O motivo é anunciado por leitor de tela junto do botão, então a informação não é
  exclusiva de quem vê a tela.
- Os testes de jornada verificam o texto do motivo, não só o estado desabilitado.
  Um botão desabilitado com motivo genérico passaria em um teste que só checasse
  `toBeDisabled()`.

## Exceção aplicada

O drawer de navegação **esconde** módulos que a persona não alcança: a analista
financeira não vê "Agenda". A diferença é entre "você não pode agora" e "isto não
é para você" — um item de menu permanentemente indisponível é ruído, e ensina a
clicar em algo que sempre falha.
