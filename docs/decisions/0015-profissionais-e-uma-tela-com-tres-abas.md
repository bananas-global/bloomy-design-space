# 0015 — Profissionais é uma tela com três abas

**Data:** 2026-08-20
**Situação:** proposta

## Contexto

No sistema real, "Profissionais" é uma página e meia espalhada em dois lugares e
uma ausência:

1. `ProfessionalLive.Index` — a lista: cinco filtros e seis colunas, com
   `link_button` para o controle de horas.
2. `ProfessionalLive.HoursControl` — rota própria (`/backoffice/profissionais/controle-de-horas`),
   com header próprio e um "Voltar para profissionais" de volta à lista.
3. A documentação da equipe **não existe**. Documento de profissional é por
   pessoa, na aba Documentos do perfil, e o enum de tipo tem três valores:
   `normal`, `certificate`, `administrative`.

As três respondem sobre a mesma lista de pessoas e pedem os mesmos filtros — nome
ou conselho, especialidade, status. Quem confere a documentação de uma
especialidade e depois quer as horas da mesma especialidade refazia o filtro, e
ainda passava por um link de volta no meio do caminho.

O Design Space vinha reproduzindo isso com um alternador de duas posições —
Profissionais / Documentação — em duas telas que repetiam o mesmo cabeçalho, e
sem tela nenhuma para o controle de horas.

## Decisão

**Uma tela, três abas: Cadastro, Documentação e Controle de horas.** O trilho é
`button_tabs/1`, o mesmo componente das outras abas do produto, e a lista de
pessoas é a mesma nas três — troca o conjunto de colunas, não a página.

**A Documentação tem cinco categorias num filtro, não cinco abas.** "Visão geral"
resume cada escopo numa contagem por situação; Profissional, Interno, Ocupacional
e Operadoras abrem uma coluna por tipo ou por convênio. É filtro e não aba porque
a categoria é a pergunta ("o que eu quero ver de todos?") e a aba é o assunto —
empilhar aba dentro de aba faria a pessoa perder de vista em que lista está.

**A permissão continua dividida como no monólito.** A aba Cadastro é de
`professionals.list`, que inclui a recepção. Documentação e Controle de horas são
de `professionals.edit`, que não — `HoursControl` autoriza `:edit` no sistema
real, e colapsar as duas numa permissão só faria a recepção passar a ver
remuneração de terapeuta.

**A linha inteira leva à pasta, nas três abas.** É o `row_click` do original, que
é `phx-click` em cada célula — e que não tem caminho de teclado. Por isso o nome
continua sendo uma âncora de verdade: o clique na linha é atalho de ponteiro, e a
navegação real mora no link. `Table` ignora o clique que nasceu dentro de um
controle, senão clicar no nome disparava âncora e linha, duas navegações para o
mesmo lugar.

**O controle de horas processa por ação, não por tecla.** É o `phx-submit` do
original: mexer nos campos não recalcula, e o que a tabela mostra continua sendo
o resultado do último "Processar". A exceção é a especialidade, que substitui a
seleção de profissionais e reapura — é o `handle_callback_loads` do monólito, e
sem isso escolher a especialidade não mudaria nada visível.

### O que divergiu do porte, e por quê

Seis extensões nos componentes espelhados. Nenhuma muda o comportamento de quem
já os usa: todas são opcionais e ficam desligadas por padrão.

| Componente | Extensão | Por que |
| --- | --- | --- |
| `ButtonTabs` | `icon` e `badge` por aba | O trilho é a única navegação da tela, e a Documentação carrega uma fila. Um contador em texto ao lado do rótulo obrigaria a ler as três abas para descobrir onde está o trabalho. Badge zero não renderiza. |
| `ButtonTabs` | `header` | `button_tabs/1` não tem; `lazy_tabs/1` tem, e é convenção deste porte. Sem ele, o `justify-between` do original empurraria o trilho para a esquerda do cartão, longe do título. |
| `ButtonTabs` | `actions` | Existe no original (`slot :actions`) e faltava neste porte. Voltou porque é onde "Novo profissional" mora. |
| `Table` | `label` aceita nó, com `id` para chave | O cabeçalho da matriz precisa da marca de obrigatório com nome acessível (`<abbr title>`). O HEEx aceita só string. |
| `Table` | `sticky` por coluna | A matriz por categoria chega a onze colunas. Sem o nome ancorado, a pessoa rola até a coluna certa e já não sabe de quem é a linha. Nenhuma tabela do monólito passa de sete colunas — é por isso que ele não precisou disto. |
| `Table` | `rowClassName` | É o destaque de quem está em inativação. O original não tem estado de linha nenhum. |
| `Table` | `onRowClick` ignora clique em controle | O `phx-click` por célula do original dispara junto com o link que está dentro dela. Com os dois destinos iguais, são duas navegações; com destinos diferentes, ganha a errada. |
| `Progress` | variante `green` | `progress/1` tem azul, roxo, `accent` e vermelho. Completude em 100% em azul não se distingue de 88% em azul, e é justamente a diferença entre "acabou" e "falta um". |

E uma **correção** no `MultiSelect`, que estava divergindo do original sem
motivo: o gatilho era `min-h-12` com as escolhidas em `flex-wrap`, e crescia a
cada seleção. O `data-container` de `multi_select_search_component.ex` é `h-12`
com `overflow-hidden` — altura fixa, fila única, excedente cortado pela borda. A
etiqueta também passou a ser a de lá, `uppercase` incluído; só a cor do texto
diverge, porque `brand-blue-dark` sobre o azul a 20% dá 2,83:1 e o campo é usado
fora de `espelho-do-sistema`. Cada etiqueta carrega o nome completo no `title`.

Três correções que a coluna fixa exigiu e que valem para **toda** tabela do
espelho, registradas como achados 120 e 121:

- O `th` do cabeçalho e o hover da linha eram translúcidos (`brand-blue/20` e
  `brand-purple-dark/5`). `position: sticky` não cria contexto de pintura, então
  célula translúcida deixa passar a coluna que rola por baixo. As duas cores
  passaram a ser achatadas com `color-mix` sobre o branco: o resultado pintado é
  o mesmo, a célula fica opaca.
- `table_class/1` declara `[&_tbody_tr_td]:relative`, seletor descendente que
  vence qualquer `position` posta na própria célula — inclusive `sticky`. A
  coluna fixa usa `sticky!`.
- Toda linha do corpo passou a ter fundo declarado, porque é dele que a coluna
  fixa herda o próprio. Uma classe de fundo por linha, nunca duas: empatadas em
  especificidade, quem venceria seria a ordem do CSS gerado.

E quatro divergências de conteúdo, deliberadas:

- **A coluna "Tipo" virou "Perfil".** No monólito o filtro se chama Perfil e a
  coluna se chama Tipo, para o mesmo `professional_types` — achado 119.
- **O filtro de status tem três opções, não duas.** "Em inativação" não é campo,
  é ativo com data de saída futura; sem a opção, a única forma de achar quem está
  saindo é varrer a lista procurando a linha destacada. **Ativo continua
  incluindo quem está saindo**, como `status: true` inclui lá — quem tem data
  marcada ainda atende, e tirá-lo de Ativo o esconderia de quem monta a escala.
- **"Processar" é `variant="tint"`,** e no monólito é o botão azul cheio. Escolha
  do time de design: a faixa de filtros não tem ação primária de página, e o
  azul cheio ali competia com "Novo profissional", que é a ação da tela.
- **A bolinha de situação entrou na coluna do nome.** `status_tag/1` mora numa
  coluna própria de 24px e só tem dois estados. Numa matriz de onze colunas, uma
  delas seria só um ponto colorido; e "Em inativação" é um terceiro estado,
  derivado, que precisa ser lido junto com o nome e com a linha de data que vem
  abaixo dele. Ela centraliza na linha do nome — é dele que fala —, e a linha de
  inativação começa na coluna da bolinha, meio passo à esquerda do nome.

A faixa de filtros do controle de horas também mudou de mecanismo: as proporções
continuam 3, 5 e 2, mas como `flex-grow` em vez de vãos de uma grade de doze. Na
grade, os dois vãos reservados ao botão sobravam vazios em tela larga, e era esse
vazio que fazia a faixa parecer desalinhada do resto do cartão.

### A pasta do profissional

A mesma passada de desenho alcançou a aba Documentos do perfil, que é onde a
pessoa cai ao clicar numa linha da lista.

**A pasta ganhou os filtros que a tabela real já tem, e dois novos.** Nome, Tipo
e Status vêm de `edit_tabs/documents.ex`. **Operadora** responde a pergunta que
traz a pessoa aqui na maior parte das vezes — *o que a Unimed já enxerga?* — que
antes exigia ler as etiquetas de todos os cartões. **Padrão** separa o que a
clínica exige de todo mundo do que a pessoa juntou por conta.

Padrão é filtro e não seção. Separar os dois em seções fixas foi o que a primeira
versão da proposta fazia, e o efeito era esconder a lacuna: quem abria a pasta via
primeiro a pilha do que existe. Como filtro, a pasta abre com tudo junto na ordem
do catálogo, e a separação fica disponível para quem foi buscá-la — tipicamente
para conferir o que a operadora exige, que é sempre padrão.

As opções de Tipo e Operadora saem do que a pasta tem, não do catálogo inteiro:
filtro que oferece o que não existe devolve lista vazia e parece defeito.

**O cartão ficou denso.** Até seis colunas, contra três. Onze tipos em três
colunas davam quatro linhas e a pasta não caía numa tela — e é justamente a
comparação de relance entre a lacuna e o documento válido que a pasta existe para
permitir. O quadrado do ícone passou de 48px para 32, que é o do `item/1` na
variante `simplified`; a variante `default`, que estava ali, ocupava um quarto da
altura do cartão.

A sexta coluna só entra a partir de 1900px, e o corte não é arbitrário: a linha
de cima do cartão divide o espaço entre o ícone, o selo "Padrão" e a etiqueta de
situação, e "Sem validade" em `text-sm` — o tamanho de `tag/1` — precisa de 165px
de folga. Abaixo disso a etiqueta caía para a linha seguinte em todo cartão sem
validade. O caminho alternativo era encolher `tag/1`, e encolher um componente do
sistema para caber um layout é o tipo de correção que o espelho não faz.

**Três mudanças de conteúdo no cartão:**

- **O nome do arquivo saiu.** Ele ocupava uma linha em todos os cartões para
  informar em nenhum. O que continua aparecendo é a **ausência** dele — "sem
  arquivo anexado", em vermelho — porque esse é o estado que engana.
- **A lacuna ganhou fundo, e a dica do tipo ficou em itálico.** É o único estado
  em que não há nada para ler: nem data, nem arquivo, nem operadora. O
  preenchimento é o que a separa do documento resolvido sem depender da etiqueta.
- **"+2 versões anteriores" virou "+2 outros documentos deste tipo".** O slot
  padrão aceita mais de um documento do mesmo tipo, e chamá-los de versão sugere
  que só o primeiro vale.

E três de peso visual. "Exportar agrupado" passou de `outline` para `tint`, e
"Adicionar documento" de `tint` para o azul cheio — o contorno colocava a ação
secundária no mesmo peso da primária. A contagem de pendentes passou de amarelo
para `light-blue`, porque o amarelo do resumo competia com a etiqueta "Pendente"
de cada cartão, que é a que aponta o trabalho.

A terceira exigiu **uma cor nova no `Button`: `brand`**, só na variante `tint`.
As cinco cores do original são todas de sinal — azul de ação, vermelho de perigo,
verde, roxo, amarelo — e faltava a cor de nenhum sinal: a ação repetida, que
aparece uma vez por item de uma lista. "Editar" em `tint` azul pintava onze botões
da mesma cor do "Adicionar documento" do cabeçalho, e a pasta ficava com doze
ações de igual peso e nenhuma primária. Mesmo motivo para o quadrado do ícone do
cartão, que era `bg-brand-blue/20` com o ícone em `brand-blue-dark`: onze
quadrados azuis disputavam a atenção com a etiqueta de situação, que é quem diz o
que fazer. Tinta neutra nos dois, texto e ícone no roxo escuro.

`default` não tem ramo `brand` — um botão cheio de roxo escuro seria um segundo
primário, que é exatamente o que esta cor existe para não ser. Ele cai no azul.

### O drawer de documento

A moldura do painel — cabeçalho preso, miolo que rola, ações presas no pé — é da
decisão 0014 e não mudou. O que mudou é o conteúdo.

**O formulário passou a ter três grupos nomeados:** o tipo, o arquivo e o
compartilhamento. Isso exigiu um `FieldsetLabel` novo em `Layout.tsx`, porque o
sistema tem um rótulo só — `label/1` — para campo e para grupo. Com ele nos dois
níveis, o rótulo do grupo ficava do mesmo tamanho e da mesma cor do rótulo do
campo, e a hierarquia desaparecia num formulário de seis campos. Caixa alta e
cinza de propósito: o grupo é orientação, o campo é o dado. É `span` e não `h2` —
quem nomeia o grupo para leitor de tela continua sendo o `fieldset`/`legend` de
cada controle.

**O tipo travado é uma pastilha, não uma caixa de aviso.** Ele era um bloco azul
com o nome e um parágrafo explicando que o tipo é fixo. O cadeado já diz isso, e
o parágrafo gastava quatro linhas respondendo uma pergunta que ninguém fez.

**O tipo aberto é uma pilha de pastilhas,** e não um `select`. Exigiu
`layout="pills"` no `RadioSelector`: a barra segmentada do sistema é uma linha só
e funciona para duas ou três opções curtas; com cinco rótulos longos ela
transborda numa faixa que rola para o lado, e escolher passaria a exigir rolagem
horizontal dentro de um formulário. Continua sendo `input[type=radio]`, com o
mesmo teclado — a extensão é de moldura, não de semântica.

**O catálogo ganhou o tipo "Outro documento".** Sem ele a pasta só aceita o que o
catálogo nomeia, e a clínica que recebe um comprovante imprevisto não tem onde
guardá-lo. É o único tipo em que o nome é digitado, porque é o único em que o nome
não vem do tipo — nos outros, um campo pré-preenchido com "Currículo" convidava a
reescrever o que a matriz usa como cabeçalho de coluna. Ele aparece como uma
décima segunda coluna na categoria Profissional da matriz, sempre como traço, o
que é a leitura correta: é um tipo que a pasta pode ter e ninguém tem.

**O arquivo é uma caixa só que troca de estado** — `variant="inline"` no
`FileUploader`. Vazia é tracejada e convida; preenchida é verde e oferece
"Trocar". O motivo é altura: a área de arraste do sistema gasta 120px, e com o
cartão do arquivo somado abaixo o campo passava de 200px e empurrava o
compartilhamento — a parte do formulário que decide credenciamento — para fora da
primeira tela. "Trocar" e não "Remover" porque arquivo é condição de salvar:
remover deixaria o formulário num estado que ele não aceita.

**O compartilhamento ganhou painel próprio e uma linha de contexto** dizendo
quem exige aquele tipo para credenciar, derivada de `insurer.requires`. A frase
acompanha o catálogo em vez de repetir de cabeça o que cada convênio pede.

**"Válido até" ficou ao lado da escolha de validade,** e não abaixo: "Definir
data" sem o campo à vista faz a pessoa procurar onde digitar.

**As ações dizem o que vai acontecer:** "Salvar alterações" ou "Adicionar
documento", com `fa-check`. No modal do sistema é "Salvar" com `fa-save` nos dois
casos, e criar não é a mesma coisa que alterar — quem abriu uma lacuna precisa
saber que vai criar.

Duas coisas do desenho recebido que **não** foram copiadas, e por quê:

- **Os rótulos de campo continuam no azul de `label/1`.** No desenho eles são
  escuros. Trocar a cor do rótulo é uma decisão de sistema, não deste drawer:
  `label/1` é o rótulo de todos os formulários do Design Space, e mudá-lo aqui
  faria este painel divergir de todas as outras telas.
- **A opção bloqueada continua listando o motivo abaixo do campo.** O desenho não
  mostra a linha "Particular — não credencia profissional", porque o desenho não
  tem particular entre as operadoras. Ela é a decisão 0003 e fica.

**Contrato PJ ficou de fora das pastilhas.** Ele aparece no desenho, mas é de
escopo interno, e a pasta mostra escopo profissional — oferecê-lo aqui criaria um
documento que a própria pasta não lista.

### O cabeçalho da unidade

A pasta da unidade abria direto na tabela: dava para ver os doze documentos e não
de quem eles eram. Ganhou o cabeçalho de `UnitLive.Components.CardHeader`, portado
inteiro — avatar `extra_large`, nome em `text-2xl font-bold`, etiqueta de situação
arredondada com ícone, e a linha de metadados com profissionais, salas, telefone e
endereço por extenso. O `dropdown_menu/1` vem junto, com os mesmos dois itens de
lá: voltar para a lista e inativar.

**As duas contagens são derivadas, não campo.** No sistema saem de
`count_unit_rooms/1` e `count_unit_professionals/1`, chamadas no `update` do
componente — o cabeçalho faz duas consultas, e uma unidade recém-cadastrada mostra
zero nas duas. Estão no contrato como `rooms` e `professionals` para que quem
desenhar saiba disso.

O contrato mudou junto: `UnitListing` passou a estender um `UnitProfile` novo, e
`UnitDocumentsData.unit` deixou de ser o `Unit` mínimo — só id e nome — para ser
esse perfil. É a mesma decisão que a lista de profissionais já tinha: a linha da
lista carrega o perfil inteiro, e a pasta usa o que a lista já tinha em mão em vez
de buscar de novo. O campo `city` solto em `UnitDocumentsData` saiu, porque agora
ele mora no perfil.

Duas divergências do original, as duas registradas como achados:

- **O endereço é montado por partes.** O original interpola cinco campos numa
  string só, e uma unidade sem bairro sai como "Rua Teste, 000 - , Campinas - SP",
  com hífen e vírgula órfãos — achado 122.
- **O menu de ações ancora à direita.** `dropdown_menu/1` não declara lado; quem o
  mantém na tela é o `DropdownController`, com `flip()` e `shift()` do Floating UI.
  Portar só a marcação dava um menu que sai da tela, e o gatilho fica justamente
  no canto direito do cartão — achado 123.

"Inativar" fica visível e desabilitada para quem não tem `units.edit`, com o
motivo no `title`. É a decisão 0003 aplicada a item de menu.

### Unidades recebeu o mesmo desenho

As três telas da frente Unidade passaram a ter a anatomia da frente Profissional.
Nada novo foi inventado: é o mesmo `ButtonTabs`, o mesmo `Table` com coluna fixa,
o mesmo par Cards/Tabela e os mesmos cinco filtros da pasta.

**A lista virou duas abas.** Cadastro é o espelho de `unit_live/index.ex` — os
quatro filtros (Nome, CNPJ, CNES, Cidade) e as seis colunas de lá, na ordem de lá.
Documentação não existe no monólito, e é a mesma decisão da lista de
profissionais: a fila de papel pendente é pergunta sobre a lista inteira, e
responder por unidade obriga a abrir doze pastas para descobrir qual tem o alvará
vencido.

Uma divergência de conteúdo: **"Ativa?" virou etiqueta** verde ou vermelha, contra
o "Sim"/"Não" solto do original. Numa lista de cinco unidades com uma inativa, a
cor responde antes da leitura.

**Os doze documentos da unidade ganharam três categorias** — Licenças,
Certificados, Contratos. O enum do monólito é outro (`Units.Document.type` tem
`regulatory`, `general`, `others`), e ele classifica o documento que alguém
anexou, não o slot que a unidade precisa preencher. O corte aqui é por quem cobra
o papel: licença é autorização para operar naquele endereço, certificado é
comprovação técnica e cadastral, contrato é a relação com o imóvel. Faltando uma
licença, a unidade não deveria estar atendendo; faltando um certificado, a
operadora não credencia e a porta continua aberta.

**A cadência de renovação virou campo.** `renewal` no catálogo, no lugar de viver
dentro da frase de `hint` — onde nenhuma tela conseguia lê-la. É o que o cartão
mostra ao lado da validade: "Expira em 14/01/2027 · renovação anual". Quando a
cadência repetiria o que a validade já disse, ela sai: "renovação sem validade"
não é frase.

**A pasta ganhou as abas do cadastro da unidade** — as oito de
`unit_live/edit.ex`, com Documentos ativa e as outras desativadas —, o par
Cards/Tabela, os cinco filtros e os cartões. O cartão da unidade tem duas coisas
que o do profissional não tem: o **responsável** pelo documento, porque quem
responde pelo alvará é uma pessoa nomeada e a vigilância pergunta por ela; e o
estado **Aguardando vigência**, do alvará emitido que só passa a valer no mês que
vem.

**Editar e Anexar abrem o mesmo drawer da pasta do profissional** — moldura da
decisão 0014, grupos nomeados, pastilha de tipo, arquivo em linha, painel de
compartilhamento e as ações que dizem o que vai acontecer. Duas peculiaridades
vêm de `unit_live/components/add_document_modal.ex`:

- **A vigência é período, não só validade.** Alvará e licença têm começo e fim, e
  é o começo que produz "Aguardando vigência". O original usa `range_datepicker/1`
  neste campo, e é ele que está aqui — um campo com duas datas, não dois campos.
- **O documento tem responsável.** No original é um `select_search` de usuários, e
  aparece **só** no documento `regulatory`. Aqui as opções saem de quem já
  responde por algum documento da pasta, porque o Design Space não tem cadastro de
  usuário; e o campo aparece só no slot do catálogo, que é a mesma condição.

E uma correção que só apareceu clicando: **a situação da unidade abre como Admin,
não como Operação.** `UnitPolicy.can?(role, :edit)` responde `true` só para
`admin`, e `:list` só para `admin` e `"admin_clinic"` — a string que não existe na
lista de papéis, divergência da decisão 0002. Com Operação, todo Editar e Anexar
da pasta chegava desabilitado e o painel de compartilhamento recusava as seis
operadoras, o que contradizia a própria expectativa da situação — "o documento que
nunca foi anexado aparece como lacuna, com a ação de anexar". A tela estava certa:
o gate é `units.edit`, como no monólito. Era a persona da situação que não podia
fazer o que a situação existe para mostrar. É a mesma persona da pasta da
operadora, pelo mesmo motivo.

O tipo nunca é escolhido nesta pasta: os doze do catálogo são todos slot padrão.
Um documento fora do catálogo — o `others` do original — entra como "Documento
adicional", com nome livre e sem responsável obrigatório.

`canSelectInsurer` ganhou um terceiro parâmetro com a permissão do escopo, em vez
de uma segunda cópia da regra para a unidade. A recusa que mais importa ali — o
particular, que não credencia ninguém — não depende de escopo nenhum.

A pasta também ganhou a cópia de sessão dos documentos, pela mesma razão da pasta
do profissional: sem ela, salvar só anunciava, o cartão continuava mostrando a
validade antiga, e quem revisa concluía que a ação não faz nada.

`completeness` passou a aceitar o mínimo que ela lê — `typeId`, `file`,
`validUntil`, `waived`. `ProfessionalDocument` e `UnitDocument` divergem em
`sharedWith`, e a regra não olha nem um nem o outro; exigir o tipo inteiro
obrigaria a unidade a ter uma cópia da regra.

Duas coisas do desenho recebido que **não** foram copiadas:

- **A contagem zero continua escondida** nas duas pastas. O desenho da unidade
  mostra "0 pendentes · 13 ativos · 0 a vencer · 0 expirados", e é o que a pasta
  do profissional mostrava antes do pedido de esconder zero. A regra é a mesma nas
  duas.
- **O vocabulário de estado é o do Design Space,** não o "Ativo" do desenho.
  `edit_tabs/documents.ex` e a pasta da unidade dizem "Ativo" para o documento
  válido; aqui os estados são Válido, Sem validade, A vencer, Vencido, Pendente,
  Dispensado e Aguardando vigência — sete, porque a pasta existe para distinguir
  os sete. Usar "Ativo" nos dois primeiros apagaria a diferença entre o documento
  que vence e o que nunca vence.

E uma correção que veio de teste: o nome da unidade "Itu" tem 20px de largura, e o
alvo de toque mínimo é 24 nas duas direções. O link do nome ganhou `min-w-6` nas
duas listas.

### Os filtros da aba Documentos da operadora

As duas tabelas da aba ganharam filtro. **Profissionais** filtra por Nome,
Especialidade, Formação especial, Credenciamento e Situação dos documentos;
**Unidades**, por Unidade, Cidade, Situação dos documentos e Credenciamento. Como
nos filtros da pasta, **as opções saem do que a lista tem** — um seletor que oferece
"Vencido" numa lista sem nenhum vencido ensina a pessoa a filtrar para o vazio. Sem
formação especial na clínica, o campo inteiro não aparece: um seletor que só oferece
"Todas" é um controle que não decide nada.

Três decisões que valem a pena:

- **Situação lista só o que pede trabalho** — Vencido, Pendente, A vencer e, na
  unidade, Aguardando vigência —, mais "Em dia". Aqui o filtro é sobre a *pessoa*, e
  não sobre o documento como na pasta: "quem tem algum documento válido" é quase todo
  mundo e não responde nada, enquanto na pasta "Válido" separa um documento dos
  outros. Dispensado fica fora pelo mesmo motivo — é a ausência de exigência.
- **Registro sem arquivo conta como ausência**, a mesma leitura da lista de unidades.
  `documentState` só responde `missing` para documento que não existe, e o que existe
  sem anexo sairia como válido. A operadora audita o papel.
- **As pastilhas de resumo continuam contando o total,** e não o filtrado. Elas dizem
  quanto a operadora aceita da clínica, e essa resposta não muda porque alguém digitou
  um nome na busca. Quem responde pelo filtro é o rodapé de contagem, que é novo nas
  duas tabelas.

Cada escopo tem o seu conjunto de filtros. Um só, guardado entre as abas, faria a
pessoa trocar de escopo e encontrar a lista já reduzida por um campo que a outra
tabela nem mostra.

### A ação da linha, na aba Documentos da operadora

A linha do profissional tinha duas ações e ambas eram só aviso: Habilitar quando
não credenciado, Compartilhamento no resto. Agora ela tem **uma ação que depende do
que já foi compartilhado**, e a ação abre um drawer que escreve.

**Sem nada compartilhado, a ação é Habilitar** — e é ela que abre o drawer para
escolher os documentos. Exportar não faz sentido antes disso: não há o que exportar,
e um menu de três itens com dois mortos ensina a pessoa a abrir o menu para nada.

**Com algo compartilhado, a ação vira o menu Ações** — Exportar separados, Exportar
consolidado e Compartilhamento, que reabre o mesmo drawer para revisar a escolha.

A pergunta é **"há documento compartilhado"**, e não a situação do credenciamento.
As duas quase sempre coincidem, e divergem justamente no caso que importa: o
descredenciado manual continua com os documentos que compartilhou, e precisa do menu
para que alguém consiga tirá-los.

**O drawer é "Compartilhar com operadora"**: o profissional num cartão, e um item
por documento com a caixa de seleção, o arquivo, a validade e a situação à direita.
Três decisões dentro dele:

- **Só documento com arquivo entra na lista.** É `canShare` dito em outra forma — a
  operadora audita o papel, e registro sem anexo é recusado como se não existisse.
  Mostrar a linha desabilitada convidaria a marcá-la; o que falta ali é o anexo, e
  ele se resolve na pasta do profissional. Sem nenhum anexo, o drawer diz isso.
- **A pastilha "Exigido"** marca o que *esta* operadora pede. É o que separa o
  documento que destrava o credenciamento do que só engorda a pasta — a Unimed pede
  quatro tipos e a SulAmérica dois.
- **Desmarcar é revogar,** como na pasta do profissional. E a data de
  compartilhamento dos que já estavam lá é preservada: ela é quando a operadora
  passou a enxergar aquele papel, não quando alguém abriu o drawer.

As linhas viraram estado da tela porque o drawer escreve nelas: a contagem da coluna
Documentos, a situação do credenciamento e a própria ação da linha são todas
derivadas do compartilhamento. Sem estado, concluir o drawer não mudava nada e a tela
dizia a mesma coisa de antes.

E um defeito de componente que só aparece dentro de tabela: **o painel do `Dropdown`
era cortado pela borda da tabela.** O container de `Table` tem `overflow-x-auto` para
a rolagem horizontal, e um painel `absolute` ali abre pela metade. O painel passou a
ser posicionado por `fixed` num portal para o `body`, acompanhando o gatilho no
`scroll` e no `resize` — a mesma solução que `LazyTabs` já usava para os menus de
grupo, pelo mesmo motivo. Junto veio o óbvio que faltava: **escolher uma ação fecha
o menu**, que antes ficava aberto atrás do drawer que a ação tinha aberto.

### Operadoras ganhou lista

A frente Operadora não tinha entrada: o item de menu abria a ficha da Unimed
direto, e quem chegava pelo link não sabia que existiam outras quatro. Agora ela
tem a mesma anatomia das outras duas — lista com duas abas, e a ficha a um clique
da linha.

**Cadastro é o espelho de `health_care_live/index.ex`:** os três filtros de lá —
Nome, Registro ANS, Cidade — e as quatro colunas de lá — Nome, Registro ANS,
Endereço, Cidade. Duas notas sobre o que ficou de fora e por quê:

- **`plan_count` não é coluna da lista, e não inventei uma.** No monólito ele é
  virtual e só é calculado em `get_health_care!/2`, na ficha; o `list/1` nem conta.
  Uma coluna dessas custaria uma consulta por linha.
- **O grid do original é `md:grid-cols-3 lg:grid-cols-4` para três campos**, o que
  deixa a quarta coluna vazia no desktop. Aqui são três colunas: a sobra não é
  decisão.
- **Não há bolinha de situação na coluna do nome**, ao contrário de unidades e
  profissionais. A operadora não tem campo de ativa/inativa no schema, e um ponto
  colorido afirmaria um estado que o cadastro não guarda.

**Documentação é a aba nova,** e é a mesma decisão das outras duas frentes: a
pergunta "quanto da clínica cada convênio já aceita" é sobre a lista inteira, e
responder por operadora obriga a abrir cinco fichas para descobrir qual delas ainda
não credenciou ninguém. As colunas são **Exige** (quantos tipos a operadora pede),
**Profissionais credenciados** com barra, **Situação da equipe** em pastilhas por
estado, **Unidades aceitas** e **Documentos a juntar**.

"Exige" é a coluna que explica as outras: a SulAmérica pede dois documentos e a
Unimed quatro, e é por isso que a mesma clínica está credenciada numa e não na
outra. Tudo derivado das mesmas regras da ficha — `credentialStatus`,
`unitCredentialStatus`, `missingForInsurer` —; fosse campo, a lista e a ficha
discordariam no primeiro documento vencido.

**"Documentos a juntar" conta documento, não pessoa.** Uma operadora que exige
quatro tipos e recebeu um cobra três de cada profissional, e é o número de papéis a
juntar que dimensiona o trabalho.

E **as cinco fixtures por operadora saíram.** A ficha passou a ler da lista pelo id
da rota — `comoFicha`, o mesmo que a pasta da unidade já fazia —, e com as duas
formas registradas escolher a fixture da Unimed com a lista aberta entregava à lista
um dado sem `insurers`, e a tela quebrava. Uma fixture por frente, servindo lista e
ficha, é a regra das outras duas. Ficaram duas: as cinco operadoras, e a clínica
que só atende particular.

Por consequência, **"Voltar para lista" deixou de estar desabilitada** no menu de
três pontos da ficha, e a migalha "Operadoras" virou link: agora existe para onde
voltar.

### O cabeçalho da operadora

A ficha da operadora tinha o cabeçalho que eu havia inventado: etiqueta "Ativa"
que a operadora não tem, "Plano de saúde" que o sistema não escreve, e duas
contagens de credenciamento no lugar dos campos do cadastro. O
`health_care_live/components/card_header.ex` mostra outra coisa, e mostra pouco —
nome, registro ANS, quantos planos, telefone e e-mail — mais o botão **Observações**
e o menu de três pontos. É o que está aqui agora, com a anatomia de lá: avatar
`extra_large`, os blocos em `space-y-2`, a linha de contato em `gap-5`.

**As abas passaram a ser as de `show.ex`** — Dados da Operadora, Endereço, Tipos de
Planos, Contratos, Financeiro, Auditoria, Usuários —, no lugar das cinco que eu
tinha escrito. Duas fidelidades que não são enfeite: **Financeiro é um menu**, com
Autorizações e Faturamento dentro, e é por isso que tem seta; e **Auditoria e
Usuários dependem de `health_cares.edit`** — no `show.ex` as duas entradas são um
`&&` com a policy, então sem a permissão elas não ficam desativadas, ficam
ausentes.

**Documentos é a nova, e entra depois de Contratos.** Não no fim: é onde ela
pertence pelo assunto — contrato e credenciamento são a mesma conversa, e Auditoria
e Usuários são administração do cadastro — e no fim ela caía atrás da rolagem
horizontal, com a aba ativa invisível ao abrir a ficha.

Três coisas de dado vieram com o cabeçalho:

- **O ANS ganhou o formato do changeset.** `~r/\d{5}-\d/` — cinco dígitos, hífen e
  o verificador. A fixture tinha "339679", seis dígitos corridos, que é como o
  número se escreve em prosa e é o que o próprio cadastro do sistema recusaria.
  Agora é "33967-9".
- **`InsurerProfile` separa o cabeçalho da referência.** `DocumentInsurer` continua
  leve — id, nome, natureza, exigências — porque é ela que viaja nas listas;
  telefone, e-mail, contagem de planos e observação só a ficha carrega.
- **Só a Porto tem observação,** e é ela que acende o sino do `notification_badge`.
  Um sino nas cinco não mostraria a diferença entre ter e não ter texto escrito.

Duas divergências deliberadas. **"Voltar para lista" está desabilitada**, com o
motivo no `title`: a lista de operadoras não foi portada, e um link que erra a rota
é pior que um item que diz por que não vai. E **"Excluir Operadora" aparece
desabilitada** sem `health_cares.edit`, onde o original a esconde — a convenção do
produto para ação bloqueada é mostrar e desabilitar, decisão 0003.

Uma correção que saiu daqui e vale para todo mundo: **`Tag` com ícone estava
colando o ícone no texto.** No HEEX o `<%= @item %>` e o `<.icon>` estão em linhas
separadas, e a quebra vira espaço no HTML; em JSX ela desaparece, e a etiqueta saía
"ANS: 33967-9#".

### Duas mudanças fora da tela

**"Profissionais" no menu e nas migalhas aponta para a lista de três abas**, e
não para `/team`. `/team` continua existindo e serve os dez cenários portados da
equipe, que se alcançam pela navegação do Design Space — não pelo menu do
produto. Sem isso, clicar em "Profissionais" saía da lista nova e caía na antiga.

**O drawer mostra só o item da aba aberta.** Vendo unidades, ele mostra Unidades;
vendo operadora, Operadoras; vendo profissionais, Profissionais; vendo as listas
gerenciais, Listas gerenciais — cada um com o ícone do sistema. `NAV` continua
completo em `AppShell.tsx`: ele é o espelho do menu real, com os rótulos e a
ordem do sistema, e é o registro de onde cada tela mora. Quem escolhe o que
aparece é a função `frenteAberta`, e trocá-la por um `filter` de permissão devolve
o menu inteiro. Vale saber o custo: **enquanto ela existir, o menu não é mais o
espelho do menu do monólito**, e as afirmações de `journey.spec.ts` sobre os
dezoito itens ficam desatualizadas — aquele arquivo é registro histórico e não roda
na suíte, mas quem o ler vai encontrar um menu que a tela não mostra mais.

A conta é pelo **primeiro segmento da rota**, declarado em `segmentos` por item, e
não por prefixo de `path`: o `path` de Unidades é `/structure/documents`, e a pasta
de uma unidade é `/structure/unit-girassol/documents`, que não começa por ele —
por prefixo, a aba aberta não acendia item nenhum. Rota que nenhum item reivindica
— `/notifications`, que no sistema se alcança pelo menu da pessoa — deixa o trilho
só com a marca, o que é preferível a inventar um item: o drawer diz onde você
está, e ali você não está em item nenhum.

Para navegar de verdade, as três frentes ganharam **`scenario`**, e é a parte
que a engenharia não precisa reproduzir: é ferramenta do Design Space, não do
produto. Cada situação declara a própria persona, e um link só de rota chega sem
persona nenhuma — a documentação da unidade é de `services.list`, a da operadora é
de `health_cares.show`, e People, que cuida de profissionais, não tem nenhuma das
duas. Sem a situação no destino, clicar em Unidades respondia "você não tem acesso
às unidades".

Por consequência, **o item da aba aberta não é filtrado por permissão**. O `:if` do
layout real pergunta se esta pessoa alcança a tela, e é a pergunta certa quando o
menu oferece dezoito destinos; aqui ele oferece um, o da tela que já está aberta, e
quem chegou até ela passou pelo guarda da situação. Perguntar de novo esconderia o
item justamente onde ele é verdade.

"Unidades" passou a apontar para `/structure/documents`, e não para `/structure` —
mesma troca que "Profissionais" fez, e pelo mesmo motivo: a tela do trabalho ativo
é a pasta, e a antiga continua alcançável pela navegação do Design Space.

O resumo da pasta também passou a esconder contagem zero. "0 a vencer" e "0
expirados" gastavam duas etiquetas para dizer que não há nada a fazer, e diluíam
as duas que dizem que há — a ausência de vermelho é a informação, e escrevê-la em
vermelho a transforma em ruído da cor mais forte da tela.

## Limite da entrega

`/team` e a tela `Team` não mudam: são cenários portados, e o detalhamento que
eles explicam — assinatura de supervisor, nota fiscal do fechamento — não é
assunto desta lista. O que saiu de lá foi o alternador de duas posições, que
agora é um link para a lista nova.

`pagination/1` continua não portado — é a decisão 0006, o Design Space não pagina
—, e o rodapé mostra a contagem.

A célula de ausência distingue obrigatório de não obrigatório, o que o
`DocumentState` não faz: vermelho para o que falta e é exigido, traço cinza para
o que a clínica quer ver e não cobra. É apresentação, não regra nova — nenhuma
função de `src/rules/documents.ts` mudou.

## Consequências

- Filtrar por especialidade e trocar de aba mantém a lista: as três abas
  compartilham a lista de pessoas, não os filtros. Cada aba guarda os seus, e
  isso é intencional — os conjuntos não são os mesmos.
- A engenharia precisa saber que o controle de horas deixa de ser rota própria.
  O "Voltar para profissionais" e o header "Controle de horas de profissionais"
  desaparecem por consequência.
- A matriz de documentação continua sendo proposta, não porte. Implementá-la
  exige um catálogo de tipos por escopo, que o monólito hoje não tem.
- Quem for fixar coluna em outra tabela do espelho já encontra o problema de
  opacidade resolvido no componente, e não vai gastar a tarde procurando por que
  `sticky` não pega.
- O mês inicial do controle de horas vem do `now` da fixture, não do relógio.
  No sistema real vem de `Date.utc_today()`.
