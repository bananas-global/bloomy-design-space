# 0018 — A transferência é parcial, e a seleção disputa consigo mesma

**Data:** 2026-09-09
**Situação:** proposta

## Contexto

Quando um profissional é inativado, ou quando a escala dele muda, os mapas de
horas dos pacientes dele não somem: ficam sem responsável, continuam gerando
agendamentos que ninguém atende, e ninguém tem uma lista deles.

O monólito sabe transferir **um agendamento**. Existe `Notify.notify/4` para
"agendamento transferido", e ela é uma das quatro notificações do sistema
inteiro — ver o achado 21 do log do porte. O que não existe é o movimento que a
coordenação faz de verdade: pegar os mapas de uma pessoa e distribuí-los entre
quem sobra. Hoje isso é feito mapa a mapa, na tela do paciente, com a lista de
quem falta anotada num papel.

O desenho vem de "Bloomy — Central de Transferências", do projeto de design
`backoffice bloomy`.

**A unidade de movimentação é o mapa de horas, não o agendamento.** É a decisão
que carrega a área. O mapa é o desenho da semana pretendida do paciente —
segunda às 8h com a Marina, quarta às 8h também —, e é ele que a agenda
materializa ao longo da vigência. Mover agendamento a agendamento resolveria a
semana que vem e deixaria a seguinte igualmente órfã.

## Decisão

**A área entra como `proposed`, com dois cenários, e por isso entra na suíte
automatizada.** É trabalho ativo, não referência importada.

Os dois cenários dividem o caminho do desvio. `transfers.queue` é a movimentação
inteira — selecionar, escolher destino, simular, aplicar, e descobrir no meio do
caminho que ela é parcial. `transfers.cross-specialty` é a única coisa que a
área proíbe: sair da especialidade sem dizer por quê.

Não são três nem sete. A lista de mapas, a grade da semana e o bloco-resumo do
horário lotado são leituras da mesma situação, e quem abre a área para
movimentar uma inativação passa pelas três em sequência. Separá-las em cenários
próprios descreveria três telas onde há uma.

### 1. A seleção disputa consigo mesma

É o achado da área, e é o que separa esta tela de uma lista de verificações
independentes.

Numa unidade em que trinta e cinco sessões começam às 08:00 de terça, avaliar
cada mapa isoladamente contra a agenda de quem recebe diz "cabe" trinta e cinco
vezes. A coordenação aplica, a agenda gera trinta e quatro conflitos, e o erro
só aparece depois de os responsáveis já terem sido avisados da troca.

`evaluateBatch` acumula a ocupação que a própria seleção cria no destino: o
primeiro mapa de um horário cabe, os seguintes disputam com ele. Duas
consequências que não são óbvias e têm teste próprio:

- **A ordem de avaliação é declarada**, e não a dos cliques: dia da semana, hora
  de início, nome do paciente. Ela decide **qual** mapa cabe. Fosse a ordem da
  seleção, duas pessoas com a mesma seleção veriam resultados diferentes, e
  reordenar a lista mudaria a simulação.
- **Mapa recusado não reserva horário.** Ele vai para outro destino na rodada
  seguinte; reservar por ele empurraria um terceiro mapa para fora sem motivo.

### 2. A transferência é parcial por natureza

Aplicar uma rodada move só o que cabe. O que não coube **continua selecionado**,
na fila, e a tela pede o próximo destino.

Uma pessoa inativada deixa vinte mapas e ninguém os absorve sozinho: a
movimentação real é uma sequência de destinos, não uma escolha. Com
aplicar-tudo-ou-nada, a coordenação teria de desmarcar à mão o que não coube
para tentar o destino seguinte — e é exatamente aí que um mapa é esquecido,
porque o que sobra não está em lista nenhuma. Mantendo o resto selecionado, a
fila **é** a lista, e ela só some quando acabou.

A fixture fecha em três rodadas de propósito: Marina, Bruno e Clara têm a terça
das 8h livre uma vez cada, e é isso que torna o fim do fluxo demonstrável.

### 3. Fora da escala não é conflito de agenda

“Não cabe” e “Não cabe junto” são frases diferentes porque pedem ações opostas
de pessoas diferentes.

Fora da escala, quem resolve é quem monta a agenda padrão do profissional — e
nenhum outro destino da mesma especialidade vai ajudar se o problema for a terça
de manhã inteira. Disputado, quem resolve é a própria coordenação, escolhendo
outro destino para aquele mapa, o que é uma rodada a mais e não uma conversa.

A ordem das verificações é parte da regra: fora da escala se pergunta primeiro.
Invertida, um horário em que o destino não trabalha apareceria como "já ocupado
por" — o paciente errado, na frase errada.

### 4. Sair da especialidade é um ato, sempre

A troca é entre profissionais da mesma especialidade. Sair dela exige a marcação
explícita e um motivo escrito, que fica no histórico do mapa.

**O mínimo do motivo é dez caracteres, e não cinco.** O desenho aceita cinco, e
cinco aceitam "urgen". O texto é lido meses depois por quem audita a
transferência: quem escreve está com pressa, quem lê não tem mais ninguém a quem
perguntar.

**A tela não marca a exceção sozinha quando não há alternativa.** Foi a mudança
mais tentadora de fazer: a única psicopedagoga da unidade não tem par, então por
que pedir um clique? Porque sair da especialidade é decisão clínica, e a tela
que a toma sozinha transforma um desvio em consequência de um filtro. Sem par, a
tela **diz** que não há par; abrir as outras especialidades continua sendo um
ato.

Bloqueado, o botão Simular continua visível e na ordem de foco, com o motivo em
`aria-describedby` — decisão 0003 do motor.

### 5. Mover um mapa move a sala

A simulação mostra o saldo de horas por sala antes de aplicar. Mapa não é só
gente, é lugar: a transferência que cabe na agenda do profissional pode não caber
na sala dele, e a coordenação só descobriria isso quando a alocação devolvesse os
horários sem sala para o Mapa da Unidade.

Os dois lados nem sempre se anulam: mapa sem profissional não libera sala
nenhuma, porque já não tinha uma.

### 6. Mapa sem profissional fica na mesma lista

Uma tela separada para "mapas órfãos" só seria procurada por quem já soubesse que
eles existem — e quem sabe é quem inativou o profissional na semana passada. Na
mesma lista, eles são encontrados por quem abriu a área para outra coisa, que é
como estes mapas de fato aparecem.

A busca alcança o nome de quem **deixou** o mapa, e não só o de quem o detém: é a
consulta que a movimentação por inativação faz de verdade.

São três origens, e a fixture tem as três: inativação, escala alterada, e mapa
criado sem ninguém — esta última é a que não tem a quem apontar, e por isso
aparece sem nome.

## O que mudou do desenho

Quatro coisas, e as quatro são obrigação deste repositório.

**A data de referência é declarada.** O desenho fixa `2026-08-21` numa constante
do módulo e usa a mesma data como `min` do campo de vigência. Aqui ela vem de
`data.today`: é ela que decide a primeira vigência aceita, e `pnpm test` roda a
qualquer hora.

**Não há botão de "volume real".** O desenho traz um interruptor que gera uma
semana cheia para demonstração, com nomes montados em laço e uma fração de mapas
órfãos escolhida por resto de divisão. Volume é dado de cenário: a fixture já
traz o horário lotado — oito mapas na terça das 8h, de quatro especialidades —, e
ele é o mesmo em toda execução. Oito já passa do limite de três faixas da grade,
que é o comportamento a especificar; trinta e cinco seriam trinta e cinco linhas
de fixture para provar a mesma coisa.

**A cor não identifica o profissional.** O desenho gera um matiz por pessoa a
partir do índice dela na lista. Cor gerada não passa por `src/tokens/contrast.ts`,
que é onde os pares deste produto são medidos, e nove matizes gerados seriam nove
pares que ninguém declarou. O bloco já traz o nome escrito; o que a cor distingue
é o que ela precisa distinguir — mapa com responsável, mapa sem, mapa
selecionado.

**A altura da hora subiu de 54 para 72 pixels.** Em 54, o bloco-resumo de uma
faixa de uma hora corta as próprias etiquetas. A maior parte dos mapas da clínica
é de uma hora, então é o caso comum que decide. E as etiquetas do bloco-resumo
quebram linha em vez de cortarem no meio: uma etiqueta cortada deixa um número
solto, que não diz nada. A primeira é a acionável — quantos mapas estão sem
profissional —, e a contagem por especialidade inteira está no `title` e na
lista que o bloco abre.

## Os defeitos que a tela encontrou nos espelhos

A área tem quatro filtros rotulados na primeira tela, e foi a primeira situação
**ativa** a mostrar campo com rótulo visível — os cenários `ported` não entram na
varredura do axe. Três defeitos apareceram na primeira execução, e os três são
de componentes compartilhados.

**`label/1` usava o ciano de assinatura como texto sobre branco: 2,22:1.** A
correção já estava escrita na decisão 0001 — `#58bada` é cor de marca, permanece
em superfície escura, e deixou de ser cor de texto; para isso existe
`--color-action`. Ela não tinha chegado ao componente. Corrigido em `Label`, nos
três `legend` de `Choice.tsx` e no rótulo do `FakeInput`. A hierarquia do original
é preservada inteira: continua azul, continua em negrito. O que mudou é o tom, e
o par está declarado em `src/tokens/contrast.ts`.

**O `prompt` do `select/1` saía a 60% sobre o fundo do campo: 3,75:1.** O par
declarado media contra branco, e o fundo real é o mesmo navy a 10%. Subiu para
72%, que é o alfa que a decisão 0001 já fixou para texto secundário, e sobre este
fundo entrega 5,25:1. O par novo está declarado.

**`button/1` reprova em duas variantes**, e essas **não** foram corrigidas: o
primário (branco sobre o ciano, 2,22:1) e o `outline` azul (`--color-blue` como
texto sobre branco, 2,47:1). O componente é espelho, de 0015, e os pontos de uso
levam `espelho-do-sistema`, como já fazem os treze da gestão de chamadas.

A diferença é que agora os números estão medidos: `tests/e2e/contraste.spec.ts`
ganhou um segundo teste, que mede os dois pares no navegador e falha se algum
mudar. O arquivo já dizia que "excluir sem medir seria esconder"; para o `Button`
isso ainda não valia.

**Fica registrada a tensão.** A decisão 0001 corrigiu os tokens; a 0015 espelhou
`button/1` com as cores do sistema. Enquanto as duas convivem, o rótulo de campo
está corrigido e o botão está medido — e o dia em que alguém corrigir o `Button`,
o teste falha e as marcações de espelho saem junto.

De passagem, dois defeitos da tela nova, achados pelas varreduras que já existiam:
as caixas de seleção estavam a 16px e subiram para 24, o mínimo da WCAG 2.5.8 e o
tamanho do `checkbox` do próprio sistema; e nome de pessoa passou a quebrar em vez
de ser cortado, exceto nos blocos da grade, que têm altura fixa e carregam o nome
inteiro no `title` e no nome acessível.

## Consequências

- Seis regras declaradas, todas com implementação em `src/rules/transfers.ts` e
  teste em `tests/rules.test.ts`.
- Uma fixture, `transfers-week`, com dezessete mapas e seis sem profissional. O
  elenco é o da supervisão — as mesmas crianças e os mesmos profissionais.
- Cinco testes de comportamento em `tests/e2e/transferencias.spec.ts`, mais o
  deep link e o axe que `active-journey.spec.ts` dá a todo cenário ativo.
- `AcaoIndisponivel` existe agora em duas telas, copiado. São quatro atributos de
  `<button>`, não um componente do sistema, e `components/bloomy/` é espelho do
  monólito. Quando uma terceira tela precisar dele, é hora de decidir onde mora.
- A área é proposta: se a engenharia for construí-la, o par mapa → agendamento é
  a parte que exige decisão de produto, porque o que a simulação promete é sobre
  o mapa e o que a família sente é o agendamento.

## Alternativas descartadas

**Avaliar cada mapa isoladamente e avisar depois.** É o que uma implementação
ingênua faz, e é o que a regra 1 existe para impedir. O aviso "depois" chega
depois da agenda gerada.

**Aplicar tudo ou nada.** Simplifica a tela e devolve o trabalho à coordenação em
forma de lista mental.

**Uma tela separada para mapas sem profissional.** Descartada pela regra 6: ela
só seria aberta por quem já sabe o que vai encontrar.

**Marcar a exceção sozinha quando não há profissional da especialidade.** Poupa
um clique e apaga a decisão. Descartada pela regra 4.
