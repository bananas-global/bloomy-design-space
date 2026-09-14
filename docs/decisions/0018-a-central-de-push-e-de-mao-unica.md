# 0018 — A Central de PUSH é de mão única

**Data:** 2026-09-08
**Situação:** proposta

## Contexto

O Bloomy notifica para dentro. `notifications` tem quatro remetentes, todos
internos — agendamento assumido, agendamento transferido, agendamento atrasado e
menção no chat multidisciplinar —, e nenhum deles fala com a família. Não há
schema de comunicado, token de push, pesquisa nem worker de disparo. O porte de
2026-08 não encontrou porque não existe.

O que existe hoje é o WhatsApp da recepção. Ele funciona, e é exatamente por isso
que a lacuna passa despercebida: o aviso sai, alguém responde, e a clínica supõe
que o resto leu. A conta chega no dia do feriado, na forma de uma família na
porta fechada — e não há como saber, antes disso, quantas famílias estão nessa
situação.

O desenho — "Bloomy — Central de PUSH", no projeto de design — resolve isso com
três abas: comunicados, NPS e a biblioteca de modelos e segmentos. Este
documento registra o que mudou na travessia para cá, e o que ficou de fora.

## Decisão

**A área é de mão única, e isso é do desenho.** A família lê, visualiza e, quando
pedido, confirma a ciência. Não responde. Uma caixa de duas pontas seria outro
produto — fila de atendimento, prazo de resposta, quem responde fora do horário —
e o Bloomy já tem esse produto: é o chat multidisciplinar, que é interno.

**Entrega, visualização e ciência são três coisas separadas.** No WhatsApp elas
são o mesmo tique cinza-azul, e é essa fusão que impede a clínica de saber quem
leu o aviso de feriado. Separadas, cada uma tem uma ação diferente do outro lado:
falha de entrega é telefone da recepção, falta de visualização é reenvio, falta
de ciência é cobrança.

**O público é uma definição, não uma lista.** Um comunicado agendado guarda o
filtro ou o segmento, e o conjunto de destinatários é recalculado no disparo — a
família que se matriculou hoje à tarde recebe o aviso de amanhã. A seleção
manual é a exceção declarada, e ela aparece no cartão e no detalhe justamente
por isso: é a única forma de público que **não** vai ser recalculada.

**Variável sem valor barra o envio.** É o único bloqueio duro da área. O custo do
erro aqui é público e não tem desfazer: a notificação já está no aparelho de
quarenta famílias, com o nome da criança do lado. A variável fica visível entre
chaves — `{data}` — em vez de virar vazio, e o botão continua alcançável pelo
teclado, com `aria-disabled` e o motivo por `aria-describedby`, como manda a
decisão 0006 do motor.

**A pesquisa é uma fila de trabalho.** Um detrator entra com dono e só sai por
tratativa concluída; assumir o contato move o estado e mantém a resposta na fila.
Uma fila que zera no "assumi" mede boa vontade, e o caso mais comum de perda de
paciente é justamente aquele em que alguém ligou uma vez, não conseguiu falar, e
o assunto morreu ali.

**A faixa do NPS é dita por extenso.** Promotor, neutro e detrator aparecem com a
palavra e com a faixa de nota, na legenda e em cada resposta, e a zona do
indicador tem nome. A barra de composição verde-cinza-vermelha é decorativa: tudo
o que ela mostra está escrito ao lado. É a informação mais citada da tela — vai
para reunião e para diretoria — e seria a menos acessível dela.

## O que mudou do desenho, e por quê

**O relógio é declarado.** O desenho carimba o envio com a hora da máquina e
semeia as entregas com um gerador pseudoaleatório. Aqui a hora sai de
`data.now`/`data.today` e as entregas estão escritas na fixture: `pnpm test` roda
a qualquer hora, e uma taxa de visualização que muda sozinha não tem critério de
aceite. É a mesma decisão da gestão de chamadas (0017).

**Doze responsáveis, e não vinte e oito.** O elenco sorteado virou elenco escrito
— o teste de determinismo proíbe gerador dentro de `src/fixtures/`. Doze é o
menor número que ainda dá recorte: duas unidades, dois turnos, cinco operadoras,
quatro terapeutas, dois sem aplicativo e dois com a notificação desligada.

**A prévia no telefone saiu.** O desenho põe um aparelho desenhado ao lado do
composer, com a notificação, o cartão no app e o botão de ciência. O que ele
prova — o texto renderizado com os dados de uma família de verdade — passou a ser
dito logo abaixo do campo de texto. O aparelho ficaria certo numa tela de 1440px
e empurraria o formulário para 300px no telefone, que é a largura em que a
recepção abre isto.

**Um cenário, e não seis.** As perguntas que a área faz e que nenhuma outra tela
do Bloomy responde são duas — *o aviso chegou em quem?* e *a nota baixa virou
tarefa de alguém?* —, e elas nasceram como dois cenários. Na revisão do mesmo dia
os dois viraram um: têm a mesma rota, a mesma fixture e a mesma persona, e o que
os separava era uma aba, que é um clique dentro da situação. As regras, os
anúncios, as pré-condições e os critérios do segundo desceram para dentro do
primeiro — ver "Entrada única no catálogo", no fim.

A biblioteca de modelos e segmentos também não tem cenário próprio: ela é
cadastro reutilizado pelas outras duas leituras, e um cenário para ela
descreveria um CRUD, não uma situação.

## O rótulo da aba, e a conta que a marca de espelho cobra

Duas coisas de contraste, e elas são opostas de propósito.

**O rótulo de `button_tabs/1` foi escurecido, de 60% para 72% do mesmo navy.** A
60% ele dá 3,87:1 sobre o trilho e 3,57:1 sobre o marcador da aba ativa, em 16px
negrito — reprova AA, e o pior dos dois é o da aba **ativa**. A 72% são 5,55:1 e
4,95:1, e os dois pares estão declarados em `src/tokens/contrast.ts`. É a mesma
direção da decisão 0001 e o mesmo movimento que a variante `brand` do `tag/1` já
tinha feito nesta pasta: o tom é o mesmo, muda a opacidade, e ninguém que enxerga
percebe a diferença. Registrado como achado 127 no log do porte.

Sem isso, a única saída era marcar o `ButtonTabs` inteiro como
`espelho-do-sistema` — e como ele envolve o painel, e não só o trilho, a
varredura de axe perderia junto **todo** o conteúdo das três abas.

**O azul do `button/1` e o rótulo azul do `input/1` continuam reprovando, e
continuam marcados.** Branco sobre `--color-brand-blue` dá 2,22:1, e o rótulo
azul sobre branco dá o mesmo. Os dois são o produto: o azul de marca fazendo
trabalho de hierarquia, decidido lá e copiado aqui. Escurecê-los mudaria a
aparência de todo formulário e de todo botão primário do Design Space, e deixaria
de ser espelho.

A marca `espelho-do-sistema` cobra um preço que vale escrever: a varredura exclui
a **subárvore**, então um campo marcado sai inteiro — rótulo, controle e nome
acessível. Por isso `tests/e2e/active-journey.spec.ts` roda, nesta área, uma
segunda passagem de axe **sem** a exclusão e com `color-contrast` desligado. O
que a marca esconde passa a ser só a cor do produto, e não a semântica da tela.

## Consequências

- Uma rota, `/push`, com as três abas como estado da tela e os painéis como
  gavetas por cima. O item de navegação entra no fim do trilho, marcado como
  proposta — não existe no menu do sistema real.
- Seis regras declaradas em `src/rules/push.ts`, todas com implementação e teste
  de unidade; o que não virou regra continua sendo função testada.
- 23 testes de unidade e 12 de jornada, incluindo a segunda passagem de axe, a
  varredura de telas pequenas e a estabilidade das gavetas.
- Três pares de contraste novos em `src/tokens/contrast.ts` — os dois da aba e a
  variante `purple` do `tag/1`, que a etiqueta de segmento passou a usar porque a
  clara dá 4,2:1.
- O `Tabs.tsx` mudou para toda a aplicação. É melhoria de contraste, não de
  layout, e o teste de tokens agora a protege.
- `Switch` e `SwitchCard` mudaram para toda a aplicação: o desligado passou a ser
  roxo escuro a 10%, como no Figma do produto, e o cartão separa texto e controle
  por 24px. Ver "Seleção manual e ajustes do compositor", abaixo.
- O `AppShell` ganhou o acesso ao menu pelo logo, usado abaixo de 768px. O
  comportamento é geral; a regra que o revela é local à Central de PUSH, em
  `src/screens/Push.css`, por consulta de container — o palco do preview é
  estreito sem que a janela seja.

### Filtro de status na fila de NPS — 08/09/2026

Buscar, Faixa e Status ficam abaixo do título e subtítulo da fila. Os três
filtros se combinam. Todos mantém as respostas do recorte; Sem tratativa,
Em contato e Resolvido selecionam somente detratores no estado correspondente.
Uma resposta de detrator sem estado explícito equivale a Sem tratativa, como
na apresentação existente. Neutros e promotores sem tratativa não são pendências.
O filtro não altera o NPS nem a contagem total de detratores em aberto.

As confirmações de ação deixam de ocupar espaço visual no cabeçalho, mantendo
a região `role="status"` sempre montada para leitores de tela.

### Ação de criação estável entre abas — 08/09/2026

As três abas reservam o mesmo espaço para criar: botão de 208 × 48 px ao lado
das abas. Comunicados e NPS abrem seus formulários diretamente. Na biblioteca,
Novo expande Novo modelo e Novo segmento; as ações saem dos cabeçalhos dos cards.
As opções são navegáveis por Tab; Escape fecha e devolve o foco ao botão Novo.

### Dimensões e espaçamento dos drawers — 08/09/2026

Os drawers de PUSH usam largura explícita por tamanho (36, 48 ou 64 rem),
limitada à viewport, em vez de depender da largura intrínseca do conteúdo.
Comunicado e pesquisa mantêm 48 rem ao alternar etapas. Os grupos internos
separam seções por 32 px e campos por 24 px; cabeçalho e rodapé permanecem fixos.
O motivo de bloqueio deixa de aparecer sob o botão, mas continua associado por
`aria-describedby` e disponível para leitores de tela.

### Seleção manual e ajustes do compositor — 08/09/2026

A seleção manual usa checkboxes, busca por nome do responsável ou paciente
(sem distinguir acentos ou maiúsculas) e ações para selecionar/desmarcar os
resultados visíveis. Seleções fora da busca são preservadas. A prévia sai do
compositor; os campos continuam indicando variáveis pendentes e o envio mantém
seu bloqueio e descrição acessível.

Switch e SwitchCard usam roxo escuro a 10% no estado desligado, conforme Figma
Produto, nó 30168:33821, e SwitchCard separa texto e controle por 24 px.
Referência: https://www.figma.com/design/fwEz13dYRrfnnoYlPYfBeU/Produto?node-id=30168-33821

### Central de PUSH em telas pequenas — 08/09/2026

Abaixo de 768 px disponíveis, PUSH retira o menu lateral e mantém um cabeçalho
compacto com unidade e notificações. Abas quebram em linhas, indicadores e
filtros ficam em uma coluna e cartões empilham conteúdo e ações. A regra usa
container query para funcionar também no preview estreito do Design Space.
No celular, drawers usam toda a largura e empilham ações do rodapé, com alvos
de toque de pelo menos 44 px. Alteração local à Central de PUSH.

No mobile, o logo Bloomy no cabeçalho dá acesso ao menu lateral. O menu abre
sobre o conteúdo, sem reduzir sua largura. O foco vai ao destino do menu;
Escape fecha e devolve o foco ao logo. O logo, a área externa e a navegação
também permitem fechar o menu.

### Entrada única no catálogo — 08/09/2026

O catálogo passa a mostrar apenas Central de PUSH (`push.broadcast`). O cenário
separado de detratores foi incorporado a essa entrada, com regras, anúncios,
pré-condições, critérios e jornadas preservados. NPS continua como aba interna.


### Integração com Gestão de Chamadas — 09/09/2026

A Central de PUSH usa o drawer responsivo compartilhado que entrou com Gestão
de Chamadas: o logo abre a navegação sobre o conteúdo abaixo do breakpoint
`desktop` do container. Sai a sobrescrita local do cabeçalho e do drawer em
`Push.css`; permanecem os ajustes do conteúdo de PUSH abaixo de 768 px.
O estado de abertura é único. Escape fecha e devolve o foco ao logo, abrir
leva o foco ao destino e navegar fecha o drawer. As abas preservam o tratamento
responsivo compartilhado e o contraste a 72% introduzido nesta proposta.
