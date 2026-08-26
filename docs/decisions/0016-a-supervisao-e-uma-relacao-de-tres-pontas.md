# 0016 — A supervisão é uma relação de três pontas

**Data:** 2026-08-24
**Revisada em:** 2026-08-26 — ver "A segunda passada visual", no fim.
**Situação:** proposta

## Contexto

A tela de Supervisão do sistema real responde uma pergunta: *o que os
supervisionados **deste** supervisor atenderam.* Ela é uma lista de supervisores
e, ao lado, uma tabela de agendamentos — serviço, profissional, paciente, sala,
horário e situação.

As perguntas que chegam à coordenação são três, e duas delas entram pelo outro
lado da relação:

1. *De quem é a assinatura que está travando o fechamento?* — entra pelo
   supervisor, e a tela atende.
2. *Quem supervisiona quem atende esta criança?* — entra pelo paciente. É a que
   mais chega, porque é a família que liga, e não tem por onde entrar: o caminho
   é abrir supervisor por supervisor até achar quem atende.
3. *Este aplicador foi supervisionado alguma vez?* — entra pelo aplicador, e não
   tem resposta em nenhuma tela do produto. A supervisão que **não** aconteceu
   não deixa registro, então não entra em fila nenhuma.

O porte já registrou três problemas dessa tela — o período padrão que só olha
para trás, a coluna de estado da supervisão que falta, e a supervisora sem
vínculo que desaparece. Eles continuam válidos e continuam em `/supervision`,
com as cinco situações portadas. Esta decisão é sobre a forma, não sobre eles.

## Decisão

**Três colunas que se filtram nos dois sentidos: Supervisores, Aplicadores,
Pacientes.** Sem nada selecionado, as três mostram tudo. Selecionar em qualquer
uma encolhe as outras duas — do supervisor para os aplicadores e os pacientes
deles; do aplicador para o supervisor dele e os pacientes dele; do paciente para
quem o atende e para quem supervisiona quem o atende. Um painel à direita reflete
o item mais específico selecionado.

O sentido inverso é o ponto todo. Sem ele, a pergunta 2 continua sem porta, e o
caminho mais curto para respondê-la volta a ser perguntar no corredor.

**Uma seleção nova apaga as seleções que deixaram de valer.** Escolher um
paciente que o aplicador selecionado não atende limpa o aplicador; escolher um
aplicador revela o supervisor **dele**, em vez de manter o anterior. Manter as
duas produziria interseção vazia, e a tela diria "nenhum resultado" quando o que
houve foi filtro incompatível — o pior tipo de vazio, porque descreve os dados
quando o problema está na pergunta.

**A fila de assinaturas e os três indicadores seguem o escopo do supervisor.**
Com um supervisor selecionado, contam a carteira dele; sem nada, a equipe. Um
número da equipe inteira ao lado de uma coluna já filtrada é lido como sendo do
filtro, e quem coordena decide a partir dele.

O escopo é o supervisor e **não** as outras duas colunas, de propósito: os
indicadores respondem por uma carteira de supervisão, e refazê-los a cada clique
faria três números piscarem a cada refinamento da pergunta sem que nenhum deles
fosse a resposta.

**O lote não assina em lote.** Ele abre um atendimento por vez, com as tentativas
corretas de cada programa, a observação de quem aplicou e os registros ABC à
vista, e cada assinatura é um ato. A segunda assinatura afirma que alguém leu o
registro; um botão que assine trinta de uma vez transforma essa afirmação em
carimbo, e o efeito aparece meses depois — quando o convênio glosa e ninguém sabe
dizer o que foi conferido.

Pular deixa o atendimento na fila, e o resumo final diz quantos ficaram. Pular
não é recusar e não é assinar, e as três coisas precisam ser distinguíveis.

**Quem abre a tela supervisionando entra com o escopo travado.** A coluna de
supervisores não aparece — não há o que escolher —, as outras duas nascem
filtradas pelos vínculos dele, e limpar os filtros volta para esse escopo em vez
de abrir a clínica.

**Uma permissão por coluna, e nenhuma pergunta pelo papel.** Não existe uma
permissão da tela. `list_supervisor` dá a coluna de supervisores,
`professionals.list` — ou o próprio vínculo de supervisão — dá a de aplicadores, e
`patients.list` dá a de pacientes. Com menos de duas não há relação a navegar, e a
tela manda para onde a pergunta que sobrou é respondida.

A matriz sai das policies, não de arquétipo:

| Papel | Supervisores | Aplicadores | Pacientes | O que vê |
| --- | --- | --- | --- | --- |
| Admin, Admin de Clínica, Coordenador | ✓ | ✓ | ✓ | as três colunas |
| Recepção | — | ✓ | ✓ | duas colunas, sem trava — a clínica inteira |
| Supervisor **com vínculo** | — | ✓ pelo vínculo | ✓ | duas colunas, travado na própria carteira |
| People | — | ✓ | — | não abre → Profissionais |
| Operação | — | — | ✓ | não abre → o clínico não é dela |
| Especialista, Terapeuta, Aplicador | — | — | ✓ | não abre → a assinatura é pedida no atendimento |
| Supervisor **sem vínculo** | — | — | ✓ | não abre → a tela abre quando o primeiro vínculo existir |

Três consequências que valem explicitar:

- **A recepção ganhou a tela**, com duas colunas. "Quem atende esta criança?" é a
  pergunta dela, chega pelo telefone, e ela alcança profissional e paciente. O que
  ela não alcança é de quem é a responsabilidade — e a tela diz isso em vez de
  esconder a coluna sem explicação.
- **É o vínculo que abre a tela para quem supervisiona, não o cargo.** O
  supervisor recém-designado, sem ninguém, não abre — é a regra
  `supervisor-is-derived-from-links` outra vez, agora do lado de quem entra.
- **A trava só alcança quem não tem o que escolher.** Quem lista supervisores e
  também supervisiona alguém continua escolhendo, porque para ela a coluna existe.

### O único lugar em que esta tela pergunta pelo papel

Ter um vínculo de supervisão **não é permissão, é cadastro**: no monólito é uma
linha de `supervisor_internships` apontando para a sua ficha de profissional, e
nenhuma das vinte e seis policies a expressa. Medido: nenhuma permissão separa
quem supervisiona de quem é supervisionado nas três que interessam aqui —
supervisor, especialista, terapeuta e aplicador têm exatamente o mesmo alcance
sobre `list_supervisor`, `professionals.list` e `patients.list`.

Então a pergunta é de **identidade**, não de autorização, e neste ambiente a
identidade de quem abre é a persona escolhida no painel. A fixture diz qual
supervisor o visitante seria — `viewerSupervisorId` —, e a regra só honra esse
campo quando a persona é a de quem supervisiona.

É a mesma exceção de `visibleTabs/1` em `src/rules/inClinic.ts`, e pelo mesmo
motivo: o produto decide por papel, o porte reproduz isso **isolado numa função,
com nota**, em vez de espalhar pela tela.

O atalho tentador era usar uma permissão exclusiva do supervisor como proxy —
`patients.see_hour_maps`, `patients.create_content` ou
`behavior_intervention_plans.discard`, as três que ele tem e os supervisionados
não. Recusado: elas existem por outro motivo, e no dia em que o mapa de horas
mudar de dono a Supervisão mudaria de comportamento sem ninguém entender por quê.

Sem essa separação o campo escorreria: o aplicador, que divide as mesmas
permissões, herdaria a carteira do supervisor, e a recepção — que alcança a
clínica inteira — apareceria travada nela. Há teste para as duas coisas.

### O que isto custa

**A visão travada depende de mudar a permissão.** `list_supervisor` é de admin,
admin de clínica e coordenação; o papel `supervisor` não está lá. Hoje ele não
abre a tela — é a regra `supervision-screen-is-not-for-the-supervisor`, e ela
continua valendo em `/supervision`.

A tela **não** diz isso. Uma primeira versão trazia um aviso de três linhas no
topo, e ele foi removido: a carteira travada se explica sozinha — não há coluna de
supervisores, o cabeçalho do painel diz o nome de quem é a carteira, e os números
são os dela. O aviso repetia isso e empurrava a tela para baixo em todo
carregamento.

O custo é fato de **especificação**, não recado de tela: mora aqui e no
`rationale` da regra, que é onde quem decide vai procurar. É a única forma de a
Supervisão servir a quem supervisiona sem lhe entregar a clínica inteira, que é o
que a permissão de listar supervisores concede.

## O que divergiu do desenho, e por quê

O desenho recebido é um recorte isolado, em React sobre o CSS do backoffice.
Catorze divergências deliberadas.

**Papel é um dos dez do produto, não a especialidade usada como cargo.** O
desenho traz `role: "Fonoaudióloga"`, `"Psicopedagoga"`, `"Terapeuta Ocup."` e
`"Acompanhante Terapêutico"`. Nenhum é papel do Bloomy: quem atende dentro de uma
especialidade é **Especialista**, e a especialidade fica no campo dela. Sem isso a
coluna do meio inventa quatro arquétipos que o sistema de permissões não conhece
— e é a lista de papéis que decide quem assina o quê.

**A revisão abre num drawer, não num diálogo centrado.** O registro de um
atendimento tem quatro campos de cabeçalho, um cartão por programa, a observação e
os registros de comportamento — conteúdo que rola. Num `modal/1` as ações rolavam
com ele: quem chegava ao fim do ABC não tinha mais "Assinar e avançar" à vista, e
quem parava no meio não sabia que existia. `drawer_modal/1` prende cabeçalho e
rodapé nas bordas e rola só o miolo, que é exatamente a moldura da decisão 0014 e o
motivo dela.

O andamento mudou de lugar junto: "3 de 7 · 2 assinados · 1 na fila" saiu do topo e
foi para o rodapé, ao lado das ações. É a informação que decide se vale continuar,
e ela precisa estar onde a decisão é tomada.

**Os pontos do trilho do lote têm 24px de alvo, não 8px.** O trilho é o único
caminho de volta a um atendimento pulado. Um ponto de 8px é inalcançável no toque
e desaparece para quem tem tremor, e a varredura de toque deste repositório o
reprovaria — corretamente. *(Superado na segunda passada: o trilho deixou de ser
clicável e quem navega são as duas setas do rodapé.)*

**Ponto já resolvido continua alcançável pelo Tab e não navega.** Voltar a um
atendimento já assinado abriria a tela de revisão com o botão de assinar ativo de
novo. O rótulo anuncia o estado — assinado, deixado na fila, aguardando revisão —
e o alvo fica inerte, como manda a convenção da decisão 0003. *(Superado junto com
o parágrafo acima; a regra continua, o rodapé é que a diz.)*

**A ação da linha do atendimento abre a revisão; ela não assina.** No desenho, a
linha tem um botão "Assinar" que assina direto. É a contradição da própria regra
do lote: assinar sem ver o registro é o que a fila de revisão existe para não
deixar acontecer. O destino é o mesmo diálogo, com um item — o rótulo é que
encurtou para "Assinar" na segunda passada, porque a linha já tem "Registro" ao
lado e "Revisar e assinar" duas vezes na mesma linha não informava nada.

**O link "Registro" saiu.** Ele aponta para o registro do atendimento, que é tela
de outro módulo e não faz parte desta proposta. Prometer um destino que não existe
é pior que não oferecê-lo. *(Voltou na segunda passada, com destino: a revisão
passou a abrir qualquer sessão, e não só as da fila — o registro do atendimento é
exatamente o que ela mostra.)*

**Os selos de contagem são `tag/1`, com a cor de sinal do produto — e ela
reprova o contraste.** A primeira versão desta tela desenhava os dois à mão, dois
`span` com raio, padding e paleta próprios, e a mesma tela ficava com duas
implementações de etiqueta: a tendência do programa já usava a do repositório.
Correção do mesmo tipo da que o commit anterior fez nas pastas de documento.

A troca expôs uma escolha. Medidas no navegador, com a transparência achatada
sobre o branco, **só duas das dez variantes de `tag/1` atingiam AA**:

| Variante | Razão | | Variante | Razão |
| --- | --- | --- | --- | --- |
| `brand` | **12,15** ✓ | | `red` | 3,05 |
| `purple` | **4,89** ✓ | | `orange` | 2,93 |
| `light-purple` | 4,01 | | `green` | 2,46 |
| `cyan` | 2,34 | | `light-blue` | 2,14 |
| `blue` | 2,14 | | `yellow` | 2,03 |

E nenhuma das duas que passavam é cor de sinal: `brand` é cinza-roxo e `purple` é
roxo cheio. Um selo de fila que parece um selo neutro não é lido como fila, e a
única razão de o número estar ali é ser visto de longe.

*(Esta tabela é história: a passada de 26/08 escureceu o texto das variantes de
sinal no espelho, e as cinco passaram a atingir AA sem trocar de cor. Ver "O
contraste das etiquetas", no fim.)*

**A decisão do design foi manter a cor de sinal clara: `light-blue` na fila e
`red` nos pontos de atenção.** É divergência de acessibilidade assumida, não
descuido.

O caminho, porque o meio dele foi desfeito: `yellow`/`light-blue` na primeira
passada; `red` no lugar do `yellow` na segunda, porque os pontos são coisa parada
e não aviso; as duas **invertidas** — fundo cheio, texto claro — para o número não
ser o elemento mais apagado de um card já pálido; e de volta às claras, porque numa
coluna de doze linhas dois retângulos de cor cheia por linha viram o assunto da
tela, e o assunto da tela são os nomes.

Inverter, de todo modo, não pagava a divergência: é a mesma tinta trocada de lado,
e a razão fica igual — 2,14 e 3,05.

As cinco `solid-*` ficaram no espelho do `tag/1`, mesmo sem uso aqui: `red`,
`green`, `orange`, `yellow` e `brand`, extensão da decisão 0015, com as razões
medidas no comentário do componente e uma demo própria na galeria. O original só
inverte `blue`, e a inversão das cores de sinal é peça que faltava na paleta —
duas delas atingem AA (`solid-yellow` 13,15 e `solid-brand` 14,05), as três de cor
de sinal reprovam como as claras da mesma cor.

O que sustenta a escolha é que a cor não é o único canal — o ícone distingue os
dois selos, e o `title` mais o rótulo `sr-only` entregam a frase inteira ("3
atendimentos aguardando assinatura"), que é o requisito de 1.4.1. O que **não**
se resolve é 1.4.3: quem depende do contraste não lê o número na cor, e vai
depender do painel de detalhe, que lista os pontos de atenção em texto.

Os dois pares entraram em `knownProductionFailures`, ao lado dos seis do produto,
com a razão medida. É o registro que o teste de tokens verifica ao contrário: ele
afirma que os pares **falham**, e quebra se o Bloomy corrigir a origem — o dia em
que este parágrafo fica obsoleto. E os selos levam `espelho-do-sistema`, porque
com a variante do produto eles **são** espelho: a classe diz ao axe que a
reprovação é a do `tag/1`, não uma invenção daqui.

Sobrava uma inconsistência conhecida: a situação do atendimento e a tendência do
programa continuavam em `Chip`, o chip local, cujos seis tons são pares declarados
e passam AA. A tela ficava com `Tag` para contagem e `Chip` para situação — e com
duas réguas de contraste. A segunda passada fechou a metade que era anatomia: as
duas viraram `tag/1`, com ícone como segundo canal. A dívida de contraste ficou
inteira em `knownProductionFailures`, e o caminho que a fecha continua sendo
escurecer os tokens do `tag/1` como extensão da decisão 0001, em vez de escolher
variante por variante.

**Os três indicadores do topo são `card/1` com `info_card/1` dentro.** Mesma
história dos selos: eu tinha desenhado o cartão à mão — quadrado de ícone, número
e rótulo, com padding e paleta próprios. O componente do sistema traz duas coisas
que a versão desenhada não tinha: o número no peso e no tamanho do produto, e **o
estado de carregamento embutido** — sem `info`, `info_card/1` mostra uma barra
pulsando no lugar do número, que é o que a pessoa vê enquanto o painel carrega.

O fundo colorido é o do próprio `card/1`: `extract_bg_class/1` deixa o cartão
branco a menos que quem o usa passe uma classe de fundo. É a regra pequena que
permite os cartões coloridos do produto sem uma propriedade a mais, e é ela que
reproduz o azul da fila e o laranja das faltas do desenho.

**A classe tem de ser a forma de token.** `extract_bg_class/1` procura `bg-`
seguido de letras, números e hífens; `bg-[var(--color-blue-light)]` não casa, o
cartão recebe `bg-white` junto e o branco vence na ordem do CSS gerado. O fundo
simplesmente não aparece, sem erro nenhum para investigar — armadilha da mesma
família dos achados 104, 120 e 121. Aqui as classes são `bg-blue-light` e
`bg-brand-orange/20`.

**Os três cartões são brancos.** O fundo tingido era adição do desenho —
`info_card/1` tinge só o quadrado do ícone — e ele custava contraste. O número é
20px extrabold, então o limiar é o de texto grande, 3:1. Medido no cartão
renderizado:

| Indicador | Número | Sobre o tinto | Sobre branco | |
| --- | --- | --- | --- | --- |
| Atendimentos | `accent` `#6144c5` | 6,68 | 6,68 | ✓ |
| A assinar | `blue` `#4094bb` | 2,95 ✗ | **3,40** | ✓ |
| Faltas | `orange` `#e17c38` | 2,53 ✗ | 2,94 | ✗ por 0,06 |

Tirar o tinto trocou duas reprovações por uma.

**E a segunda passada tirou a que sobrou: o número é navy, e quem carrega o sinal
é só o quadrado do ícone.** Três números de dois dígitos, que são a primeira coisa
que se lê na tela, dependendo de uma folga de 0,40 num caso e reprovando por 0,06
no outro. Com o navy os três dão 14,05:1, o quadrado continua dizendo qual é qual,
e o cartão deixou de precisar de `espelho-do-sistema`.

O override é de fora — uma classe no `card/1` que alcança os dois parágrafos do
`info_card/1` —, e não uma propriedade nova no espelho: `info_card/1` continua
sendo o que o sistema tem, e a galeria continua mostrando as cinco variantes como
elas são.

**O filtro da fila saiu.** Ele dizia "7 aguardando assinatura" ao lado de um
indicador que diz 7 — dois números disputando a leitura sem que ficasse claro qual
era o total. Sem o número, sobrava um botão que encolhia as três colunas para quem
tem pendência; e isso o painel de detalhe já faz melhor, porque lá a pendência
aparece atendimento a atendimento e não só como presença. Saiu com o estado que
só ele movia.

**A contagem de cada coluna é `tag/1`.** Era o terceiro selo desenhado à mão da
tela. Variante `brand`, a sem sinal — é uma contagem, não um estado —, e a única
das dez que serve para número sem cor: 12,15:1.

**As quatro caixas não têm contorno.** As três colunas e o painel de detalhe
ficaram só com a sombra, que é o que `card/1` faz — ele é `rounded-2xl p-6
shadow-main`, sem borda. O contorno vinha do `Card` de `primitives.tsx`, que é
invenção local; o painel de detalhe deixou de usá-lo.

**Os pontos de atenção viraram lista, e não só número.** O desenho define um
`AlertList` e nunca o renderiza: o "▲4" da coluna não tem onde ser lido. Um
alarme sem endereço não produz ação. A lista mora no painel do aplicador e do
paciente, com o nome de quem é cada ponto.

**Nada é somado entre pacientes.** Duas guias vencendo em dois pacientes são dois
problemas, com dois convênios e dois prazos. Agrupá-las numa linha "Guia
vencendo" faria a contagem do aplicador cair pela metade e ele parecer mais em
ordem do que está — então cada ponto carrega o nome do paciente e a contagem é a
dos problemas, não a dos rótulos distintos.

**O detalhe desce para baixo abaixo de 1440px.** A 1280 as quatro faixas dão 238px
cada, e a coluna do meio deixa de servir de filtro: "Rafael Andrade Nunes" fica com
86px de nome cortado — e um nome cortado num filtro de nomes obriga a clicar para
saber em quem se está clicando. Abaixo do corte as três colunas ficam com 371px e o
painel ocupa a largura toda embaixo.

O corte era 1536 na primeira passada, o `2xl` do Tailwind, escolhido porque era o
degrau que existia. A segunda passada mediu onde o desenho de fato funciona: a 1440
as colunas dão 273px e o painel 419, que é a proporção em que ele foi feito — e uma
tela de 1440 é comum o suficiente para não ser tratada como caso de exceção. O
corte passou a ser declarado, `min-[1440px]`.

**O aviso de sucesso é uma região viva na página, não um toast flutuante.** Ela
nasce vazia — uma frase no primeiro quadro seria lida na chegada, sobre uma ação
que ninguém praticou — e é a única região viva da tela, declarada nos quatro
cenários.

## A segunda passada visual

**Data:** 2026-08-26. Um segundo desenho da mesma tela, com o layout já
implementado à vista. Nada mudou nas três perguntas nem no alcance por coluna; o
que mudou foi forma, e em quatro pontos comportamento.

### Forma

**As iniciais viraram círculo, e as três cores viraram uma.** Supervisor,
aplicador e paciente tinham cor própria, e o círculo passava a dizer o tipo. Só
que o tipo já está dito pela coluna em que o nome mora, e a mesma pessoa aparece
nas duas — o supervisor no painel do aplicador, o aplicador na lista de quem
atende o paciente — trocando de cor no caminho. Uma cor: o círculo é âncora do
nome, não um segundo canal que contradiz o primeiro.

**A cor é o texto rebaixado: fundo em navy a 10%, iniciais em navy a 80%.** O
círculo passou por três cores antes de parar aqui, e vale registrar o caminho
porque cada troca resolveu uma coisa diferente. `--color-action` primeiro, por
contraste. Depois `--color-blue`, o azul do `avatar/1`, para casar com o avatar do
cabeçalho — e aí a coluna virou um mostruário: doze círculos com a cor mais
saturada da tela, nenhum deles carregando informação, competindo com o selo de
fila, que é o que precisa ser visto de longe.

O navy rebaixado resolve as duas coisas. As opacidades se compõem a favor: o fundo
é translúcido, então dentro de uma linha que já é navy a 10% ele chega a 19% e o
círculo aparece; sobre o branco do painel de detalhe fica em 10% e continua
aparecendo. Uma cor só, dois contextos, sem variante.

E o contraste deixou de ser divergência: as iniciais dão 5,84:1 dentro da linha e
6,61:1 sobre o branco, contra os 2,47 do azul cheio. O par saiu de
`knownProductionFailures` e o círculo perdeu o `espelho-do-sistema` — ele não é
mais espelho de nada, é o texto da tela em duas opacidades.

**A linha da coluna não selecionada é só contorno; a selecionada é o azul a 10%
com contorno azul cheio.** A linha não selecionada passou por três estados antes
de parar aqui — branca com contorno no selecionado e branca no resto, depois
`--color-ink-50`, depois o navy do texto a 10% — e o que derrubou o preenchimento
foi uma observação simples: **cinza claro num alvo clicável lê como
desabilitado.** Doze linhas apagadas com uma acesa, quando as doze são clicáveis.

Sem preenchimento, o branco do cartão é o fundo, o contorno de 1px no navy a 10%
delimita, e quem ganha peso é só o que está selecionado — que é a única coisa que
o preenchimento devia ter dito desde o começo.

A linha de programa foi pelo mesmo caminho, e o corte que sobrou não é
clicável/não-clicável — é **linha de lista contra cartão de dado**:

| Anatomia | Tratamento | Onde |
| --- | --- | --- |
| Linha de lista | contorno de 1px, navy a 10% | coluna, "Atendido por", programa |
| Cartão de dado | preenchimento, navy a 10% | medida do painel, campo do cabeçalho da revisão, caixa da observação |

Faz sentido pelo que cada um é: uma lista precisa que se veja onde uma linha
termina e a outra começa, e um cartão de dado precisa se separar do texto ao redor.
E o preenchimento sobrou para onde ele **significa** alguma coisa: o programa que
pede atenção continua com a faixa de aviso, que agora é a única faixa colorida da
lista em vez de mais uma entre iguais.

`--color-ink-50` saiu de cena nos dois casos: era um degrau de uma escala própria,
e o navy rebaixado é a cor que já está no texto.

O contorno azul cheio dá 2,47:1 sobre o preenchimento — abaixo dos 3:1 que a
1.4.11 pede para indicador de estado. É a mesma escolha do círculo de iniciais, do
mesmo backlog, e o que a segura é que o estado não está só na borda: o
preenchimento troca de família junto — cinza-lavanda para ciano-claro — e o
`aria-pressed` diz o que a cor diz. A razão de contraste é simétrica, então é a
medida já registrada, e não uma entrada nova.

**O mesmo par vale para a barra de assinatura e para a sessão que espera
assinatura.** As duas usavam `info-bg` com o contorno em `info-fg/25` e
`info-fg/35` — três tons de azul na mesma tela, separados por passos pequenos e
sem que a diferença significasse nada. Ficou um par: azul a 10% com contorno
cheio marca "isto está selecionado" e "isto espera assinatura", que nesta tela são
a mesma família de sinal, e o verde da barra sem fila é o que se separa das duas.

**A linha da coluna tem três colunas: círculo, nome com o detalhe embaixo, selos.**
A primeira passada tinha descido os selos para a segunda linha, porque a 238px o
nome sobrava com 86px; a segunda os subiu para a linha do nome, e aí o nome ficava
com o que sobrasse de dois selos enquanto a linha de baixo tinha a largura toda. Em
coluna própria, centrados nas duas linhas, os selos ficam sempre no mesmo lugar — o
número é a razão de o selo existir — e as duas linhas de texto cortam na mesma
medida, que é o que o desenho mostra.

**Os três indicadores encolheram para 222px cada e encostaram à esquerda.** Uma
faixa de três colunas na largura da tela punha um número de dois dígitos no centro
de um cartão de 480px — o número mais longe possível do rótulo dele.

**A faixa dos filtros reserva a altura da marca.** Sem isso o primeiro clique
numa coluna crescia a faixa em 7px — a frase de convite tem 21px, a marca com o
botão de fechar tem 28 — e empurrava os indicadores e as três colunas para baixo,
no mesmo quadro em que a pessoa procura o que mudou na coluna.

**O aviso de sucesso só fala quando alguma coisa aconteceu.** Fechar a fila sem
assinar nada dizia "Nenhuma assinatura foi dada. Os atendimentos seguem na fila."
— em verde, com ícone de confirmação, sobre o resumo que acabou de dizer a mesma
coisa em duas linhas. Nada mudou na tela, então não há resultado a anunciar: a
região volta a ficar vazia. Tem teste, porque uma região viva que fala do que não
aconteceu é o defeito que ela existe para não ter.

**O botão da barra de assinatura desceu para baixo da frase.** Ao lado, ele
dividia a largura com um texto que muda de tamanho a cada escopo — "aguardando
assinatura na equipe" contra "aguardando assinatura" — e a ação principal da tela
mudava de posição a cada clique numa coluna.

**"N de M" voltou para o topo do drawer, ao lado do trilho; as contagens ficaram
no rodapé.** São duas informações diferentes: onde estou na fila é orientação, e
lê-se junto do trilho; quantos assinei e quantos pulei é resultado, e decide se
vale continuar — fica junto das ações.

**O rodapé do drawer ganhou as duas setas.** O trilho deixou de ser um trilho de
botões que quase todos recusavam o clique; quem navega são duas setas de 36px, com
rótulo, que é o alvo que a varredura de toque pede e o rótulo que a de teclado
pede.

**A linha da sessão virou grade: data à esquerda, o que aconteceu no meio, as
ações à direita.** A data e o horário em coluna própria dão um eixo de leitura
vertical numa lista que se lê por data — antes eles dividiam a primeira linha com
a situação, e a data trocava de posição conforme o tamanho da etiqueta.

**O cabeçalho da revisão quebra em duas linhas: data e horário em cima, local e
supervisor embaixo.** A quatro colunas num painel de 608px cada campo ficava com
131px — "Unidade Pinheiros" em duas linhas, "Beatriz Lima Rocha" em três, e as
quatro caixas com a altura da pior delas. Em duas colunas cada campo tem 274px e
os quatro cabem numa linha cada.

**Os programas trabalhados ficam um embaixo do outro.** Lado a lado, cada cartão
tinha 276px para o nome do programa, a etiqueta de tendência, a barra de progresso
e a linha de tentativas — o nome quebrava em duas linhas e a barra encolhia até
não mostrar diferença entre 62% e 85%, que é a única coisa que ela existe para
mostrar.

Duas trocas de formato de data vieram com ela: `formatNumericDate/2` (`25/08/2026`)
no cabeçalho da revisão e `formatDayMonth/2` (`25/08`) na linha e na última
supervisão. `formatDate/2` escreve o mês por extenso, que é o que uma ficha quer e
o que uma grade não aguenta.

**O drawer tem largura declarada, 608px, e não uma das quatro do
`drawer_modal/1`.** Duas medidas do conteúdo decidem: quatro campos de cabeçalho
numa linha e dois cartões de programa numa linha. A 768 (`medium`) o cartão de
programa fica com 354px para uma barra e duas linhas de texto; a 576 (`small`) o
campo do supervisor quebra em três linhas. 608 é onde os dois caem certos.

### Comportamento

**"Atendido por" só aparece sem aplicador escolhido.** Com um escolhido, a coluna
do meio já ficou com um nome, a marca de filtro repete esse nome e o título das
sessões repete de novo. Sem nenhum escolhido, a lista continua sendo a resposta
que a tela portada não tem por onde receber: de quem é a assinatura de cada um de
quem atende esta criança.

**A linha da sessão tem uma ação, e ela é só ícone.** Ela chegou a ter duas —
"Registro" e "Assinar" — com o mesmo `onClick`, e dois controles que levam ao mesmo
lugar pedem que a pessoa escolha entre sinônimos. O destino é o mesmo porque o
registro do atendimento **é** a tela de revisão; o que a pendência muda é o que ela
vai fazer lá, e isso cabe no ícone: `fa-signature` quando há o que assinar,
`fa-file-alt` quando é só leitura. O peso do botão acompanha — preenchido no
primeiro caso, `tint` neutro no segundo.

Só ícone exige duas coisas juntas, e nenhuma delas é opcional: `aria-label`, porque
sem texto o leitor de tela anuncia "botão" e mais nada; e `title`, porque quem vê o
ícone e não o reconhece precisa de um caminho. Os dois recebem a frase inteira —
"Assinar o atendimento de 28 de jul. de 2026" —, não uma versão curta. O alvo é o
`medium` do `button/1`, 36px, acima dos 24 que a varredura de toque cobra.

**A revisão abre para qualquer sessão, não só as da fila.** Foi o que deu destino
ao link que a primeira passada tinha tirado. O drawer passou a
distinguir o que é assinável do que não é: numa sessão que não espera assinatura o
rodapé diz isso, em vez de oferecer "Assinar e avançar".

O conjunto do que é assinável é **fixado no primeiro quadro**, e não recalculado.
`assinados` é o conjunto da página, e assinar aqui o faz crescer: recalculado, o
atendimento que acabou de ser assinado deixava de ser assinável, a lista esvaziava
e a fila nunca terminava — duas assinaturas numa fila de dois deixavam o painel
aberto no último registro, sem resumo. Tem teste.

**O fim da fila é um `modal/1` centrado, e não a última tela do drawer.** O resumo
não tem nada a rolar e não continua a leitura: ele fecha o assunto. Um painel de
608px encostado na direita, com uma frase no meio, faz parecer que ainda há um
atendimento embaixo.

Isso expôs um defeito no espelho do `modal/1`: o padding do cabeçalho estava
condicionado ao título, e um diálogo sem título nascia com o botão de fechar
encostado no canto arredondado. Corrigido em `Overlay.tsx` — o padding vale
sempre, e sem título o botão vai para a direita (`justify-between` com um filho só
o joga para a esquerda) e o cabeçalho fica em `p-4`, porque ali ele é só o botão.

O resumo também tinha padding em cima de padding: o `modal/1` já envolve o
conteúdo em `p-6`, e o `px-8 pb-10` que estava no conteúdo somava a ele — 40px de
nada embaixo de um botão, num diálogo de três linhas. O diálogo caiu de 340px de
altura para 277.

E um terceiro, achado pelo axe no minuto em que o cabeçalho da revisão passou a
ocupar duas linhas: **o miolo que rola do `drawer_modal/1` não era alcançável pelo
teclado.** O cabeçalho e o rodapé ficam presos nas bordas, então quem rola é o
bloco do meio — e com o Tab o foco pulava do botão de fechar direto para o rodapé.
Num registro de atendimento mais alto que o painel, a pessoa assinava o que não
teve como ler. `tabIndex={0}` no bloco, que é o que a 2.1.1 pede; o custo é uma
parada de Tab a mais nos drawers curtos, e o teste de contrato da galeria fixa a
ordem nova.

**E um defeito de espaçamento que valia por toda a tela: nesta versão do Tailwind,
`space-y-*` põe a margem no próprio filho.** Todo filho que zera a margem do
navegador — `<dl className="m-0">`, `<p className="m-0">` — apagava o espaçamento
junto com ela. Medido no DOM, os vãos entre os cartões de cabeçalho, a linha de
check-in e o título dos programas eram **zero**, não 16px. O miolo da revisão, a
raiz da tela e o resumo passaram para `flex flex-col gap-*`, que não passa por
margem: nada do filho o desliga. É armadilha da mesma família dos achados 104, 120
e 121 — funciona errado sem erro nenhum para investigar.

**"Deixar na fila" virou "Pular".** Com o resumo dizendo "ficaram pendentes e
seguem na sua fila", o botão não precisa carregar a explicação inteira.

### O que não veio do desenho

Três coisas do segundo desenho não foram implementadas, e o motivo é o mesmo dos
catorze da primeira passada.

**Os rótulos de situação continuam os do produto.** O desenho escreve "Concluído" e
"Assinar"; `enums.po` escreve "Finalizado" e "Assinatura Supervisor". É a palavra
que a clínica usa em voz alta, e a segunda é longa o bastante para quebrar em duas
linhas na etiqueta — que é um preço menor do que a especificação divergir do
produto num lugar em que ninguém iria conferir.

**A pluralização é por extenso, e não "atendimento(s)".** O desenho resolve plural
com parênteses em sete lugares. `quantia/3` já existe e escreve "1 atendimento" ou
"2 atendimentos", que é o que se lê em voz alta.

**A lista de pontos de atenção do painel do aplicador ficou.** O segundo desenho
não a mostra, e ela é a decisão de que o "▲3" da coluna precisa ter onde ser lido:
um alarme sem endereço não produz ação.

### O contraste das etiquetas

Esta é a dívida que a decisão abriu no primeiro dia e fechou no último. Vale
registrar o caminho inteiro, porque o erro durou três passadas.

**O que se dizia:** que a cor de sinal do produto valia mais que a razão de
contraste. `light-blue` em 2,14:1 num texto de 14px em negrito, `red` em 3,05, e
os pares em `knownProductionFailures` com a divergência assumida. O que sustentava
era que a cor não é o único canal — ícone, `title` e rótulo `sr-only` entregam a
frase inteira, que é o requisito de 1.4.1. O que não se resolvia era 1.4.3.

**O erro era tratar a variante como indivisível.** Uma etiqueta de `tag/1` são
duas cores, e **só o texto carregava a reprovação**. Mantendo o fundo do produto —
que é o que faz a etiqueta ser reconhecida como fila, atenção ou tendência — e
escurecendo o texto para o tom da própria família, as cinco variantes de sinal
passam AA e nenhuma troca de cor:

| Variante | Texto antes | Depois | Razão |
| --- | --- | --- | --- |
| `light-blue` | `--color-blue` | `--color-blue-dark` | 2,14 → **5,25** |
| `red` | `--color-red` | `--color-red-dark` | 3,05 → **6,77** |
| `green` | `--color-brand-green-dark` | `--color-green-dark` | 2,46 → **5,77** |
| `orange` | `--color-orange-dark` | `--color-warn-fg` | 2,93 → **5,90** |
| `yellow` | `--color-yellow-dark` | `--color-warn-fg` | 2,05 → **6,18** |

Para laranja e amarelo o `-dark` da própria família não basta — param em 2,93 e
2,05 —, e os dois usam `--color-warn-fg`. Não é invenção desta passada:
`tokens.css` já carregava o valor corrigido dessas duas famílias no par de chip,
com a nota "laranja e amarelo foram escurecidos". A correção existia; só não tinha
chegado à etiqueta.

As cinco invertidas do produto foram pelo mesmo caminho, e de quebra ficaram mais
fiéis ao que tinham sido pedidas: o fundo é o tom **escuro** da família, não o
cheio — `--color-red` (#f04646) não é escuro, `--color-red-dark` (#902a2a) é. As
cinco atingem AA.

**Corrigido o texto, sobrou a borda — e ela se resolveu em outro lugar.** Com o
preenchimento do produto e o texto legível, o selo virou legível por dentro e
invisível por fora: em cima da linha da coluna, que era o navy a 10%, ele separava
**1,05:1** do fundo. Os dois eram tinta clara sobre branco, e é aí que a intuição
erra — mexer no alfa do preenchimento **não** resolve:

| Selo da fila | Separação do fundo | Texto |
| --- | --- | --- |
| `#dbf3fb` sólido | 1,05 | 5,25 ✓ |
| `blue/10` | 1,08 | 4,64 ✓ sem folga |
| `blue/20` | 1,17 | **4,28 ✗** |

O azul chega ao limite do texto antes de chegar à separação, e o vermelho
aguentaria 20% — os dois selos precisariam de alfas diferentes, pior que uma regra.

Um fio de 1px na cor do texto a 30% resolvia (1,47 no azul, 1,66 no vermelho,
contra 1,21 do próprio cartão branco), e chegou a entrar. **Saiu no mesmo dia,
porque o preenchimento da linha saiu:** contra o branco o selo separa sozinho, e o
fio era contorno de um problema que deixou de existir. A medida fica registrada no
comentário do `Tag` para o dia em que alguém puser um selo destes em cima de uma
faixa tingida.

A lição não é o número: é que **duas correções locais mal colocadas estavam
tapando um erro de uma camada acima.** O selo não precisava de borda; a linha não
precisava de preenchimento.

**Três consequências que valem mais que a tabela.** Os pares saíram de
`knownProductionFailures` e entraram em `contrastPairs`, onde o teste de tokens os
cobra e reprova o build se alguém clarear. O `espelho-do-sistema` saiu dos quatro
selos da tela, porque não há mais reprovação do `tag/1` para o axe deixar passar —
e a varredura volta a conferi-los, que é a diferença entre um número medido e um
número afirmado. E a decisão 0001 valeu de novo: **é a origem que se corrige, não
a tela.**

Isto é o que a decisão 0016 escreveu como "onde a próxima passada deve olhar", no
primeiro dia. A próxima passada olhou.

## Como fica dividido

| Rota | Tela | Situações |
| --- | --- | --- |
| `/supervision` | `Supervision` | As cinco portadas: período padrão, o que está parado, a tela que não é do supervisor, quem sumiu da lista, o vazio. |
| `/supervision/team` | `SupervisionTeam` | Uma proposta: `supervision.team`. As variações — a fila vazia, o supervisor sem vínculo — são **dados**, no seletor do rodapé, e o alcance vem da persona. Quatro cenários para a mesma rota davam quatro entradas na navegação para a mesma tela. |

É o mesmo arranjo de Profissionais (`/team` e `/team/documentation`) e de
Unidades (`/structure` e `/structure/documents`) — a referência portada continua
consultável, e o item do menu aponta para a proposta.
