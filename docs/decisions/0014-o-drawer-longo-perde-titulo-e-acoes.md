# 0014 — O drawer longo perde título e ações

**Data:** 2026-08-19
**Situação:** proposta

## Contexto

O `drawer_modal/1` do sistema rola o painel inteiro: `overflow-y-auto` fica no
container, e cabeçalho, conteúdo e ações rolam juntos. No formulário de documento
do profissional isso tem três consequências, todas observadas na pasta de
`documents.professional`:

1. O título — que é a única coisa que diz **qual** documento está sendo anexado,
   porque o tipo é fixo e vem do slot padrão — sai de vista assim que a pessoa
   começa a preencher.
2. "Adicionar documento" fica depois do fim do conteúdo. Com validade definida e
   seis operadoras listadas, salvar exige rolar até o fim para procurar o botão.
3. A lista de compartilhamento repetia o mesmo motivo de bloqueio uma vez por
   operadora. Sem arquivo anexado, o campo mostrava seis parágrafos idênticos —
   o texto mais longo do formulário era a explicação de por que nada podia ser
   feito ainda.
4. O campo de arquivo era um `input type="file"` nativo, e o sistema real usa
   `BloomyWeb.FileUploaderComponents` na variante `simplified` neste exato
   formulário: área de arraste tracejada, `fa-file-arrow-up` e "Escolha um
   arquivo".
5. A ação primária dizia "Adicionar documento". No sistema o botão é
   `Salvar`, com `right_icon="fa-save"`.

## Decisão

**O painel passa a ter três divisões, e só o miolo rola.** Cabeçalho e um
`footer` opcional ficam presos nas bordas; o conteúdo recebe `overflow-y-auto`.
Sem `footer`, o painel continua tendo exatamente as duas divisões do HEEx, e as
ações podem continuar no fim do conteúdo — nenhuma tela existente muda de
comportamento por essa adição.

**"Compartilhar com operadoras" passa a ser um `multi_select_search`,** a
cláusula de `input/1` que o sistema já tem para escolha múltipla, no lugar da
lista de checkboxes. As escolhidas viram etiquetas dentro do gatilho, o painel
não fecha a cada marcação, e "Limpar" zera a seleção.

**Operadora bloqueada continua na lista, desabilitada, e o motivo fica visível
abaixo do campo** — fora do painel, que fecha. A opção aponta para o motivo por
`aria-describedby`. Motivos idênticos são agrupados numa linha só: a causa é uma,
a frase é uma. É a decisão 0003 aplicada a um campo em vez de um botão.

**Escolher a operadora não depende do arquivo; salvar depende.** A escolha é
intenção declarada no formulário, e exigir o anexo antes dela invertia a ordem do
trabalho: a pessoa decidia de cabeça, anexava e decidia de novo. A regra foi
separada em duas — `canSelectInsurer` (permissão e particular) decide a escolha, e
`canShare` continua decidindo o compartilhamento efetivo de um documento que já
existe, arquivo incluído. Enquanto o anexo falta, o campo diz o que a escolha
ainda não fez, com `role="status"`, e o salvar recusa com o erro no campo do
arquivo.

**O campo de arquivo passa a ser a área de arraste do sistema.**
`FileUploaderComponents`, variante `simplified`, portado com o cartão do arquivo
escolhido e `format_byte` na mesma base 1000. Duas correções intencionais: o
"Escolha um arquivo" é um `button`, não um `span` com `phx-click` — no original
o teclado não alcança o gatilho —, e o input escondido tem rótulo e descrição
associados. Um arquivo por documento, porque `ProfessionalDocument.file` é um
arquivo só; o modal real aceita seis.

**A ação primária é "Salvar", com `fa-save` à direita,** como no
`add_document_professional_modal.ex`. O rótulo não muda entre criar e editar: no
sistema não muda.

**O painel é reto.** Esta é a única divergência do original que não corrige nada:
`drawer_modal/1` arredonda o canto interno (`rounded-l-2xl` à direita,
`rounded-r-2xl` à esquerda) e aqui não. É escolha de design do time, registrada
para que a engenharia não a leia como descuido do porte — e para que reverter seja
uma decisão, não uma correção silenciosa.

**Os campos do formulário usam os componentes do sistema, não marcação solta.**
"Validade" era um `fieldset` com dois `input type="radio"` sem estilo; passa a ser
`radio_group/1`, com a opção marcada ganhando fundo `brand-blue/20`. O rótulo de
"Arquivo" era `text-base` em `brand-purple-dark`; passa a ser o `label/1` do
sistema — `text-sm/4`, negrito, `brand-blue` — o mesmo dos outros campos.
`RadioGroup` ganhou `fieldset`/`legend`, como `Checkgroup` e `FakeRadioGroup` já
tinham: o original usa `div` e o rótulo do grupo fica sem vínculo com as opções.

Duas correções que o campo novo exigiu e que valem para o `Select` também:

- **O painel flutuante vai para o `body` por portal.** `position: fixed` não
  basta: o `DrawerModal` anima a entrada com `translate`, e um ancestral
  transformado vira o bloco de contenção do painel, então coordenadas de viewport
  passam a apontar para fora da tela. Dentro do drawer o menu do `Select` abria
  fora do painel por esse motivo.
- **Esc com a lista aberta fecha a lista, não o diálogo.** O `DrawerModal` ouve
  `keydown` na janela; sem interromper a propagação, desistir de uma opção
  fechava o formulário inteiro e descartava o preenchimento.

## Limite da entrega

A entrega é a moldura do painel, o campo de arquivo e o controle de
compartilhamento. O passo único — salvar e compartilhar juntos — permanece como
está, e é decisão do Design Space: no sistema real o modal cria o documento e
anexa os arquivos, sem compartilhamento nenhum.

Uma regra muda, e só uma: a condição do arquivo sai da escolha da operadora e
passa a ser cobrada no salvar. `canShare` não muda. Nenhum texto de motivo é
reescrito: eles continuam vindo das regras.

## Consequências

- Título e ações ficam visíveis em qualquer altura de conteúdo e em qualquer
  altura de janela; o formulário rola por dentro.
- O campo de compartilhamento passa de seis linhas de motivo a uma por causa, e
  ocupa uma linha quando nada está bloqueado.
- Compartilhar com várias operadoras deixa de exigir um clique por operadora com
  o painel fechando no meio.
- `Select` e `MultiSelect` dividem o mesmo posicionamento de painel, então
  qualquer correção de ancoragem vale para os dois.
- A engenharia precisa saber que o painel fixo é intencional: reproduzir o
  `overflow-y-auto` do container reintroduz o problema descrito aqui.
- Marcar operadora sem anexo deixa de ser impossível e passa a ser explicitamente
  pendente. Quem for implementar precisa manter as duas verificações separadas:
  uma decide o controle, a outra decide o efeito.
- `FileUploaderComponents` passa a existir no espelho, mas ainda **não** está no
  catálogo de componentes: entrar lá exige demo e a contagem do catálogo, que
  hoje fixa 49 entradas em teste.
- O canto reto vale para **todo** drawer do produto, não só para este formulário:
  o arredondamento saiu do componente, não da tela.
- `radio_group` passa a ser um grupo de verdade para leitor de tela em todas as
  telas que o usam, e não só nesta.
