# 0016 — A supervisão é uma relação de três pontas

**Data:** 2026-08-24
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
reprovaria — corretamente.

**Ponto já resolvido continua alcançável pelo Tab e não navega.** Voltar a um
atendimento já assinado abriria a tela de revisão com o botão de assinar ativo de
novo. O rótulo anuncia o estado — assinado, deixado na fila, aguardando revisão —
e o alvo fica inerte, como manda a convenção da decisão 0003.

**A ação da linha do atendimento abre a revisão; ela não assina.** No desenho, a
linha tem um botão "Assinar" que assina direto. É a contradição da própria regra
do lote: assinar sem ver o registro é o que a fila de revisão existe para não
deixar acontecer. O rótulo é o mesmo do painel — "Revisar e assinar" — e o
destino é o mesmo diálogo, com um item.

**O link "Registro" saiu.** Ele aponta para o registro do atendimento, que é tela
de outro módulo e não faz parte desta proposta. Prometer um destino que não existe
é pior que não oferecê-lo; a linha continua dizendo se há registro ou não, e o
registro inteiro aparece onde a decisão acontece — dentro da revisão.

**Os selos de contagem são `tag/1`, com a cor de sinal do produto — e ela
reprova o contraste.** A primeira versão desta tela desenhava os dois à mão, dois
`span` com raio, padding e paleta próprios, e a mesma tela ficava com duas
implementações de etiqueta: a tendência do programa já usava a do repositório.
Correção do mesmo tipo da que o commit anterior fez nas pastas de documento.

A troca expôs uma escolha. Medidas no navegador, com a transparência achatada
sobre o branco, **só duas das dez variantes de `tag/1` atingem AA**:

| Variante | Razão | | Variante | Razão |
| --- | --- | --- | --- | --- |
| `brand` | **12,15** ✓ | | `red` | 3,05 |
| `purple` | **4,89** ✓ | | `orange` | 2,93 |
| `light-purple` | 4,01 | | `green` | 2,46 |
| `cyan` | 2,34 | | `light-blue` | 2,14 |
| `blue` | 2,14 | | `yellow` | 2,03 |

E nenhuma das duas que passam é cor de sinal: `brand` é cinza-roxo e `purple` é
roxo cheio. Um selo de fila que parece um selo neutro não é lido como fila, e a
única razão de o número estar ali é ser visto de longe.

**A decisão do design foi manter a cor de sinal: `light-blue` na fila e `yellow`
nos pontos de atenção.** É divergência de acessibilidade assumida, não descuido.

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

Sobra uma inconsistência conhecida: a situação do atendimento e a tendência do
programa continuam em `Chip`, o chip local, cujos seis tons são pares declarados
e passam AA. A tela fica com `Tag` para contagem e `Chip` para situação — e com
duas réguas de contraste. O caminho que fecharia as duas coisas é escurecer os
tokens do `tag/1` como extensão da decisão 0001, em vez de escolher variante por
variante; é onde a próxima passada deve olhar.

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

Tirar o tinto trocou duas reprovações por uma. `accent` e `blue` entraram na lista
validada com `largeText`, e só o cartão de faltas leva `espelho-do-sistema` —
marcar os três tiraria do axe duas cores que ele deveria conferir.

Quem carrega o sinal passou a ser a cor do número e do ícone, que é o que o
componente do sistema já fazia.

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

**O detalhe desce para baixo abaixo de 1536px.** O desenho foi feito numa tela de
1836, onde as quatro faixas cabem. A 1280 elas dão 238px cada, e a coluna do meio
deixa de servir de filtro: "Rafael Andrade Nunes" fica com 86px de nome cortado —
e um nome cortado num filtro de nomes obriga a clicar para saber em quem se está
clicando. Abaixo de 1536 as três colunas ficam com 371px e o painel ocupa a
largura toda embaixo. O nome também ganhou a linha inteira, com os selos dividindo
a segunda linha com o detalhe.

**O aviso de sucesso é uma região viva na página, não um toast flutuante.** Ela
nasce vazia — uma frase no primeiro quadro seria lida na chegada, sobre uma ação
que ninguém praticou — e é a única região viva da tela, declarada nos quatro
cenários.

## Como fica dividido

| Rota | Tela | Situações |
| --- | --- | --- |
| `/supervision` | `Supervision` | As cinco portadas: período padrão, o que está parado, a tela que não é do supervisor, quem sumiu da lista, o vazio. |
| `/supervision/team` | `SupervisionTeam` | Uma proposta: `supervision.team`. As variações — a fila vazia, o supervisor sem vínculo — são **dados**, no seletor do rodapé, e o alcance vem da persona. Quatro cenários para a mesma rota davam quatro entradas na navegação para a mesma tela. |

É o mesmo arranjo de Profissionais (`/team` e `/team/documentation`) e de
Unidades (`/structure` e `/structure/documents`) — a referência portada continua
consultável, e o item do menu aponta para a proposta.
