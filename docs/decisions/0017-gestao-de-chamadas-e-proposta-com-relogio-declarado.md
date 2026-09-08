# 0017 — Gestão de Chamadas é proposta, e o relógio dela é declarado

**Data:** 2026-09-03
**Situação:** proposta

## Contexto

A clínica tem caixas Alexa nas salas. A recepção as usa — hoje, na unidade real —
para duas chamadas que custam uma caminhada cada:

- **o profissional**, quando a criança faz check-in e está esperando;
- **o responsável**, quando o atendimento termina.

Nada disso passa pelo Bloomy. **O monólito não tem integração de voz nenhuma**:
não há schema, policy, worker nem rota. A pessoa na recepção atravessa o
corredor, ou grita. O porte de 2026-08 não encontrou nada porque não há nada a
encontrar.

O desenho vem de "Bloomy — Gestão de Chamadas V2", do projeto de design
`backoffice bloomy`. A V2 é uma simplificação da V1: menos ruído, e o painel de
nova chamada reordenado em cinco passos que estreitam um ao outro — quem chamar,
qual criança, motivo, mensagem, onde anunciar.

O que faz a área valer a pena não é o alto-falante. É o **par evento → chamada**:
o check-in e o encerramento já existem na agenda, então a chamada pode sair
sozinha. Daí as duas origens que convivem em tudo aqui — automática, disparada
pelo evento, e manual, escrita por quem está no balcão.

## Decisão

**A área entra como `proposed`, e por isso entra na suíte automatizada.** É
trabalho ativo, não referência importada: o baseline `ported` é o que veio do
monólito, e disto não veio nada.

**Entrou com sete cenários e ficou com um** — ver "O corte de 04/09" no fim
deste documento, e a redução de dois para um em "08/09 11:54".

Sete coisas mudaram do desenho. As três primeiras são obrigação deste
repositório; as quatro últimas vieram das revisões visuais de 04/09 — e a
segunda rodada dessas revisões tem seção própria mais abaixo.

### 1. O relógio é declarado

O desenho recalcula a espera **a cada segundo**, com `new Date()` e um
`setInterval`, e usa um piso de 10:40 para a demonstração ficar coerente. Aqui
isso não pode existir: `pnpm test` roda a qualquer hora, e uma fila que reordena
e muda de cor conforme o horário da máquina não tem critério de aceite.

A espera sai de `data.now`, declarado na fixture como `"10:40"`. `NOW` posiciona
os quatro eventos em aberto em 40, 35, 10 e 2 minutos — que é o que exercita as
três temperaturas do cartão numa tela só. **Trocar `NOW` reordena a fila e muda
as cores:** é dado de cenário, não detalhe de fixture, e há teste que prende a
ordem.

O cálculo é aritmética de minutos sobre `HH:MM`, sem `Date`: as duas pontas são
horas da clínica no mesmo dia, e converter para data traria fuso e horário de
verão para uma subtração.

### 2. Campo em falta barra o anúncio, e o botão continua alcançável

O desenho valida no clique e mostra o erro embaixo do campo depois. Aqui o botão
Anunciar carrega o motivo em `unavailableReason`: fica visível, é anunciado como
indisponível, continua no Tab, e o motivo é lido no foco — decisão 0003.

Isto não é preciosismo de acessibilidade. **O custo do erro nesta tela é
público:** o erro sai pelo alto-falante da sala de espera, na frente das
famílias. Um campo não preenchido que virasse vazio produziria "responsável por
Beatriz, favor comparecer à recepção" sem dizer quem está sendo chamado. Por
isso o campo em falta fica visível como `[responsável]` e o anúncio é barrado
antes de falar.

### 3. A temperatura da espera tem palavra, e mora na etiqueta

O desenho distingue as três faixas — calma, 5 minutos, 15 minutos — pela cor da
borda do cartão. Uma cor sozinha não chega a quem usa leitor de tela nem a quem
não separa o laranja do vermelho, então a partir de 5 minutos a etiqueta diz
"Atenção" e a partir de 15 diz "Urgente", junto do número.

**Quem carrega a cor é só a etiqueta.** A primeira versão tingia o cartão
inteiro por temperatura, e na tela quatro cartões rosa e amarelo lado a lado
competiam com a etiqueta que já dizia a mesma coisa. Os cartões de estado desta
área — fila, dispositivo, regra, linha do histórico — são brancos com contorno a
10% da cor do texto, e o sinal fica num lugar só.

A regra de acessibilidade nunca dependeu do fundo, então nada se perdeu: a
palavra sempre esteve dentro da etiqueta.

### 4. A frase do cartão para em duas linhas, mas não é truncada

O desenho prende a frase entre aspas em duas linhas e corta o resto com
reticência. Isto começou recusado — o critério de aceite do cenário `calls.queue`
é que **o cartão mostre a frase pronta antes de qualquer ação**, e uma reticência
no meio do que a caixa de som vai dizer é o erro que a área existe para evitar.

A revisão de 04/09 pediu o corte de novo, e a implementação resolve as duas
coisas: `line-clamp-2` corta na **pintura**, não no conteúdo. A frase inteira
continua no DOM, continua sendo lida por leitor de tela, e vai no `title` para
quem usa ponteiro. Quem precisa conferir palavra por palavra antes de a caixa
falar tem "Editar" a um clique, com o texto num campo.

É diferente de truncar de verdade — cortar a string —, que continua fora de
questão nesta tela. E é o que agora faz os cartões de uma linha terminarem na
mesma altura, junto com o `h-full` do item 8.

### 5. As superfícies de dentro do cartão são planas

O desenho enche a caixa dos quatro números com 5% da cor do texto, e `card/1`
traz `shadow-main` em cada cartão de estado. As duas coisas saíram: os números
ficam com o contorno só, e fila, dispositivo, regra e linha do histórico ficam
brancos com contorno e sem sombra.

A razão é a mesma nos dois casos, e é a de sempre nesta área: **tudo isto está
dentro de um cartão branco.** A sombra do `card/1` é a de quem flutua sobre o
fundo da página; sobre branco ela vira uma sujeira cinza em volta de cada item de
uma lista de quatro. E o preenchimento cinza rebaixava a faixa mais alta da tela
— o resumo do dia — em relação aos cartões de trabalho, que são brancos.

`shadow-none` e a ausência de `bg-*` são da tela, não do espelho: `card/1` e
`info_card/1` continuam como o produto os tem.

### 6. O histórico é uma gaveta, e não a quarta aba

Sobraram três abas. As três são configurações do agora — a fila que espera, as
caixas de som que vão falar, as regras que disparam sozinhas —, e a recepção fica
em uma delas o dia inteiro. O histórico não é um quarto lugar para ficar: é uma
consulta, aberta para responder "a chamada dela saiu?" e fechada em seguida.

Como aba, ele cobrava sair da fila para consultar e ter de voltar. Como gaveta,
abre por cima, responde, fecha no Escape e devolve o foco ao botão — e a fila
continua atrás. É a diferença entre consultar e navegar.

O gatilho é um botão fantasma só com o ícone, ao lado de "Nova chamada", com o
nome em `aria-label` — o padrão de ação secundária já usado em Documentos do
profissional. **O contador não vem junto:** o número que a recepção precisa ver
de longe é o da fila, e ele já está na aba Ao vivo e no cartão "chamadas hoje".

Consequência de acessibilidade que vale registro: o histórico sai da subárvore do
`ButtonTabs`, e com isso sai do apagão de varredura descrito no achado abaixo.
Ele passa a ser varrido como conteúdo de diálogo, que é o que ele é.

### 7. Na regra, o nome é título e o chevron é botão

O nome da regra era uma `tag/1` que também era o botão de expandir. Duas coisas
erradas de uma vez.

Etiqueta é para dizer situação **ao lado** de um título, não para ser o título — e
a situação desta regra já vem dita por extenso duas linhas abaixo ("dispara
sozinha", "marcada, mas a automação geral está desligada", "desligada"), na mesma
cor. A etiqueta repetia sem acrescentar palavra.

E somar "expandir" ao nome faz descobrir por tentativa: clicar no nome para ver o
texto que a caixa de som vai falar não se anuncia sozinho. Agora são dois
controles distintos do lado direito, ao lado do interruptor — o chevron fantasma
abre a configuração, o interruptor liga a regra. O `aria-label` do chevron diz o
que ele abre ("Configuração de …"), porque `aria-expanded` sem nome anuncia
"expandido" e mais nada.

## A segunda revisão de 04/09

Dez itens de uma passada de revisão visual. Quatro são de padronização e não
pedem justificativa própria; os outros seis mudam comportamento ou desfazem uma
decisão anterior, e estão abaixo.

### 8. Os cartões de uma linha têm a mesma altura

O item da grade estica — `align-items: stretch` é o padrão —, o cartão preenche o
item com `h-full`, e a fileira de ações desce com `mt-auto`. Antes cada cartão
tinha a altura do próprio texto, e dois cartões lado a lado terminavam em alturas
diferentes sempre que um subtítulo quebrava e o outro não.

O desenho marca cada cartão como `self-start`, ou seja, **não** faz isto. A
revisão pediu o contrário, e o contrário é melhor: os três botões de cada cartão
passam a ficar na mesma linha do olho, e a fila lê como uma fila em vez de um
mosaico.

### 9. A gaveta tem largura declarada

`drawer_modal/1` põe `w-full` no painel dentro de um container `fixed flex` sem
largura. O container encolhe para o conteúdo, o `w-full` do painel resolve contra
esse encolhimento, e o resultado é uma gaveta que muda de largura conforme o
formulário: trocar Profissional por Responsável troca um `select` por um `input`
e a moldura inteira anda vinte pixels.

O conserto é de tela, não do espelho: `variant="custom"` com
`customSize="w-screen max-w-xl"`. `w-screen` dá largura definida, `max-w-xl`
devolve o teto do `small`, e em tela estreita o teto vira a largura da tela.
Medido: 576px nos quatro tipos de chamada.

### 10. A mensagem é um campo, não um cartão com botão

Era `inside_card/1` com a frase entre aspas e um botão "Editar mensagem" ao lado.
O cartão aninhado é para dado que veio de outro lugar e não se muda — o nome que
a agenda resolveu —, e esta frase é justamente a que mais se quer conferir e
ajustar antes de a caixa falar em voz alta. Agora é a `textarea` direto.

O texto continua gerado pelo modelo e recalculado quando a criança ou o motivo
mudam: o texto editado só existe depois que alguém digita, e volta a nulo a cada
troca acima.

### 11. "Onde anunciar" é o `checkgroup/1`, sempre aberto

Era um resumo — "Recepção + Sala de espera das famílias" — com um botão "Alterar"
que revelava este mesmo componente. Três problemas de uma vez: o resumo não dizia
o que **não** estava marcado, o botão escondia a única decisão de alcance do
painel, e uma caixa offline só aparecia depois de alguém desconfiar e clicar.

Com o grupo aberto, marcado e desmarcado ficam na mesma lista, o volume e o
público de cada caixa aparecem no rótulo, e a caixa fora do ar chega desabilitada
com a palavra "offline". O padrão continua sendo tudo que está online.

### 12. Criar o chamado é uma ação separada de anunciar

O painel só sabia falar imediatamente. Agora tem duas saídas: **Criar chamado**
põe a chamada na fila sem tocar nada, **Anunciar** faz a caixa falar. É o caso da
recepção que monta a chamada com a criança na frente dela e chama quando a sala
estiver livre — sem isto, a informação ficava na cabeça de alguém até a hora.

`canQueue` em `src/rules/calls.ts` tem duas diferenças de `canAnnounce`, e as
duas têm teste próprio:

- **Não pede dispositivo.** Nada vai tocar agora, e o alcance é decidido na hora
  de chamar — a caixa offline às 10:40 pode estar de volta às 11:00. Exigir aqui
  bloquearia o preparo por um problema do futuro.
- **Recusa o aviso geral.** É o único tipo sem ninguém esperando: um aviso à
  unidade é dito na hora ou não é dito, e enfileirá-lo criaria um cartão que
  ninguém sabe quando dispensar.

O resto é idêntico de propósito: um chamado enfileirado com `[criança]` no texto
é o mesmo erro público do item 2, apenas adiado para quem clicar em "Chamar" mais
tarde confiando que a frase estava pronta.

**O contrato cresceu por causa disto.** `CallEvent` ganhou `templateId?` e
`text?`. A fila da agenda é derivada — o motivo sai da regra de automação do tipo
de evento e a frase sai do modelo dessa regra —, mas um chamado criado à mão não
tem regra atrás dele: quem escolheu o motivo e escreveu a frase foi uma pessoa.
Sem os dois campos, o cartão criado apareceria na fila com o texto padrão do
tipo, descartando em silêncio o que foi digitado.

**E este comportamento não tem cenário.** Ele entra sem `expected` que o fixe,
porque a área ficou com um cenário só, e ele não exercita a criação. É dívida
declarada: se "Criar chamado" sobreviver à aprovação da área, precisa de cenário
próprio antes de virar handoff.

### 13. A fila tem filtros

Três `select/1` separados — profissional, criança, situação —, como no histórico.
A fila da recepção passa de uma tela cheia quando a unidade tem trinta crianças
em atendimento, e a pergunta que se faz nela é sempre uma destas três.

Sem busca por texto livre, ao contrário do histórico: aqui os nomes são poucos e
conhecidos, e um campo de texto convidaria a digitar um nome que a fila não tem
para receber "nenhum resultado" sem saber por quê. As opções saem da fila que
existe, não de um catálogo — um filtro que oferece um nome sem cartão atrás dele
é um beco.

**O estado filtrado se declara.** Com filtro ativo a tela diz "3 de 5 chamadas na
fila", e o filtro que não encontra nada mostra um `empty_state_card/1` que diz
quantas pendências existem fora dele. Sem isso, três selects mal notados no alto
produzem uma fila vazia que parece o dia resolvido — a leitura mais perigosa
desta tela.

### Os quatro de padronização

- **Etiquetas nas variantes do `tag/1`.** Saíram as `solid-*`, que são extensão
  da decisão 0015: `Urgente` e `Atenção` viraram `red` e `orange`, `Atendida` e
  `Falhou` viraram `green` e `red`. Fundo claro com texto forte, como toda
  etiqueta do produto. O que sustentava as cheias era "ser vista de longe", e
  isso não se perdeu: a palavra continua dentro da etiqueta (item 3).
- **O gatilho do histórico é `tint`/`brand`**, e não `ghost`.
- A frase do cartão para em duas linhas — item 4, acima.
- Os cartões de uma linha têm a mesma altura — item 8, acima.

## A chave-geral pinta o cartão dela

O desenho de 04/09 traz os dois estados do cartão da automação, e as duas cores
são de `switch_card/1` — o componente do sistema para "título, descrição e
chave":

```elixir
@activated && "bg-brand-blue/10 border-brand-blue/40",
!@activated && "bg-brand-purple-dark/5 border-transparent"
```

É o único cartão da área que muda de cor, e é o único que devia. Os outros
mostram uma situação que a pessoa lê; este mostra um estado que ela controla e
que **silencia a tela inteira**. Ligada, o cartão fica azul e diz que o sistema
está anunciando sozinho; desligada, ele apaga para o cinza de fundo e sai do
primeiro plano — que é a leitura certa, porque nada vai disparar.

Desligado não tem contorno nenhum: `border-transparent` mantém a largura da
borda para a transição não deslocar o conteúdo, e é assim no original.

**Não é o `SwitchCard` inteiro.** O espelho de `switch_card/1` existe em
`Input.tsx` e traz junto `p-3`, `rounded-xl`, título `font-extrabold` e descrição
a 60%. Aqui o cartão precisa da moldura dos vizinhos — `card/1` a 24px e raio 16
— que é o que o próprio desenho mostra: o nó se chama "Container (Bloomy Design
Space)". O que veio do sistema é o par de cores, que é a parte que o desenho
pediu. O contorno ligado usa o `/40` do componente, e não o `/50` do desenho.

### O cartão da regra é o inverso, e de propósito

O desenho dos estados da regra veio junto, e ele **não** repete o da chave:

| | chave-geral | regra |
| --- | --- | --- |
| ativo | azul a 10%, contorno azul | branco, contorno a 10% |
| inativo | cinza a 5%, sem contorno | cinza a 5%, sem contorno |

A chave fica azul quando ligada porque é um controle, e ligado é destaque. A
regra faz o contrário: é um item de lista que **recua** quando não vai fazer
nada. As duas caem para o mesmo cinza quando inativas, e é isso que faz a aba
inteira apagar junto com a chave — que é a leitura certa, porque nada dispara.

Os três campos da configuração aberta vão a 60% junto. Eles já vinham
desabilitados pelo mesmo predicado; a opacidade é o que torna isso visível antes
de alguém tentar clicar. A descrição da regra e o texto do anúncio ficam
legíveis, porque são o que se lê para decidir ligar.

**O que decide é `dispara`, e não `rule.on`.** Regra marcada sob chave-geral
desligada não vai disparar, então recua junto — e é o mesmo predicado que já
governa os campos. A distinção entre marcada e desmarcada não se perde: continua
no interruptor, e continua dita por extenso na linha de estado ("marcada, mas a
automação geral está desligada").

### A chave da regra mostra o estado efetivo

A revisão pediu: desligou a chave-geral, os interruptores de baixo desligam
junto. Uma fileira de interruptores azuis embaixo de uma chave-geral cinza dizia
o contrário do que a tela estava fazendo, e o pedido está certo.

**A implementação mostra, não apaga.** O interruptor de cada regra passa a
refletir `dispara` — o mesmo predicado da cor do cartão — em vez de `rule.on`.
Com a chave-geral desligada todos aparecem desligados e indisponíveis; religada,
as regras marcadas voltam sozinhas.

Era o único jeito de atender o pedido sem quebrar a razão de ser da chave-geral,
que está no início deste documento: **desligar tudo numa manhã atípica e voltar
sem reconfigurar três regras.** Zerar de fato `rule.on` teria atendido a letra do
pedido e cobrado a reconfiguração de quem já estava com a unidade em exceção.

O que a regra tem guardado continua dito por extenso na linha de estado —
"marcada, mas a automação geral está desligada" —, que passou a ser o único lugar
onde essa informação aparece. Se ela sair, a distinção entre marcada e desmarcada
some de verdade.

### O cartão do dispositivo recua, e leva as ações junto

Mesmo critério do cartão da regra: caixa online é branca com contorno, offline
recua para o cinza chapado. Uma caixa fora do ar não vai falar.

A etiqueta e a chave subiram para o alto do cartão, lado a lado. A chave estava
lá embaixo, ao lado de "Testar som" — longe da palavra que diz o estado que ela
controla, e no meio das ações. E ela **não** some quando a caixa está offline,
ao contrário do resto: é o único controle que muda esse estado.

Offline, o cartão fica só com nome, etiqueta e chave. Volume e teste de som saem
da vista — os dois só fazem sentido contra uma caixa ligada, e o volume continua
guardado, voltando com o mesmo valor.

**Isto contraria um guardrail do `AGENTS.md`**, e fica registrado: "Não esconder
ação bloqueada. Use `unavailableReason` no `Button`: o controle fica visível,
desabilitado, com o motivo associado por `aria-describedby`." "Testar som" era
exatamente isso — visível, bloqueado, com o motivo "O dispositivo está offline e
não recebe o teste".

A troca se sustenta porque o motivo não se perdeu: ele está na etiqueta
"Offline", no alto do cartão, e o controle que o resolve está do lado dela. O que
o guardrail protege é a pessoa que não descobre **por que** não pode — e aqui a
razão ficou mais visível do que estava, não menos. Ainda assim é divergência de
uma regra escrita do repositório, decidida na revisão de 04/09, e reverter é
trocar o `Button` de volta por `AcaoIndisponivel`.

### Os dois nomes resolvidos são select com padrão

Os campos "Responsável" e "Profissional" eram `inside_card/1` — o nome resolvido
pela agenda, sem como trocar. Os dois viraram `select/1` já preenchido, e a
mudança veio em duas rodadas da revisão de 04/09: primeiro o responsável,
depois o profissional.

**A agenda continua respondendo primeiro.** O que mudou é que a resposta dela
passou a ser um padrão, e não um fato. Os dois casos que o cartão não atendia:

- O responsável é **quem está na sala de espera**. Numa família em que a avó traz
  na terça e a mãe na quinta, chamar o cadastro faz a recepção anunciar em voz
  alta o nome de quem não está lá.
- A terapeuta do horário faltou e quem está com a criança é outra pessoa. O
  painel obrigava a mudar a agenda para poder chamar quem está na sala.

**E o padrão do responsável passou a sair do check-in, não do cadastro.**
`resolveTarget` olha primeiro o check-in mais recente da criança e só depois o
cadastro. Na fixture os dois coincidem, então nada muda na tela — a ordem é que
passou a estar certa.

**O contexto da agenda não se perdeu com o cartão.** Ele virou a linha de apoio
abaixo do campo do profissional — "Do próximo atendimento às 09:45 · Sala de
motricidade" — e **some quando alguém escolhe outro nome**, porque "do próximo
atendimento" seria mentira sobre um nome escolhido à mão.

Trocar de criança devolve os dois padrões: sem isso, o nome escolhido para uma
criança seguiria para a próxima, que é o erro público de sempre com outra
origem.

### O texto do anúncio da regra é campo, e a regra pode ter texto próprio

Era `inside_card/1` só de leitura, e a única forma de mexer na frase era trocar o
modelo. Mas essa é a frase que a caixa de som vai falar **sozinha**, sem ninguém
conferindo na hora: é o texto mais editável da área, não o menos.

Virou `textarea`, e o contrato cresceu: `CallAutomationRule` ganhou `text?`.
Ausente, vale o modelo — o caso normal, e o que troca junto quando alguém troca o
modelo. Presente, ganha do modelo, e `pendingCalls` passa a montar a frase da
fila a partir dele. Sem o campo no contrato, o que fosse digitado ali não teria
onde ficar.

Escolher outro modelo zera o `text` junto: uma troca de modelo é deliberada, e a
frase reescrita não deve sobreviver a ela em silêncio.

**A ordem das três origens da frase** — o que a pessoa escreveu ao criar o
chamado, o que reescreveram na regra, o modelo — está em `pendingCalls`, e cada
uma é mais específica que a seguinte.

### "Motivo" é `radio_group/1`, como "Quem será chamado"

Era `radio_selector/1`, a barra segmentada. Mesma razão já registrada para "Quem
será chamado": a barra é o componente de trocar de aba, e usá-la num formulário
faz três opções de valor parecerem navegação. As duas escolhas do painel passam a
ter a mesma forma.

Com isso o `layout="pills"` deixou de ser usado nesta tela — ele já tinha voltado
para a barra na revisão anterior, e agora a barra também saiu.

### E isso destapou um defeito no espelho do `card/1`

`extract_bg_class/1` decide se o cartão ganha `bg-white`: ganha se quem chamou
não pediu fundo nenhum. A regex foi portada literal —
`~r/\bbg-[a-z0-9_-]+(?:\/[0-9]+)?\b/` — e **não alcança o vocabulário deste
repositório**. No monólito as cores são utilitários de tema (`bg-brand-blue/10`)
e a classe casa. Aqui são valores arbitrários sobre variável CSS
(`bg-[var(--color-brand-blue)]/10`, 111 ocorrências), e o colchete faz a regex
falhar: o cartão recebia `bg-white` **junto** com o fundo pedido, e o branco
ganhava.

O cartão azul saía branco, sem erro nenhum para investigar. E não era novo: a
galeria tem uma demonstração cujo texto diz "Com `bg-*` na classe, o branco não
entra" — e que vinha renderizando branca desde sempre.

O conserto é um segundo ramo na regex, para a forma arbitrária. Não muda
comportamento: é a mesma pergunta do original ("quem chamou já deu um fundo?")
feita sobre as classes que existem aqui.

## A chave desligada, e a escala `neutral` que nunca foi portada

O desenho da chave desligada veio com valores próprios: trilho em
`rgba(43,35,91,0.1)` e contorno `#f5f5f5`. Fui ver por que a nossa parecia
lavada, e a causa não era a chave.

`switch/1` pinta o trilho desligado com `bg-neutral-50 border-neutral-100`, e o
espelho copia isso literalmente. Só que **`--color-neutral-*` não existia em
`tokens.css`**: os nomes caíam na escala padrão do Tailwind, que é cinza de
croma zero. O produto tem a escala tingida de roxo.

| token | produto | o que saía aqui |
| --- | --- | --- |
| `neutral-50` | `#f0eef5` | `oklch(98.5% 0 none)` ≈ `#fafafa` |
| `neutral-100` | `#e1deeb` | `oklch(97% 0 none)` ≈ `#f5f5f5` |
| `neutral-500` | `#776b99` | `oklch(55.6% 0 none)` ≈ `#737373` |
| `neutral-600` | `#5d507a` | `oklch(43.9% 0 none)` ≈ `#6a6a6a` |
| `neutral-900` | `#2b235b` | `oklch(20.5% 0 none)` ≈ `#262626` |

O sintoma era silencioso e espalhado: nada quebrava, tudo ficava levemente
lavado e levemente frio. A chave desligada foi só o caso onde ficou visível —
`#fafafa` com contorno `#f5f5f5` some sobre branco. Mas alcançava também o rótulo
de cada opção de `checkgroup/1` e `radio_group/1` (`text-neutral-900`, que virava
quase preto em vez do navy), o texto do botão fantasma, o círculo do
`empty_state_card/1` e o trilho de `lazy_tabs/1`.

Os valores **já estavam** no arquivo, sob os nomes `ink-*` e `navy-*`, que é o
vocabulário das telas antigas desta pasta. Faltavam sob o nome que os espelhos
usam, que é o do monólito. A escala inteira entrou, de
`assets/css/app.css:22-32`.

**A chave desligada ficou com os valores do produto, não com os do desenho:**
trilho `#f0eef5`, contorno `#e1deeb`. É praticamente o tom desenhado no trilho —
`#f0eef5` contra `#eae9ee` — e diverge no contorno, que o desenho põe em
`#f5f5f5`, quase invisível, e o produto põe em `#e1deeb`, que desenha a borda do
trilho contra o branco. Fica o do produto, pelo mesmo critério das outras
correções desta rodada; trocar é uma linha, se a decisão for pelo desenho.

## Telefone e tablet

A pergunta foi feita na revisão de 04/09, e ela é legítima nesta área antes de
qualquer outra: **a razão de existir da gestão de chamadas é a recepção não
atravessar o corredor a pé.** Uma tela que só funciona no computador da recepção
resolve metade do problema — quem está com a criança no colo, no corredor,
precisa poder chamar dali.

### Antes de tudo: o preview mentia

A revisão chegou com um print do preview em "celular" mostrando menu lateral de
72px, cartões em duas colunas e abas largas espremidas num palco de 375px. O
print estava certo sobre o que a tela mostrava **ali**, e errado sobre o que um
telefone de verdade mostraria — e a causa não era desta tela.

O Design Space renderiza a tela dentro de `.ds-stage`. Quando alguém escolhe um
viewport, quem encolhe é o palco: **a janela do navegador continua larga.**
`md:` e `lg:` são consultas de mídia e seguem a janela, então nada disparava.

O motor já tinha previsto isso — `.ds-stage` declara `container-type:
inline-size` no CSS dele. Faltava a tela usar consultas de **container**.
`tokens.css` ganhou quatro nomes com os mesmos valores dos pontos de quebra, e a
tela e o `AppShell` passaram a usá-los:

| nome | valor | equivale a |
| --- | --- | --- |
| `@phone` | 36rem / 576px | — |
| `@tablet` | 48rem / 768px | `md` |
| `@desktop` | 64rem / 1024px | `lg` |
| `@wide` | 80rem / 1280px | `xl` |

Numa janela de verdade o palco tem a largura da janela e os dois jeitos dão o
mesmo resultado; no preview, só o container acerta. Medido no palco de 375px com
janela de 1440: drawer 0, conteúdo 375, fila em uma coluna, abas sem rolagem.

**Isto muda a revisão de todo o repositório, e é um ganho:** com os painéis do
Design Space abertos o palco fica em torno de 620px, e agora as telas respondem a
isso em vez de fingir que estão em 1280. Foi o que quebrou um caso de
`navegacao.spec.ts`, que passou a abrir a tela com o chrome escondido para medir
o comportamento de desktop.

Os espelhos de `bloomy/` continuam com `md:`/`lg:` onde o monólito os tem — são
seis ocorrências, todas cosméticas, e trocá-las quebraria a cópia.

### As abas no telefone são só o ícone

Com rótulo, quatro abas pedem 431px. O trilho rolava para o lado dentro do
cartão, e trilho que rola esconde aba: quem não arrasta não descobre que existe
"Automação". Abaixo de `@phone` fica só o ícone, e as quatro cabem.

O rótulo vira `sr-only` em vez de sumir: ele continua sendo o nome acessível da
aba, porque o ícone é `aria-hidden` e uma aba sem nome não anuncia nada. Só vale
quando a aba tem ícone — o espelho puro de `button_tabs/1`, que não tem ícone,
continua mostrando o rótulo em qualquer largura.

#### Correção de 08/09: o rótulo sumia no desktop também

A regra tinha sido escrita como `sr-only @phone:not-sr-only` — esconde sempre,
revela de `@phone` para cima. **`not-sr-only` dentro de variante de container
não gera CSS nenhum no Tailwind 4**, e sem a regra de revelação sobrou só o
`sr-only`: as três abas ficavam com o ícone em qualquer largura, inclusive num
palco de 1736px. A revisão apontou pelo sintoma ("as abas deveriam ter rótulo no
desktop e no tablet"), e a causa era essa.

O conserto inverte a regra: `@max-phone:sr-only`. O caso largo passa a ser o
padrão sem variante — que sempre existe — e a variante cuida só do estreito. É
a forma a preferir sempre que a escolha for entre esconder no estreito e revelar
no largo: uma variante que não gera CSS falha silenciosamente para o lado de
esconder, e esconder rótulo não quebra layout nenhum, então nada avisa.

Junto foram duas coisas mais:

- **O trilho não rola mais.** `overflow-auto` era a rede de segurança para o
  rótulo que não cabia; com o rótulo fora no telefone, ela nunca disparava por
  bom motivo — só transformava transbordo em aba escondida. Saíram
  `overflow-auto`, `thin-scrollbar` e o `max-w-full` que existia para eles. Se o
  trilho não couber ao lado das ações, é o `flex-wrap` do grupo que o desce uma
  linha, e a aba continua visível.
- **A aba "Ao vivo" perdeu o contador.** O `badge` com o tamanho da fila
  repetia, dentro do trilho, o número que o cartão "na fila" já dá logo abaixo —
  e o trilho aqui é navegação de três configurações do agora, não um painel de
  pendência. A extensão `badge` do `ButtonTabs` fica (Profissionais usa, e ali o
  número não está em nenhum outro lugar da tela).

### Segunda rodada de 08/09: o quadrado, o marcador e a caixa do ícone

Três achados da mesma revisão, e os três eram medida errada em vez de desenho
errado.

**O marcador escapava do trilho.** A altura dele era fixa — `h-10` em `small`,
`h-12` em `normal` — e só `normal` casava, porque ali o botão dá exatamente
48px. Em `small` o botão dá 36 contra 40 do marcador, e no telefone, onde a aba
fica só com o ícone e não há texto para dar altura de linha, dá 28. Um marcador
de 40 numa caixa de 28 sobra 12px, e o `p-2` do trilho tem 8: ele saía por cima
e por baixo da moldura. Lido de longe, era uma aba solta fora do frame — foi
assim que a revisão descreveu.

O conserto tira o número: o marcador passa a medir `offsetHeight` e `offsetTop`
do botão ativo, como já media `offsetWidth` e `offsetLeft`. O `normal` continua
idêntico (48 = 48), e os outros dois casos param de errar. **Marcador que
persegue um elemento não deve ter medida própria** — a que existia acertava um
dos três tamanhos por acidente.

**Aba só com ícone não era quadrada.** Sem rótulo sobra o recuo horizontal, e a
largura passa a ser a do glifo: `fa-users` dá 36, `fa-tower-broadcast` 34,
`fa-clock` 32. Três abas em sequência, três tamanhos. Agora a aba sem rótulo é
`size-9` em `small` e `size-12` em `normal` — quadrada, e o lado é a altura que
ela tem com rótulo, então nada muda de estatura ao atravessar o `@phone`.

**O contador virou canto, em vez de sumir.** Inline ele era o que impedia o
quadrado: a aba com contador media 65px contra 36 e 32 das vizinhas. Sumir com
ele no telefone custaria a informação — a Documentação do profissional é a única
tela onde esse número aparece. Então ele sai da linha e vira sobreposição de
canto, que é o tratamento que o sistema já dá a contador de botão:
`notification_badge` do `button/1` é `absolute -left-1 -top-1` no sino do
cabeçalho. Aqui vai à direita, porque a esquerda de uma aba encosta na vizinha.
Cabe dentro do `p-2` do trilho, e não é recortado — o que só é verdade depois de
o `overflow-auto` ter saído.

**A caixa do ícone de `info_card/1` não era quadrada.** `h-8 w-8` no código,
`32x17` na tela: ela é item de flex e cedia largura para o número e o rótulo do
lado, e o quanto cedia variava com o tamanho do rótulo — 17px em "precisam de
atenção", 25 em "atendidas". Faltava `shrink-0`. Vale para todo lugar que usa o
componente; o caso mais apertado desta tela — os quatro números em duas colunas
num telefone — é só onde apareceu primeiro.

O relógio do histórico continua **fora** do trilho, e isso é de propósito: ele
abre gaveta, não troca de aba (seção 6). No telefone ele fica ao lado da moldura
das abas, e é para ler como outra coisa mesmo.

### Terceira rodada de 08/09: devolver linha de texto ao telefone

Quatro achados, e os quatro vinham do mesmo aperto. Num palco de 375px o cartão
da fila dava **247px de conteúdo**, e nele moram o nome, a etiqueta de urgência,
duas linhas de meta, a frase entre aspas e três botões. Não sobrava largura para
nada, e o que cedia era sempre o texto.

**O cartão recua 16px no telefone.** `card/1` tem `p-6` fixo, e 24px de cada
lado num palco de 375 deixam 295px de cartão para 247 de conteúdo. `@max-phone:p-4`
devolve 16px por cartão. É extensão sobre o original — a primeira em `Card.tsx`
— e vale para todo `card/1` do repositório de propósito: o cartão é o mesmo em
qualquer tela de telefone, e o aperto também.

**`info_card/1` empilha.** Lado a lado, a caixa do ícone mais o `gap-4` levam
48px, e sobram 199 para número e rótulo. "precisam de atenção" não cabe em uma
linha nesse espaço e quebrava em três — e como os quatro números do dia ficam em
duas colunas no telefone, três deles saíam de alturas diferentes. Empilhado, o
rótulo tem a largura inteira.

**Chamar e Editar ficam só com o ícone.** Os três botões escritos pedem 245px
contra 247 de cartão: couberam por um fio e quebravam em duas linhas na frase
mais longa, que é "Chamar novamente". Os dois que perdem o texto são os que têm
ícone falante — megafone e lápis — e são as duas ações que a recepção repete o
dia inteiro; **Dispensar continua escrita**, porque não tem ícone no sistema e é
a que tira o cartão da fila.

Aqui o nome vai em `aria-label`, e **não** em `sr-only` como nas abas: no botão
o rótulo *é* o conteúdo, e um `sr-only` deixaria "Chamar novamente" ocupando
altura de linha dentro de um quadrado de 48px. Nas abas o rótulo é irmão do
ícone e sai do fluxo sem levar nada consigo. Duas técnicas para o mesmo efeito,
e a diferença é onde o texto mora.

**O campo de texto cresce em vez de rolar.** Tinha 120px, e a frase padrão dá
quatro linhas num telefone: duas visíveis e duas atrás de uma barra de rolagem
de 245px de largura, dentro de uma página que também rola. Quem edita o anúncio
precisa ler a frase inteira antes de mexer, e ninguém confere o que não vê.
`rows` continua sendo a altura inicial e `min-h-24` o piso — o campo cresce, não
encolhe abaixo do tamanho em que foi desenhado.

Duas armadilhas na implementação, e as duas dão erro silencioso:

- **`height: auto` antes de ler `scrollHeight`.** Com altura fixa aplicada,
  `scrollHeight` devolve o maior entre conteúdo e caixa, e o campo que cresceu
  uma vez nunca mais encolheria ao apagar texto.
- **A borda entra na conta.** `scrollHeight` é conteúdo mais recuo e não inclui
  borda; `height` é `border-box`, que é o padrão do Tailwind. Atribuir um ao
  outro deixa a caixa 2px curta, e com `overflow-hidden` esses 2px comem o rabo
  da última linha. Medido antes do conserto: conteúdo de 224px numa caixa de 224
  com 222 de área útil. O teste mede `clientHeight` contra `scrollHeight` por
  isso, e não a altura da caixa.

E a largura reposiciona junto, porque a quebra de linha muda com ela: o mesmo
texto que dá duas linhas no palco largo dá quatro no de 375. Um `ResizeObserver`
que reage **só** à largura — a altura é o que este código mexe, e reagir a ela
seria um laço.

### 08/09 11:46: caixa ligada vem primeiro

A aba Dispositivos vinha na ordem do cadastro, e nela a caixa desligada caía no
meio das ligadas. Isso cobra nas **duas** leituras que a aba tem — quem procura
onde a chamada vai sair varre a lista inteira porque a resposta está espalhada,
e quem procura o que está quebrado também. Offline no fim atende as duas de uma
vez: o rodapé passa a ser, literalmente, a lista de caixas para consertar.

A revisão ofereceu duas saídas — "separe ou ordene". Ordenar num bloco só, e não
dois blocos com título, porque a lista tem cinco cartões no cenário e dois
títulos para cinco itens é mais moldura que conteúdo. A cor já separa: cartão
ligado é branco com contorno, desligado é cinza sem sombra.

Ordenação **estável**, e isso é o que faz a coisa funcionar ao vivo: dentro de
cada grupo a ordem do cadastro se mantém, então virar uma chave move **só**
aquele cartão. Sem estabilidade, um clique embaralharia os outros, e a lista de
caixas para consertar mudaria de ordem sozinha entre dois olhares. Tem teste
para os dois — a ordem, e o que acontece ao virar a chave.

**O preço, e é real:** desligar a chave manda o cartão para o fim da lista,
debaixo do dedo de quem acabou de tocá-la. É consequência direta de querer as
ligadas em primeiro, não tem meio-termo, e sai se um dia a aba passar a dois
blocos com título.

### 08/09 11:54: uma situação, chamada "Chamadas"

A navegação mostrava duas situações na área — "A fila da recepção às 10:40" e
"Campo em falta não vira anúncio". A revisão pediu uma só, com o nome
"Chamadas".

**O bloqueio não podia simplesmente sair.** `tests/product.test.ts` exige de
cada módulo pelo menos um cenário de exceção ou permissão — "módulo só com
caminho feliz é módulo que ninguém testou onde dói" —, e o campo em falta é o
único impedimento duro desta área, com custo de erro que sai pelo alto-falante
da sala de espera. Apagar o segundo cenário deixaria o módulo reprovando esse
teste, e afrouxar o teste para caber seria trocar uma garantia do repositório
por uma linha de navegação.

Então ele **desceu para dentro** de `calls.queue`: a regra
`an-unfilled-field-cannot-be-announced`, os três critérios de aceite, a
pré-condição do painel e a nota de teclado sobre `aria-disabled` /
`aria-describedby` estão todos lá, e as etiquetas `exceção` e `formulário`
vieram junto. A cobertura é a mesma; o que mudou é que ela cabe em uma situação.

Isso não é contorno da regra. Os dois cenários já tinham a **mesma rota e a
mesma fixture** — o que os separava era só o painel de nova chamada estar
aberto, e isso é um clique dentro da situação, não outra situação. A separação
em dois era a que estava artificial.

Duas amarras que vieram junto, e as duas são erro duro se esquecidas:

- **A ramificação da jornada.** `catalog.ts` tinha um passo com
  `decision: "O que impede este anúncio de sair?"` apontando para o cenário
  removido, e `validateProduct` trata ramificação órfã como **erro**, não aviso.
  Apontar para o próprio passo seria laço, então a decisão saiu junto com o
  destino dela.
- **O rótulo da fixture continua "A fila da recepção às 10:40"**, e de
  propósito: ele nomeia o **dado**, não a situação, e o dado é mesmo a fila das
  10:40. Trocar para "Chamadas" tiraria a única pista de que a hora de
  referência está congelada ali.

A contagem da capa cai de 7 para 6 situações registradas sozinha — ela é
derivada.

### O que estava errado, e era do chrome

O drawer do produto **sai da linha do conteúdo abaixo de `lg`**: ele é `fixed`,
fecha em `w-0`, e volta por cima com um fundo escurecido; só a partir de `lg`
vira a coluna `sticky` de 72px. O porte tinha a coluna `sticky` em toda largura.

Num telefone de 375px isso custava caro, e o custo era invisível:

| | antes | depois |
| --- | --- | --- |
| trilho do drawer | 72px sempre | 0 abaixo de `lg` |
| largura do `main` | 303px | 375px |
| conteúdo dentro do cartão | 223px | 295px |

223px é menos que a largura de um botão do sistema mais um ícone. Nada quebrava
— a tela só ficava estreita, e cada cartão da fila crescia em altura para
compensar.

Faltava também o gatilho: no original há um botão `flex lg:hidden` no cabeçalho,
com o símbolo da marca sobre o azul, que é o que abre o drawer fechado em zero. E
o fundo escurecido é `div` com `phx-click`, não botão — como botão ele duplicaria
o nome acessível do gatilho e poria uma área invisível de tela inteira na ordem
de foco.

**Isto tem teste agora** (`tests/e2e/responsivo.spec.ts`), porque é exatamente o
tipo de defeito que ninguém vê num code review: nenhum erro, nenhuma quebra, só
uma tela apertada.

### O trilho de abas vazava do cartão

Segundo defeito da mesma família. O grupo que segura trilho e ações é item de
flex sem `min-w-0`, então seu tamanho mínimo era o do conteúdo — 431px com quatro
abas. O grupo esticava além do cartão e o trilho transbordava pela borda em vez
de rolar por dentro, como `overflow-auto` promete. Só aparecia abaixo de `lg`,
onde não há largura sobrando.

### O que mudou por decisão, e não por defeito

**Os filtros da fila recolhem no telefone.** Três seletores empilhados gastam
248px — mais que a altura de um cartão — e empurravam a primeira pendência para
baixo da dobra. Quem abre esta tela no corredor quer ver quem está esperando, não
filtrar. A partir de `md` o botão some e a grade fica aberta, que é o pedido
original.

O contador no rótulo — "Filtros · 2" — não é enfeite: filtro escondido que altera
a lista é a armadilha desta tela, porque a fila filtrada parece o dia resolvido.
Com o contador no botão e a linha "3 de 5 chamadas" logo abaixo, o estado nunca
fica mudo.

**O rodapé da gaveta tem duas linhas no telefone**, e elas são declaradas em vez
de sair de um `flex-wrap`: as duas ações de confirmar dividem a primeira, Cancelar
ocupa a segunda. `flex-col-reverse` põe Cancelar por baixo sem tirá-lo da ordem de
leitura nem da de foco. A altura mudou pouco — 161px para 153px —, o que mudou é
que a saída deixou de ficar **acima** das duas ações de confirmar.

### O que não mudou, e por quê

- **A fila continua em uma coluna até `lg`.** Em tablet de 768px duas colunas
  dariam 328px por cartão — largura de telefone, com a frase do anúncio em três
  linhas e os três botões quebrando. Uma coluna larga lê melhor que duas
  apertadas.
- **Os quatro números continuam 2×2 no telefone**, ocupando 196px. Quatro colunas
  a 66px fariam "precisam de atenção" quebrar em três linhas e ficariam mais
  altos, não menos. O primeiro cartão da fila fica a 548px de uma tela de 812px,
  que é acima da dobra com folga.
- **A regra aberta ocupa 726px no telefone.** É um painel de configuração e não
  a tela de trabalho; quem o abre foi lá para configurar.

### O que fica em aberto

Duas perguntas que são de produto e não de código, e que eu não decidi sozinho:

1. **A recepção usa isto no telefone de verdade, ou só no balcão e num tablet?**
   Se o telefone for o caso principal, a aba Ao vivo merece mais do que caber:
   merece ser desenhada para ele — cartão mais curto, uma ação primária por
   cartão e as outras num menu.
2. **Chamar com uma mão só.** Hoje as três ações do cartão ficam no rodapé dele,
   e num telefone de 812px o alcance do polegar é o terço de baixo da tela. Uma
   fila de quatro cartões põe a maioria dos botões fora desse alcance.

## O espelho estava errado em três pontos, e o conserto é do espelho

A revisão apontou "botão desalinhado, ícone de botão desalinhado, muita coisa
que não é real do sistema". Fui ao monólito. Três divergências eram minhas, não
do desenho, e as três moram nos componentes — valem para o repositório inteiro,
não só para esta tela.

### `tag/1` não é um `span` de fluxo

O original abre com `inline-flex items-center gap-1`. O espelho não tinha
nenhum dos três: a etiqueta virava bloco dentro de um contêiner de coluna, e o
ícone assentava na **linha de base** do texto em vez de no centro dele. É o
desalinhamento que se via em toda etiqueta com relógio da fila.

O espaço em branco que este arquivo mantinha entre ícone e texto — com um
comentário explicando que imitava a quebra de linha do HEEx — era contorno do
mesmo buraco. Quem separa os dois no original é o `gap-1`. Saiu junto.

De passagem entrou o `pill`, que o original tem e o espelho não tinha:
`rounded-full px-3 font-bold` no lugar de `rounded px-1.5 font-semibold`.

### `ghost` do `button/1` tem fundo e realce

O original é `bg-transparent text-neutral-600 hover:bg-brand-purple-dark/5`. O
espelho tinha só a cor do texto. Sem o realce de passagem, o botão fantasma não
respondia ao ponteiro e não se distinguia de um texto solto ao lado de um botão
de verdade.

### Botão só com ícone pede `self-center` — e isso é do produto

`button/1` no tamanho `normal` alinha por `items-baseline`. Um ícone sem texto
ao lado não tem linha de base a seguir, e sobe quatro pixels acima do centro.

**O produto não conserta o componente: conserta em cada ponto de uso**, com
`<.icon class="self-center" />` — está assim em `custom_services/update.ex`,
`chat_live/chat_modal.ex` e `skill_acquisition.ex`, entre outros. O espelho
reproduz o componente como está e passa a seguir a mesma convenção: aqui, no
gatilho do histórico e no chevron da regra; e em Documentos do profissional, que
tinha o mesmo buraco. `drawer_modal/1` já fazia certo no botão de fechar.

Registrado como achado 123 no log do porte.

### O que **não** era invenção

Três coisas que pareciam suspeitas e são deliberadas, com decisão escrita:

- **Ícone e contador nas abas.** `button_tabs/1` renderiza só o rótulo. São
  extensões da decisão 0015, e o desenho desta área pede as duas.
- **`fieldset`/`legend` no `checkgroup/1` e no `radio_group/1`.** O original usa
  `div`/`label`; a troca é correção de acessibilidade documentada, e o achado
  114 registra o motivo.
- **Texto escurecido nas etiquetas.** O fundo é o do produto; o texto é o tom
  escuro da mesma família, porque oito das dez variantes originais reprovam AA.
  Decisão 0001, aplicada onde a 0016 apontou.

### E uma que era, e voltou ao original

O "Motivo" usava `layout="pills"`, extensão da decisão 0015. Ela existe por um
motivo real — a barra segmentada do sistema é uma linha só e transborda com
rótulos longos —, mas **não é o caso aqui**: medi a barra original na gaveta de
576px e ela não transborda. Voltou a ser `radio_selector/1` como o produto o tem.

## O que não mudou

A ordem das cinco seções do painel de nova chamada. É a decisão de UX da V2 sobre
a V1, e é ela que permite anunciar em dois cliques a partir do cartão da fila —
que é a diferença entre a recepção usar a tela e voltar a ir a pé.

E o auto-preenchimento: escolhida a criança, o profissional sai do próximo
atendimento na agenda e o responsável sai do cadastro, os dois resolvidos, sem
seletor. Digitar o nome é a porta de entrada do erro que a voz torna público —
chamar a terapeuta errada faz duas pessoas se levantarem e ninguém atender a
criança certa.

## Uma divergência do desenho, reproduzida e registrada

`CALL_KIND.general` declara público `family`, e o painel de nova chamada oferece
**todos** os dispositivos da unidade para o aviso geral. São duas afirmações
diferentes sobre a mesma coisa.

Reproduzo o painel, que é o que decide o comportamento observável, e mantenho o
público declarado para a etiqueta — um aviso de estacionamento na copa da equipe
é inofensivo, e é isso que o painel assume. Quem for implementar precisa saber
que a contradição está no desenho, e não no porte.

## A tela usa os componentes do sistema

Nada de peça própria onde o sistema já tem uma. A tela monta com `button/1`,
`radio_group/1` para "quem será chamado", `radio_selector/1` em pílulas para
"motivo", `checkgroup/1` para escolher os dispositivos, `select/1`, `input/1`,
`switch/1`, `card/1`, `info_card/1`, `inside_card/1`, `empty_state_card/1`,
`tag/1`, `button_tabs/1` e `drawer_modal/1`.

**A tela é um cartão branco só.** Título à esquerda, trilho de abas e "Nova
chamada" à direita, na mesma linha — é o `header` de `button_tabs/1` que produz
esse arranjo; sem ele o trilho volta ao `justify-between` do original e a ação
vai para a outra ponta. Os quatro `info_card/1` do dia ficam acima do painel e
valem para as três abas e para a gaveta do histórico, porque resumem o dia e
não a aba.

**A moldura dos quatro números é da tela, não do componente.** `info_card/1` é
ícone, número e rótulo soltos, e o espelho continua assim; a caixa que os agrupa
mora em `Numero`, no `Calls.tsx`. Não é o `card/1` que Supervisão usa em volta do
mesmo componente: lá o indicador é cartão branco com sombra entre cartões
brancos; aqui os quatro estão **dentro** do cartão branco da área, e branco sobre
branco não tem contorno para ser lido. A moldura é só o contorno — ver o item 5
abaixo.

Os botões usam o tamanho padrão do sistema — `normal`, 48px — e o ícone à
direita. O `medium` que estava neles era encolhimento meu, não do produto.

Duas consequências valem registro.

**"Quem será chamado" é `radio_group/1`, e não `radio_selector/1`.** A barra
segmentada é o componente de trocar de aba, não o de escolher um valor num
formulário — e usá-la ali fazia três opções de formulário parecerem navegação. O
rádio padrão perde o ícone de cada tipo, que `radio_group/1` não renderiza; o
público de cada um já é dito em "Onde anunciar".

**O nome resolvido pela agenda era `inside_card/1`, e não campo desabilitado.**
O argumento era que um seletor apagado com um nome dentro convida a tentar
trocá-lo, e o cartão aninhado diz que aquilo é um dado que veio de outro lugar.

**Isto foi revertido na revisão de 04/09**, primeiro para o responsável e depois
para o profissional — ver "Os dois nomes resolvidos são select com padrão",
abaixo. O argumento tinha um furo: ele compara cartão com **campo desabilitado**,
e a terceira opção — campo habilitado, já preenchido — não estava na mesa.

**A opção do `checkgroup/1` é uma linha só**, então o rótulo de cada dispositivo
carrega o público e o volume — "Copa da equipe — Profissionais, volume 5". O
desenho tinha duas linhas por caixa; as duas informações decidem a escolha e
não podiam sumir.

### O que faltou: `slider/1`

Sobrou uma peça, e é a única da tela que não é componente do sistema: o controle
de volume do dispositivo. O monólito **tem** o componente — é
`input type="slider"` em
[`lib/bloomy_web/components/core_components.ex:792`](../../bloomy/lib/bloomy_web/components/core_components.ex),
um `range` com um ponto e um rótulo por parada — e ele nunca foi portado para
este Design Space.

Deixei um `input type="range"` cru **com as classes do original** (`h-3`,
`bg-brand-blue/10`, `rounded-lg`, `appearance-none`), para que o dia do porte
seja uma troca de componente e não um redesenho.

Não portei agora por dois motivos. O primeiro é de escopo: componente novo no
espelho é decisão própria, não detalhe de uma tela. O segundo é de forma: o
`slider/1` rotula **cada** parada, e volume de 1 a 10 são dez rótulos absolutos
dentro de um cartão de dispositivo — colidiriam. Portá-lo bem exige decidir o
que fazer quando as paradas são muitas, e essa decisão não é desta tela.

### `button/1` não tem `unavailableReason`

O botão com `unavailableReason` era invenção anterior desta pasta e vive em
`primitives.tsx` até as telas antigas serem convertidas. As telas já convertidas
resolvem bloqueio com `disabled` mais `title` — e isso **perde** o que a decisão
0003 garante: `disabled` tira o botão da ordem de foco, então quem navega por
teclado nunca chega nele nem ouve o motivo, e `title` não é anunciado de forma
confiável.

Nesta tela as duas coisas convivem sem componente novo. `AcaoIndisponivel`
envolve o `Button` do sistema e passa `aria-disabled` e `aria-describedby` — que
ele repassa, porque aceita os atributos de `<button>` —, e barra o clique no
manipulador. Nenhuma classe do espelho muda.

**O motivo é `sr-only`: sai da vista, não do alcance.** Ele era duplicado de
fato — o mesmo texto já aparece em vermelho junto do campo que falta preencher,
que é onde a pessoa está olhando —, e a revisão visual pediu para tirá-lo. O que
não pode sair é o alvo do `aria-describedby`: sem ele o botão volta a anunciar
"indisponível" sem dizer por quê, que é exatamente o que 0003 existe para
impedir.

É o caso que mais pede isso: o botão bloqueado é o Anunciar, e o erro que ele
evita sai pelo alto-falante da sala de espera.

## Achado: `espelho-do-sistema` no trilho de abas apaga o conteúdo da varredura

O trilho usa `ButtonTabs`, o espelho de `button_tabs/1`. O rótulo inativo é
`--color-brand-purple-dark/60` sobre o próprio fundo: **3,74:1**, e o ativo dá
3,48:1 sobre o marcador. Reprova AA, e é o valor do produto — como o verde do
cabeçalho, achado 99 do log do porte. Por isso o trilho vai marcado com
`espelho-do-sistema`, igual a Profissionais, Unidades e Operadoras.

**O que essa marcação custa não é óbvio.** O axe da suíte usa
`.exclude(".espelho-do-sistema")`, e `exclude` remove a **subárvore inteira**. O
`ButtonTabs` envolve o painel, não só o trilho — então todo o conteúdo das abas
sai da varredura junto com as cores do produto. Nas três telas de Documentos o
efeito é o mesmo e é anterior a esta decisão: o que o axe verifica ali é o cromo
em volta, não a tela.

Não resolvi isto aqui, e o motivo é de fronteira: corrigir na origem significa
escurecer o rótulo de um componente compartilhado por sete telas, trocando a cor
do espelho — que é a decisão que 0001 tomou no sentido oposto para `tag/1`. As
duas saídas defensáveis são:

1. `ButtonTabs` receber uma classe só no trilho, para a marcação parar de
   alcançar o painel;
2. o rótulo inativo escurecer até 4,5:1, e o espelho aceitar a divergência com
   nota.

A primeira é menor e não mexe em cor nenhuma; é a que eu recomendaria.

Enquanto nenhuma acontece, **o conteúdo das abas foi verificado com axe à mão** —
incluindo só `#conteudo` e isentando o trilho e os controles marcados como
espelho, mas **não** o invólucro das abas, que é o que produziria o verde vazio.

Ao vivo e Automação passam limpas. Sobram nove nós, em Dispositivos e no
histórico — que desde a revisão de 04/09 é gaveta e já não depende desta isenção
—, e todos vêm de **dois componentes compartilhados** usando o token não
corrigido do produto — o que a decisão 0001 já resolveu no papel e não
aplicou aqui:

| Componente | Onde aparece | Cor | Medido |
| --- | --- | --- | --- |
| `Label` (`bloomy/Input.tsx`) | os três filtros do histórico e o rótulo de volume de cada dispositivo — sete nós | `--color-brand-blue` `#58bada` sobre branco | **2,22:1** |
| o texto de `prompt` do `Select` | "Todos os tipos", "Todas as situações" | `#777296` sobre `#eae9ef` | **3,75:1** |

0001 mede o mesmo `#58bada` como texto sobre branco em 2,22:1 e manda usar
`#276e8c` (5,68:1) para ação e link; e manda o placeholder em alfa 0,66
(4,80:1). Os dois componentes simplesmente não seguem. O par nunca falhou o
teste de tokens porque nunca foi declarado em `src/tokens/contrast.ts`.

Não são minhas de introduzir nem minhas de consertar sozinho: `Label` é usado
por todo formulário do repositório, e escurecê-lo muda a cor de rótulo em 64
telas. A correção é de duas linhas — o token de ação corrigido no `Label`, o
alfa de placeholder no `prompt` do `Select` — mais os dois pares declarados em
`contrast.ts` para o teste passar a protegê-los. O que falta é a decisão de
aplicá-la.

## O corte de 04/09

A área nasceu com sete cenários: a fila, o bloqueio por campo em falta, o público
inteiro offline, o auto-preenchimento pela agenda, a fila vazia, a chave-geral
desligada e o histórico. Na revisão visual de 04/09/2026 ficaram **dois**.

A razão é de escopo, e é boa: a área é proposta e ainda não foi aprovada. Sete
situações de uma coisa que ninguém decidiu construir é especificação escrita
adiantada — e a fila é o caso que carrega a intenção da área inteira.

Ficaram dois, e não um, porque `tests/product.test.ts` exige de cada módulo pelo
menos um cenário de exceção ou permissão: módulo só com caminho feliz é módulo
que ninguém testou onde dói. O bloqueio por campo em falta é a exceção desta
área — o único impedimento duro, e aquele cujo erro sai pelo alto-falante.

**O corte levou junto o que só existia para os cenários apagados**, e vale saber
o que foi:

| O que saiu | O que era |
| --- | --- |
| 3 fixtures | `calls-queue-empty`, `calls-automation-off`, `calls-devices-offline` |
| 4 regras **declaradas** | um dispositivo online basta; o público do dispositivo decide onde toca; a chave-geral silencia todas; quem chamar vem da agenda |
| 1 jornada | "Decidir o que o sistema anuncia sozinho" |

As quatro regras saíram por coerência, não por decisão de produto:
`tests/product.test.ts` exige que toda regra seja citada por pelo menos um
cenário, porque regra sem cenário não é verificável por jornada e vira texto.

**O comportamento não saiu com elas.** `callOutcome`, `devicesForKind`,
`canToggleRule` e `resolveTarget` continuam inteiros, continuam sendo o que a
tela usa, e continuam com teste de unidade em `tests/rules.test.ts`. O que se
perdeu é a declaração: hoje esses quatro acertos são lógica testada, e não regra
especificada. Voltam a ser regra quando voltar o cenário que os exercita.

## Consequências

- Uma rota, `/calls`, com três abas como estado da tela e o histórico em gaveta.
- Dois cenários, uma jornada, uma fixture e quatro regras declaradas.
- Duas saídas no painel de nova chamada: enfileirar e anunciar. A primeira é
  comportamento novo e ainda **sem cenário** — ver o item 12.
- Um item novo no `NAV` do `AppShell`, marcado com `proposta: true` e `origem`
  dizendo que não há origem. `NAV` é declaradamente um espelho do menu real, e um
  item sem aviso o corromperia: quem fosse conferir procuraria a rota em
  `backoffice.html.heex` e não acharia, sem saber se é lacuna do porte ou
  invenção.
- Oito regras com implementação em `src/rules/calls.ts` e testes em
  `tests/rules.test.ts`.
- A unidade ativa da fixture é "Vila Aurora", a mesma que o cabeçalho do
  `AppShell` mostra. O texto que nomeia a unidade é o de um impedimento
  ("Nenhum dispositivo em…"), que é o pior lugar para a pessoa ler um nome que
  não reconhece.
- Uma exceção nova em `scripts/check-button-variants.mjs`, para o "Cancelar" do
  rodapé do painel. Com ressalva: `cancelled` é situação real de chamada, e o dia
  em que a tela ganhar a ação de cancelar uma chamada em curso, essa ação é
  destrutiva e precisa da variante de perigo.
