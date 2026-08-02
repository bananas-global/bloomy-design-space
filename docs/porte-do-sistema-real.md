# Porte do sistema real para o Design Space

Log do trabalho de trazer o Bloomy que existe — o monólito Elixir/Phoenix em
`brucesantos/bloomy` — para dentro desta especificação executável.

Começou em 2026-08-01. Uma branch por módulo, `pnpm check` e `pnpm test:e2e`
verdes antes de cada commit.

## O que o Design Space era antes

Vinte e quatro cenários em três módulos — agenda, pacientes, financeiro —
descrevendo uma clínica genérica. Bom como demonstração do modelo; errado como
descrição do produto.

## O que o Bloomy é

Sistema de gestão de clínicas de **terapia ABA para autismo**. Não é uma clínica
médica genérica, e o vocabulário revela isso: programas com fases de intervenção,
generalização, manutenção e transição; protocolos ABLLS-R; tentativas com ajuda
verbal ou motora; objetivos que passam a adquiridos; aplicadores sob supervisão
formal; planos de intervenção comportamental; mapa de horas do paciente.

Superfície medida em 2026-08-01:

| | |
| --- | --- |
| Contextos de domínio (`lib/bloomy/*/`) | 39 |
| Arquivos web (`.ex` + `.heex`) | 579 |
| Rotas LiveView do backoffice | ~60 |
| Policies | 26 |
| Papéis | 10 |
| Migrações | 455 |
| Portais além do backoffice | 3 — operadora, responsável legal, público |

## Ordem de trabalho

1. **Fundação** — papéis, permissões e vocabulário reais.
2. **Clínico** — atendimentos, na-clínica, protocolos, programas, supervisão,
   prontuário.
3. **Financeiro e TISS** — fechamentos, guias, central de autorizações, operadoras.
4. **Cadastros e administração** — unidades, serviços, colaboradores,
   profissionais, gerência, notificações.
5. **Portais externos** — operadora, responsável legal, público (auto-checkin,
   anamnese, NPS).

## Andamento

### 1. Fundação — `porte/fundacao-papeis-reais`

Concluída.

- As cinco personas inventadas deram lugar aos dez papéis reais, com rótulos do
  `enums.po` do produto: Admin, Admin de Clínica, Recepção, Operação, People,
  Coordenador, Supervisor, Especialista, Terapeuta, Aplicador.
- 104 permissões derivadas das 26 policies por `scripts/gen-permissions.mjs`, que
  emite `src/personas/permissions.ts`. Nada de matriz escrita à mão.
- Os ids de permissão passaram de inventados (`agenda.cancel`, `claims.retry`)
  para os reais (`schedules.cancel`, `authorizations.hub`), casando módulo da
  policy com átomo do `can?/2`.
- Três cenários mudaram de sentido porque a permissão real contradizia o que
  afirmavam. Detalhe na decisão 0002.
- Uma correção de tela: o campo de reagendamento em `AppointmentDetail` não
  consultava permissão nenhuma. Agora respeita `schedules.edit`.

Verde: `pnpm check` e 76 jornadas Playwright.

### 2. Clínico, parte 1: o atendimento — `porte/clinico-atendimento`

Concluída.

O ciclo de vida da sessão, que é onde o Bloomy é mais Bloomy. Traduzido de
quatro módulos do monólito — `CustomServices.Create`, `Finish`,
`SignCustomService` e `RevertCustomService` — e não de uma leitura de tela.

- **Doze situações de agendamento** entraram no contrato, contra as seis
  genéricas que existiam. Cinco delas significam trabalho pendente de alguém:
  pronto, não iniciado, atrasado, pendente de registro e as duas assinaturas.
  Um desenho que trate isso como realizado/não realizado esconde justamente a
  fila que a coordenação precisa enxergar para fechar o mês.
- **Seis regras novas**, todas com implementação e teste: as três guardas de
  início, a que manda evolução vazia para pendente de registro, a ordem da
  cadeia de assinatura, e as duas de reversão.
- **Catorze cenários** e a tela `SessionDetail`, com programas, passos, fases e
  tentativas — a unidade de dado clínico do produto.
- A ordem das guardas de início foi preservada de propósito e tem teste próprio:
  o bloqueio por atendimento em aberto vem antes do bloqueio por check-in.
  Invertida, a tela mandaria à recepção quem só esqueceu de fechar a sessão
  anterior.

Verde: `pnpm check` e 115 jornadas Playwright, com axe em todos os cenários.

### 3. Clínico, parte 2: o plano de intervenção — `porte/clinico-programas`

Concluída.

Como o Bloomy decide que o paciente aprendeu. A resposta está espalhada por
quatro lugares do monólito — `Programs.PhaseConfiguration`,
`MoveProgramToAcquired`, `MoveObjectiveToAcquired` e as consultas
`has_unaquired_step?` e `has_unacquired_program?` — e não é enunciada em
português em lugar nenhum, nem na interface.

- **A hierarquia de quatro níveis** entrou no contrato: meta, objetivo, programa,
  passo. A aquisição sobe por ela em cascata, e é assim que o plano avança sem
  ninguém marcar nada à mão.
- **Seis regras novas.** A que mais muda desenho é
  `consecutive-differs-from-cumulative`: o mesmo histórico fecha um critério e
  não fecha o outro, e uma barra de progresso apaga a diferença.
- **Nove cenários** e a tela `InterventionPlan`, que mostra o critério por
  extenso — "80% de acerto em 3 sessões consecutivas, 2 feitas" — em vez de só
  "2 de 3". Prever a próxima sessão é o trabalho de quem coordena.
- Uma correção do bloco anterior: as fases do passo são `baseline`,
  `intervention`, `generalization`, `maintenance` e `acquired`, do schema
  `Programs.Step`. Eu havia modelado a lista que aparece no `enums.po` sob
  `Programs.Program`, que inclui "Transição" e não inclui linha de base.

Verde: `pnpm check` e 142 jornadas Playwright, com axe em todos os cenários.

### 4. Clínico, parte 3: protocolos — `porte/clinico-protocolos`

Concluída.

A avaliação de onde o plano nasce. Um protocolo tem dezenas de itens e é
aplicado ao longo de várias sessões — e é isso que transforma duas coisas que
pareceriam detalhe de interface em regra de negócio.

- **Onde a aplicação retoma.** `ProtocolNextQuestion` busca o primeiro item em
  branco em três etapas: resto da área atual, áreas seguintes, e só então o
  protocolo desde o começo. A terceira etapa é o que recupera item pulado lá
  atrás; sem ela, quem voltou uma área para corrigir algo ficaria preso.
- **O que o percentual significa.** `CalculateProtocolExecution` mede
  preenchimento, não desempenho. São leituras opostas do mesmo número, e a
  segunda vira conversa com a família. A tela nunca mostra o número sozinho.
- **Os dois formatos.** No padrão, a escala de resposta é compartilhada por todo
  o protocolo. No ABLLS-R, cada item tem faixa numérica própria — e faixas
  diferentes convivem na mesma área.

Cinco regras, sete cenários, a tela `ProtocolApplication` e dezesseis testes.

Verde: `pnpm check` e 164 jornadas Playwright.

### 5. Clínico, parte 4: na clínica — `porte/clinico-na-clinica`

Concluída.

O quadro da unidade, e o que o check-in faz com a agenda do dia. É a única tela
do Bloomy que se atualiza sozinha: assina o canal de check-in e recarrega a cada
sessenta segundos. Painel de parede da recepção, não relatório.

- **O check-in não é um carimbo.** Ele reescreve a situação de todos os
  agendamentos do paciente naquele dia, em três `update_all` de
  `ServiceRecords.Context` que ninguém lê ao desenhar a tela — e é o que decide
  se o atendimento pode começar.
- **Atraso e falta são coisas diferentes**, e o check-in é o que as separa. Sem
  isso, o horário perdido fica igual a um horário nunca honrado, e o indicador
  de falta deixa de servir para conversar com a família.
- **O check-out devolve a Agendado tudo que estava Pronto no dia**, inclusive o
  que ainda não começou. O paciente foi embora; nenhum horário continua pronto.
- Este é o único módulo em que a decisão de exibição é por **papel** e não por
  permissão nomeada, porque é assim no monólito. Está isolado em
  `visibleTabs/1`, com nota para nenhuma outra tela copiar o padrão.

Cinco regras, cinco cenários, a tela `InClinic` e vinte testes.

Verde: `pnpm check` e 181 jornadas Playwright.

### 6. Financeiro, parte 1: autorizações TISS — `porte/financeiro-autorizacoes`

Concluída. **Substitui** o módulo Financeiro que existia.

O módulo anterior modelava "guia" com quatro situações inventadas — recusada,
pendente de documento, em análise, autorizada. O produto tem dez, e quatro delas
são lidas como recusa quando não são. A diferença entre elas é a diferença entre
reenviar, anexar documento, escrever justificativa e desistir.

- **Erro de sincronização não é recusa.** É falha da integração; o pedido está
  correto e reenviar resolve. Tratado como recusa, manda a clínica remontar um
  pedido certo enquanto o prazo do convênio corre.
- **Autorização parcial não é autorização.** O convênio liberou menos sessões
  que o pedido. Pintada de verde, a clínica agenda o que não foi autorizado.
- **Disponibilidade tem três condições, não uma.** Situação, validade e saldo —
  e a terceira usa `Enum.all?`: um único pacote esgotado trava a autorização
  inteira, mesmo com saldo nos outros.
- **Capitation não multiplica.** O teto é o máximo mensal puro. Aplicar a
  multiplicação cria saldo que o convênio não paga.

Foram removidos `src/rules/finance.ts`, `src/fixtures/finance.ts`,
`src/scenarios/finance.ts`, `ClaimList` e `ClaimDetail`, e o contrato `Claim`.
O que era aproximação virou o modelo real.

Seis regras, dez cenários, a tela `AuthorizationHub` e vinte e quatro testes.

Verde: `pnpm check` e 188 jornadas Playwright.

### 7. Financeiro, parte 2: fechamentos — `porte/financeiro-fechamentos`

Concluída.

O pagamento mensal do profissional. É o módulo em que o Bloomy mais se parece
com um processo entre duas partes: a clínica calcula, o profissional confere, o
profissional emite a nota, a clínica valida e paga.

- **Sete situações, e cada uma troca de dono.** Duas são da clínica, duas do
  profissional, duas do financeiro, e a última não é de ninguém. Uma barra de
  progresso mostra quanto falta e esconde a única pergunta que importa em cada
  ponto — de quem é a bola agora.
- **A correção manual só volta.** `ensure_backward_status` recusa avanço: cada
  passo adiante depende da ação de quem é dono da etapa. Pular do fechamento
  para pago produziria pagamento sem aceite e sem nota.
- **A nota fiscal é a única regra de identidade do porte.** O monólito pergunta
  `closure.professional.user_id == user.id` — nem o admin sobe nota no lugar de
  quem a emitiu.
- **Pago é terminal de verdade.** `can_interact?` devolve falso sem olhar o
  papel, e as quatro funções de anexo têm cláusula própria para ele.

Seis regras, dez cenários, a tela `Closures` e vinte e três testes.

Verde: `pnpm check` e 218 jornadas Playwright.

### 8. Financeiro, parte 3: faturas de convênio — `porte/financeiro-faturas`

Concluída. **Fecha o financeiro.**

O último passo do dinheiro: o lote TISS que a clínica envia para receber pelo
que atendeu. Metade deste módulo existe por um motivo só — duas maneiras de
perder dinheiro sem receber aviso nenhum.

- **Autorização sem atendimento não entra na fatura.** O corte é correto:
  faturar o que não aconteceu seria pior. O risco é ele ser invisível, e a
  clínica achar que faturou o mês inteiro.
- **Autorização atendida sem acordo ativo entra valendo zero.**
  `CalculatePriceForInvoice` soma `0.0` quando não acha acordo vigente, sem erro
  e sem aviso. É o jeito mais silencioso de a clínica trabalhar de graça.

A tela mostra as duas listas **antes** do total. E o aviso do acordo ativo diz
quantas *sessões* vão a zero, não quantos reais: sem acordo não existe preço a
aplicar, e estimar um seria inventar um número que a operadora não vai pagar.

Quatro regras, sete cenários, a tela `HealthcareInvoice` e vinte e um testes.

Verde: `pnpm check` e 240 jornadas Playwright.

### 9. Cadastros: equipe — `porte/cadastros-equipe`

Concluída.

Este módulo tem uma função que os outros não têm: **ele explica os outros**.
Duas decisões que pareciam do atendimento e do pagamento nascem no cadastro do
profissional, e quem for desenhar aqueles módulos sem saber disso procura a
configuração no lugar errado.

- **A segunda assinatura da sessão vem do vínculo de estágio.**
  `need_supervisor_signature` é campo de `Professionals.Internship`, não do
  agendamento. Vale para todas as sessões daquele profissional.
- **A nota fiscal do fechamento vem do contrato do mês.** É o mesmo
  `issue_invoice` que o módulo de Fechamentos consome — sem saber disso, a
  variante curta daquele ciclo parece um bug.

Por isso cada profissional traz uma seção de "o que este cadastro decide",
ligando o registro às consequências que ele produz longe daqui.

Dois conceitos que era fácil perder no porte ficaram preservados:

- **Profissional a definir.** Um espaço reservado na agenda, criado antes de a
  clínica saber quem vai atender. O monólito reduz dez campos obrigatórios a
  dois para ele — e isso não é um cadastro incompleto, é outro tipo de cadastro.
- **A assimetria do `allow_zero?`.** A mesma hora administrativa pode ser zero
  em contrato fixo e não pode em contrato por hora. Quem tem mensalidade não
  cobra hora administrativa à parte.

Seis regras, dez cenários, a tela `Team` e vinte e cinco testes.

Verde: `pnpm check` e 269 jornadas Playwright.

### 10. Portais externos, parte 1: público — `porte/portal-publico`

Concluída.

O totem de chegada e a pesquisa de satisfação: a única parte do Bloomy usada por
quem não trabalha na clínica. Isso muda o critério de qualidade. Numa tela
interna, um erro mal explicado custa um chamado ao suporte; aqui custa uma
pessoa com uma criança no colo desistindo do totem e indo para a fila da
recepção.

- **Três falhas, três mensagens, três saídas.** CPF com dígito errado se resolve
  digitando de novo; CPF correto sem cadastro, não; nenhum agendamento hoje pode
  ser dia ou unidade errada. Uma mensagem genérica manda todo mundo para a fila
  e anula o totem.
- **O texto e os alvos são maiores que os das telas internas**, de propósito:
  quem opera está de pé, muitas vezes segurando alguém.
- **A faixa do NPS não aparece para quem responde.** Dizer "você é um detrator"
  a alguém que acabou de dar nota 4 é hostil; a classificação é leitura interna.

A validação de CPF entrou de verdade, com dígito verificador. Isso tem um efeito
conveniente: os CPFs sintéticos deste repositório são reprovados por ela
exatamente como um erro de digitação seria, o que mantém honesta a promessa de
que nenhum CPF real entrou aqui.

Cinco regras, nove cenários, as telas `Kiosk` e `Nps`, e vinte e quatro testes.

Verde: `pnpm check` e 295 jornadas Playwright.

### 11. Portais externos, parte 2: responsável legal — `porte/portal-responsavel`

Concluída.

A família vê o combinado, não o registro clínico. Não há tentativa, evolução nem
prontuário aqui — e essa ausência é decisão, não lacuna do porte.

O que existe aqui e em nenhuma outra tela do produto é o **consentimento**: a
família aceita o plano terapêutico do filho assinando com o próprio nome. Três
decisões seguem daí:

- **O plano é mostrado por inteiro antes do aceite**, com metas e objetivos na
  linguagem da devolutiva. Consentir com um resumo não é consentir.
- **A assinatura é um campo de texto, não uma caixa de seleção.** Digitar o
  próprio nome é um ato; marcar uma caixa é um reflexo.
- **A negativa de escopo vem antes do conteúdo.** Um identificador adivinhado
  não revela nem o nome da criança nem as metas dela.

O aceite grava quatro coisas juntas — aprovação, assinatura, data e qual
responsável assinou —, e foi escrevendo a regra que apareceu um buraco no meu
próprio contrato: eu tinha enunciado os quatro e modelado três. Um paciente pode
ter mais de um responsável legal, e o monólito grava `legal_guardian_id`
justamente por isso. Corrigido.

O aceite dos termos guarda instante, endereço de rede e dispositivo. A tela diz
isso antes de guardar, e diz para quê: registro do consentimento, não
acompanhamento de navegação.

Cinco regras, sete cenários, a tela `GuardianPortal` e dezenove testes.

Verde: `pnpm check` e 316 jornadas Playwright.

### 12. Portais externos, parte 3: operadora — `porte/portal-operadora`

Concluída. **Fecha os três portais externos.**

O único lugar do produto em que dados de uma clínica são mostrados a uma
organização de fora. Isso torna o que **não** aparece tão projetado quanto o que
aparece — e a tela diz isso em voz alta, porque uma ausência silenciosa de
informação clínica pareceria lacuna do produto em vez de decisão.

- **A contagem separa o que fechou do que apenas aconteceu.** Um atendimento
  pendente de assinatura ocorreu e ainda não fechou; contá-lo como prestado
  antecipa a cobrança. É a diferença mais comum entre o número da clínica e o da
  operadora, e agora ela tem nome na tela.
- **A omissão do escopo é declarada.** `SchedulePolicy.scope/2` filtra
  `status != :incomplete` para o usuário de operadora sem sinalizar nada. Este
  Design Space mostra a contagem do que foi omitido, para a decisão ser
  discutida em vez de herdada.

Quatro regras, cinco cenários, a tela `InsurerPortal` e oito testes.

Verde: `pnpm check` e 332 jornadas Playwright.

### 13. Cadastros: estrutura — `porte/cadastros-estrutura`

Concluída.

A camada física que a agenda esbarra: sala do tipo certo, com capacidade, numa
unidade e num horário não bloqueados. Nenhuma dessas restrições aparece em tela
de agendamento nenhuma — nem no sistema real, nem neste Design Space até aqui —
e é por isso que elas precisavam estar escritas.

- **O serviço declara quais tipos de sala servem.** Motricidade precisa de
  espaço e equipamento; grupo precisa de mesa grande. Sala do tipo errado não
  atende, mesmo livre.
- **Três origens de bloqueio, três saídas.** Unidade, profissional e calendário
  exigem ações diferentes de quem tenta marcar: outra unidade, outro
  profissional, outro dia. Uma mensagem única de "horário indisponível" não
  distingue nenhuma.
- **Contradição de cadastro não é falta de sala.** Um serviço que exige sala e
  não declara tipo aceito é inagendável em qualquer unidade — e o cadastro
  aceita a combinação. Quem descobre é a recepção, tentando marcar.

Como o módulo de Equipe, este cadastro decide coisas em outro lugar:
`not_chargeable` do serviço é o mesmo campo que a guarda de início do
atendimento consulta para dispensar o check-in.

Cinco regras, seis cenários, a tela `Structure` e dezesseis testes.

Verde: `pnpm check` e 350 jornadas Playwright.

### 14. Consolidação — `porte/consolidacao`

Concluída.

Passagem sobre o conjunto, depois de treze módulos. Duas correções e uma
atualização de instruções.

**Os portais externos herdavam o menu do backoffice.** O `AppShell` sempre
renderizava o drawer, então o totem, a pesquisa, o portal da família e o da
operadora mostravam "Agenda · Pacientes · Autorizações" no canto da tela. É o
tipo de erro que passa em toda revisão de conteúdo e aparece na primeira captura
de tela mostrada a alguém de fora. Agora há uma propriedade `surface` explícita,
com teste que fixa as duas superfícies.

**O menu não cobria os módulos novos.** Ganhou Na Clínica, Equipe, Estrutura e
Fechamentos. Atendimento, plano e protocolo continuam fora: alcançam-se a partir
da agenda e do paciente, e inventar itens de menu para eles descreveria uma
navegação que o produto não tem.

**`AGENTS.md` estava descrevendo o repositório de ontem** — 24 cenários, três
módulos, personas inventadas. Foi reescrito com o que o porte estabeleceu: que o
Bloomy é um sistema de terapia ABA, os catorze módulos, a proibição de editar a
matriz de permissões à mão, a regra de nunca perguntar por papel numa tela, e
uma tabela dos três elos entre módulos que não são óbvios de descobrir.

Verde: `pnpm check` e 356 jornadas Playwright.

### 15. Clínico, parte 5: prontuário — `porte/clinico-prontuario`

Concluída.

Substitui o modelo de "prontuário restrito" que este repositório tinha e que era
invenção: um booleano no paciente e uma permissão que não existe. O real é mais
rígido e mais interessante.

- **A restrição é por tipo de documento.** Só `:clinical` tem cláusula
  permissiva, e para sete dos dez papéis. Documento pessoal e administrativo não
  são abertos por ninguém, em papel nenhum. A tela mantém os três listados: o
  registro fica, o conteúdo é que não abre — esconder faria a recepção pedir de
  novo o que a família já entregou.
- **O prazo de aviso de vencimento é por documento.** Renovar um laudo
  neurológico demora meses; uma carteirinha, dias.
- **Os limites de falta são do paciente, não da clínica.** Uma criança em
  adaptação tolera mais faltas que outra em manutenção, e o mesmo número alarma
  uma e não alarma a outra.

Quatro regras, sete cenários, a tela `PatientRecord` e dezoito testes.

Verde: `pnpm check` e 377 jornadas Playwright.

### 16. Cadastros: gerência — `porte/gerencia`

Concluída.

A tela de gerência do Bloomy tem nove abas e é fácil lê-la como painel de
indicadores. Ela não é: cada aba é uma **fila de trabalho**, com dono e com
consequência para o que fica parado. A diferença entre as duas leituras é a
diferença entre uma tela que alguém abre toda segunda e uma que ninguém abre.

- **A fila de relatórios é ordenada por consequência, não por data.**
  `report_controls.requester` distingue operadora de família, e o mesmo atraso
  custa coisas diferentes: um segura a próxima autorização e o faturamento; o
  outro não trava nada no sistema e faz uma família procurar outra clínica. Um
  atraso de nove dias da operadora vem antes de um de catorze da família.
- **Aplicador sem supervisor é uma lacuna silenciosa.** Aparece semanas depois,
  como uma pilha de atendimentos pendentes de uma assinatura que ninguém pode
  dar. A gerência é o único lugar em que ela é visível antes disso.
- **Cada frente diz de quem é.** Nove listas numa tela viram ruído sem isso: o
  que decide se alguém age não é o número, é saber que o número é seu.

Uma correção de acessibilidade no caminho, pega pelo axe: eu havia usado
`opacity-60` nas frentes zeradas, e opacidade em texto derruba o contraste
abaixo de AA. Frente em dia agora é dita com palavra, não com opacidade — que é
exatamente o que o `AGENTS.md` proíbe e o que o guarda-corpo existe para pegar.

Quatro regras, cinco cenários, a tela `Management` e treze testes.

Verde: `pnpm check` e 394 jornadas Playwright.

### 17. Clínico, parte 6: mapa de horas — `porte/clinico-mapa-horas`

Concluída.

A ponte entre o plano e a agenda: alguém desenha a semana pretendida do paciente
e o sistema materializa isso em agendamentos ao longo da vigência.

O módulo existe por causa de uma escolha do sistema real que é fácil de não
notar. Quando um horário esbarra num conflito, `BuildSchedules` **não falha**:
apaga o campo em conflito e cria o agendamento assim mesmo. É defensável —
metade de um horário é melhor que nenhum, e a recepção completa depois — e
precisa estar visível, porque um mapa aplicado com quinze agendamentos sem
profissional parece pronto e não está.

- **A família do conflito decide o que se perde.** Os quatro conflitos de
  profissional apagam o profissional; os dois de sala apagam a sala. Um horário
  pode perder os dois e continuar sendo criado.
- **E decide de quem é resolver.** Profissional é da coordenação, sala é da
  administração da unidade, e agenda padrão faltando é do People. Um aviso único
  de "conflito" não diz a quem entregar.
- **"Sem agenda" não é "ocupado".** Uma é cadastro faltando, a outra é disputa de
  horário, e elas pedem ações opostas.

Quatro regras, seis cenários, a tela `HourMap` e dezoito testes.

Verde: `pnpm check` e 413 jornadas Playwright.

### 18. Clínico, parte 7: chat do caso — `porte/clinico-chat`

Concluída. **Fecha o módulo clínico.**

A tentação é tratar o chat como recurso secundário — um mensageiro embutido. O
schema diz outra coisa: mensagem tem conteúdo, autor e paciente, e **nenhum
campo de edição ou exclusão**. É registro de coordenação clínica, e alguém vai
consultá-lo meses depois para entender por que a conduta mudou.

- **O aviso de permanência vem antes do envio**, ao lado do campo e associado
  por `aria-describedby`. Não é pedido de confirmação: é informação antes da
  ação. Descobrir que não dá para corrigir quando já não dá é a pior hora.
- **A menção notifica e não dá acesso.** `ChatPolicy` não inclui recepção,
  operação nem People — a notificação sai e a tela da pessoa não abre. A tela
  avisa isso enquanto se digita, o que o sistema real não faz.
- **O aplicador alcança o chat**, e é a única superfície escrita do caso que ele
  alcança: não vê programa, protocolo nem prontuário. Fechar o chat para ele
  silenciaria justamente quem observa o paciente executando.

Uma correção de camada no caminho: eu havia importado uma fixture dentro da
tela, para checar as menções. O diretório passou a vir pelo contrato — tela não
conhece fixture.

Quatro regras, cinco cenários, a tela `Chat` e quinze testes.

Verde: `pnpm check` e 431 jornadas Playwright.

### 19. Cadastros: visitas — `porte/visitas`

Concluída.

O funil é o único lugar do produto em que alguém ainda **não é paciente** — e
por isso o único em que quase nada é obrigatório. A consequência dessa folga
aparece no fim.

- **Converter exige cinco dados que a visita nunca coleta**: data de nascimento
  e sexo da criança, e data de nascimento, estado civil e relação do
  responsável. `ConvertToPatientParams` pede tudo isso;
  `Prospects.LegalGuardian` guarda quatro campos. O último passo do funil é
  sempre uma coleta, e ninguém avisa antes — a tela passa a avisar.
- **Perdido é saída lateral, não último estágio.** Desenhado em linha, o funil
  sugere que todo mundo caminha até o fim antes de desistir, e esconde onde as
  pessoas param. A tela agrupa as perdas pelo passo em que aconteceram, que é a
  única leitura que responde à pergunta que o funil existe para responder.
- **O tempo parado vem junto do passo.** Numa lista por estágio, quem está há
  dois meses em "aguardando plano" é idêntico a quem chegou ontem.

Quatro regras, cinco cenários, a tela `Prospects` e quinze testes.

Verde: `pnpm check` e 447 jornadas Playwright.

### 20. Cadastros: relatórios — `porte/relatorios`

Concluída.

Sete tipos de documento que saem por um botão só. O que muda entre eles não é o
formato: é **para onde o papel vai** depois de gerado — empregador, convênio,
família, outro serviço de saúde. Um relatório é a coisa mais fácil de o produto
emitir e a mais difícil de recolher.

O destinatário não está no schema. Está nas regras deste módulo porque é o que
decide o cuidado com o conteúdo — e sem ele o handoff produz sete telas iguais.

- **A declaração de comparecimento é o único tipo que sai do circuito da
  saúde.** Vai para o RH de uma empresa ou para a escola, e precisa provar
  apenas que a pessoa esteve na clínica naquele horário. O campo `content`
  aceita qualquer coisa em qualquer tipo, sem validação — a tela avisa antes de
  gerar o PDF.
- **Relatório com PDF gerado não é editado.** O papel já saiu; editar o registro
  faria o sistema divergir do que está na mão de alguém.

Quatro regras, seis cenários, a tela `Reports` e dezenove testes.

Verde: `pnpm check` e 465 jornadas Playwright.

### 21. Notificações — `porte/notificacoes`

O recurso que mais parece resolvido e menos foi olhado. O schema tem três campos
— título, conteúdo e URL — e o estado de leitura mora no vínculo com a pessoa,
não na notificação. Isso já é o modelo certo, e decide metade da tela: “marcar
todas como lidas” age sobre os vínculos de quem clicou, e a mesma mensagem
continua não lida para todos os outros.

A outra metade vem de ler **quem envia**, e não o schema. São quatro chamadas de
`Notify.notify/4` no sistema inteiro — agendamento assumido, agendamento
transferido, agendamento atrasado e menção no chat. Três delas gravam string
vazia como destino, e a quarta aponta para o formulário de edição do paciente,
não para o chat de onde a menção saiu.

Três decisões desenhadas a partir disso:

- **Sem destino e com destino vazio são estados diferentes.** `undefined` é uma
  notificação que nunca pretendeu levar a lugar nenhum; `""` é uma que pretendia
  e não leva. Só a segunda é defeito. `linkTarget/1` os separa e `canOpen/2` dá
  motivos diferentes — apagá-los no mesmo cinza esconderia qual dos dois alguém
  precisa consertar.
- **A hora de recebimento fica junto do texto, sempre.** O conteúdo é cópia
  congelada no envio: se o agendamento for remarcado, a notificação continua
  dizendo o que dizia. Sem a data ao lado, ele se lê como estado atual.
- **O conteúdo clínico é apontado, não removido.** `namesPatient/1` procura a
  linha `Paciente:` que o template de `AssumeSchedule` interpola. É leitura de
  string porque o sistema real só tem string — a fragilidade da detecção é a
  própria constatação.

6 cenários, 16 testes de regra, 9 jornadas. Com este módulo o backoffice está
coberto de ponta a ponta.


### 22. Supervisão — `porte/supervisao`

O módulo existe por causa de uma linha:

```elixir
def can?(role, :list_supervisor), do: role in ~W(admin clinic_admin coordinator)
```

O papel `supervisor` não está lá. **A tela que leva o nome dele não abre para
ele.** Isso não é necessariamente errado — é uma visão de coordenação sobre quem
supervisiona quem — mas o nome promete o contrário, e quem lê a lista de papéis
assume que supervisor supervisiona por ali.

Uma vez aceita essa frase, o resto do desenho fica coerente, e três coisas
passam a incomodar:

- **O período abre em [hoje − 30, hoje].** Auditoria e acompanhamento pedem
  janelas opostas. Conferir o que passou é legítimo; ser o único padrão
  significa que ninguém abre a tela para decidir onde estar amanhã — que é
  exatamente onde a supervisão muda o resultado. A tela passou a dizer, por
  extenso, para que lado está olhando.
- **A tabela mostra tudo menos supervisão.** Serviço, profissional, paciente,
  sala, horário, situação do agendamento. Não mostra se a segunda assinatura
  está pendente — que é o **único efeito mecânico** do vínculo de supervisão em
  todo o sistema. `supervisionState/1` é a coluna que falta, derivada da situação
  do agendamento, que já distingue `pending_signature` de
  `pending_supervisor_signature`.
- **A lista some com quem acabou de ser designado.** `has_supervisor_internships`
  monta a lista a partir dos vínculos, e não do papel. É a escolha certa —
  supervisão é uma relação, não um cargo — e o preço é que um supervisor sem
  vínculo fica invisível exatamente quando alguém precisaria encontrá-lo para
  lhe atribuir o primeiro caso. A tela nomeia quem ficou de fora, em vez de
  corrigir em silêncio.

Quem não abre a tela é mandado para onde a tarefa acontece: o supervisor
acompanha os casos dele pelo atendimento, onde a assinatura é pedida. Um "sem
permissão" seco o deixaria procurando.

6 cenários, 15 testes de regra, 10 jornadas.


### 23. Mapa da unidade — `porte/mapa-da-unidade`

A única tela do produto cuja pergunta não é sobre um caso, e sim sobre
capacidade: **onde cabe mais alguém**. Quatro eixos — paciente, profissional,
sala e unidade — sobre a mesma semana, mais dois modais de edição. É o maior
componente do backoffice: 4.348 linhas.

O que a torna difícil é que ela tem **três maneiras de mostrar zero**, e elas
pedem ações opostas:

| O que a tela mostra | O que significa | Quem resolve |
| --- | --- | --- |
| 0% de ocupação | O dia está definido e não tem ninguém | Coordenação, marcando |
| 0% de ocupação | Não existe agenda padrão nesse dia | People, cadastrando |
| nada | O atendimento está numa faixa que o mapa descarta | ninguém, porque ninguém vê |

As três aparecem iguais. `calculate_occupancy(_items, [])` devolve `0`, então
sem-agenda e livre são o mesmo número; e `unit_hours` vai até
`fechamento.hora − 1`, então uma unidade que fecha às 18h30 perde tudo o que
acontece às 18h.

Três decisões seguem daí:

- **`occupancy/1` devolve `undefined`, e não `0`, quando não há agenda padrão.**
  Um número não consegue carregar a diferença entre "0% de oito horas" e
  "nenhuma hora definida". O tipo carrega.
- **A faixa perdida é nomeada com o que existe dentro dela.** Não basta dizer
  que o recorte termina antes: `itemsInLostHour/1` lista os atendimentos que
  somem, porque eles ocupam sala e profissional de verdade.
- **A granularidade travada é explicada.** No sistema real, os botões de semana
  e dia ficam apagados nos eixos de paciente e unidade, sem motivo. Dois botões
  mortos ensinam que a tela está quebrada; a frase ensina que a pergunta não faz
  sentido ali.

E há um par que fecha sozinho: o mapa aponta "sem agenda definida", e
`UnitMapPolicy.can?(role, :show)` não inclui `people` — quem resolveria a
pendência não vê a tela que a mostra. O aviso nomeia o destinatário justamente
porque ele não vai passar por aqui.

6 cenários, 18 testes de regra, 10 jornadas.


### 24. Controle de horas — `porte/controle-de-horas`

A tela em que um erro vira dinheiro. Cada dia tem horas previstas, horas
efetivamente marcadas e um valor diário esperado, e o que separa as três é
aritmética que ninguém confere — porque cada linha isolada erra pouco.

Todos os cinco defeitos que ela pode cometer são **silenciosos**: truncam,
aceitam, descartam ou omitem sem reclamar. O módulo inteiro consiste em tirar
cada um deles do silêncio.

- **A previsão é truncada para baixo.** `Enum.sum_by(...) |> div(3600)` numa
  coluna `:integer`: 7h30 vira 7, e a fração não caberia no tipo nem que
  quisessem. O arredondamento vai sempre para o mesmo lado. A tela mostra o
  previsto como é **e** como está gravado, e projeta a perda no mês — meia hora
  isolada não convence ninguém a olhar; onze horas convencem.
- **A verificação por geolocalização é opcional e silenciosa.** `maybe_create_log`
  só grava com latitude e longitude preenchidas, e o resultado do `Repo.insert`
  é descartado. GPS desligado, permissão negada ou falha na inserção produzem o
  mesmo resultado: check-in bem-sucedido, nenhuma coordenada, nada dito. O
  registro fica com a aparência de um verificado. `verificationState/1` tem três
  estados, e o do meio — só uma das duas marcas — é o que o sistema real perde.
- **Saída anterior à entrada é aceita.** Nada compara `end_at` com `start_at`,
  e `Time.diff` devolve negativo. A soma do dia pode ficar menor que uma de suas
  parcelas.
- **A previsão sem fim quebra o recálculo.** `ExpectedClinicHour` valida só
  `start_at`; `RecalculateExpectedHours` faz `Time.diff(end_at, start_at)` sem
  checar. Não é divergência de opinião entre camadas: é o changeset autorizando
  exatamente a forma que a função a jusante trata como impossível.
- **Quem marcou já está gravado e não é mostrado.** `checkin_done_by` e
  `checkout_done_by` são a única distinção entre hora registrada e hora
  atribuída, e o caso mais interessante numa conferência — dia aberto no app e
  fechado no escritório — não aparece em tela nenhuma.

7 cenários, 18 testes de regra, 9 jornadas.


### 25. Agenda, revisitada — `porte/agenda-revisitada`

A agenda foi o primeiro módulo escrito, antes de o monólito ser lido a fundo, e
ficou com quatro regras plausíveis. O sistema real tem **sete verificadores**
compostos por `ScheduleVerification.verify/2`:

```elixir
Enum.find_value(verifiers, fn module -> module && module.verify(changeset) end)
```

`find_value` **para no primeiro que devolve algo**. Um horário com quatro
problemas exige quatro tentativas de salvar para que todos apareçam — e cada
tentativa custa uma conversa, porque quem marca está com a família na frente ou
no telefone.

A ordem é a do array, e não a de gravidade nem a de facilidade de resolver:

1. profissional desativado — resolve o People
2. bloqueio na agenda do profissional — coordenação
3. bloqueio na agenda da unidade — administração da unidade
4. bloqueio na agenda da sala — recepção
5. bloqueio geral no período — administração da unidade
6. atendimento duplicado — coordenação
7. **lotação da sala** — recepção, trocando de sala

A mais fácil de contornar é a última a ser dita.

Três decisões:

- **Todos os impedimentos de uma vez.** É a única diferença de comportamento
  que o Design Space propõe aqui, e ela fica declarada ao lado do que acontece
  hoje: `firstImpediment/1` reproduz o `find_value`, `allImpediments/1` propõe a
  alternativa, e `savesToSeeEverything/1` mede o custo em número de tentativas.
- **Cada impedimento diz de quem é resolver.** Uma lista que só informa devolve
  o problema para quem não pode agir.
- **A verificação que não rodou também é dita.** `VerifyRoomAvailability` só
  roda quando `schedule_type != :at`: sem essa frase, um horário de
  acompanhamento terapêutico sem sala parece cadastro incompleto e alguém vai
  "corrigi-lo".

E uma correção de leitura: `capacity <= schedule_count` significa que **sala
ocupada não é sala indisponível**. Salas comportam atendimentos simultâneos, e
mostrar ocupação contra capacidade evita recusar um horário que caberia.

5 cenários, 14 testes de regra, 8 jornadas.


### 26. Pacientes, revisitado — `porte/pacientes-revisitado`

O módulo de pacientes também foi escrito cedo e ficou com três regras de
cadastro. Faltavam as duas coisas que tornam este cadastro diferente de um
cadastro de clínica qualquer.

**A fase terapêutica é por especialidade.** `TherapyPhase` pertence ao par
paciente + especialidade, com seis etapas: ambientação, avaliação inicial,
pré-intervenção, terapia, reavaliação, preparação para alta. A mesma criança
pode estar em terapia na fonoaudiologia e em ambientação na psicologia, porque
cada especialidade entra no caso em momento diferente. **Um campo único de "fase
do paciente" obrigaria a escolher qual das especialidades mente** — é o erro
mais fácil de cometer aqui, e a tela existe para torná-lo impossível.

Duas coisas incomodam no schema:

- `step` tem `default: :ambiance` e o changeset **não valida nada**. "Está
  começando" e "ninguém preencheu" são o mesmo dado. A tela não resolve isso —
  declara, em cada fase em ambientação.
- Uma fase pode ser gravada **sem especialidade**. Ela não pertence a percurso
  nenhum e nenhuma tela sabe onde mostrá-la: não some do banco, some da leitura.

**Inativar um paciente apaga a agenda futura.** `ChangePatientStatus` cancela
num `update_all` todos os agendamentos a partir do corte, encerra os mapas de
horas em vigor e desliga a renovação automática de todos eles — atrás de um
seletor de status. A tela põe os números antes da confirmação, porque nada disso
volta ao trocar o status de volta para ativo.

Duas descobertas aí, e as duas são de tempo:

- `set_status/2` mantém `active? = true` quando a data é futura, mas
  `deactivate_patient_callbacks/3` roda sempre que há data. **Agendar a
  inativação para o mês que vem cancela hoje a agenda daquele mês em diante.**
  O status espera; a parte irreversível não.
- O corte é `DateTime.new!(deactivation_date, ~T[00:00:00], "Etc/UTC")`, que em
  Brasília são 21h da véspera. O atendimento das 21h30 do dia anterior é
  cancelado com motivo "paciente inativado" num dia em que o paciente ainda
  estava ativo.

6 cenários, 10 testes de regra, 9 jornadas.


### 27. Varredura de coerência — `porte/coerencia`

Uma passagem sobre o que já estava escrito, procurando decadência em vez de
superfície nova. Três coisas apareceram.

**Sete citações ao monólito estavam uma ou duas linhas fora.** A tabela de
achados aponta para arquivo e linha do sistema real, e uma citação que erra por
uma linha manda o leitor para uma linha em branco ou para um `end`. O efeito não
é local: quem confere uma citação e não encontra nada para de conferir as
outras. Corrigidas contra o token real de cada achado.

Para não decair de novo, `scripts/check-citations.mjs` confere todas as citações
`lib/**.ex:linha` de `docs/` contra o monólito e entrou no `pnpm check`. Ele
**não falha** quando o monólito não está clonado — avisa e sai com zero. Um
verificador que quebra o `check` de quem não tem o outro repositório é abandonado
na primeira semana.

**Dez regras não eram citadas por cenário nenhum.** Uma regra que nenhum cenário
aponta não é verificável por jornada: ela vira texto mantido por educação. Todas
as dez já eram exercitadas por cenários existentes — faltava a ligação, e ela foi
feita. Dois testes novos em `tests/product.test.ts` mantêm isso: um confere que o
`source` de cada regra existe, outro que nenhuma regra fica órfã.

**As permissões continuam em sincronia.** `scripts/gen-permissions.mjs` foi
rodado contra as 26 policies e o resultado é idêntico ao arquivo em uso.

Sem cenário novo: 2 testes de contrato, 1 script.


### 28. Ação indisponível alcança o teclado — `porte/acao-indisponivel`

A convenção central deste Design Space é que **ação bloqueada não some**: fica
visível, inativa, e diz o motivo. A implementação usava o atributo nativo
`disabled` — e um botão `disabled` sai da ordem de foco.

Quem navega por teclado passava direto: nunca encontrava o botão, nunca era
levado até ele, nunca ouvia o `aria-describedby` com o motivo. **A convenção
inteira valia só para quem enxerga a tela** — e para os demais o comportamento
era indistinguível de esconder a ação, que é o que ela existe para evitar.

Medido no navegador, e não deduzido: com `disabled` o botão não aparecia na
ordem de foco; agora aparece na posição 11 de 14 na tela de marcar atendimento,
recebe foco, e o `aria-describedby` aponta para o texto do motivo.

Junto veio um segundo problema no mesmo componente: `disabled:opacity-55` dava
**2,35:1** no botão primário e **3,48:1** no secundário. Isso era **conforme** —
a WCAG 1.4.3 isenta componentes inativos, e é por isso que o axe nunca reprovou.
Ao devolver o botão à ordem de foco a isenção deixa de valer, e com ela o
argumento: um controle que a pessoa alcança e não consegue ler não ajuda
ninguém. O estado indisponível passou a ter cor própria, **5,56:1**, declarada
em `src/tokens/contrast.ts` para o teste de tokens protegê-la.

As 34 asserções `toBeDisabled()` existentes continuaram passando — o Playwright
já trata `aria-disabled="true"` como desabilitado.

Registrado em `docs/decisions/0003`. 4 jornadas novas, 1 par de contraste.


### 29. O anel de foco nascia invisível — `porte/anel-de-foco`

Passagem de teclado pelas telas novas. O que apareceu não foi das telas novas:
era do produto inteiro, desde sempre.

`tokens.css` declara o anel de foco e traz um comentário dizendo que removê-lo é
violação de guardrail. O anel estava lá, o comentário estava lá, e **o anel não
aparecia**. Dois defeitos independentes:

1. **`:where()` tem especificidade zero.** `outline-style` e `outline-width`
   chegavam; `outline-color` era perdida e caía no valor inicial da propriedade,
   `currentColor`. Num botão primário isso é branco — e com
   `outline-offset: 2px` o anel é desenhado sobre o cartão, que é branco. Anel
   branco sobre branco em toda ação primária.

2. **`transition-colors` do Tailwind v4 inclui `outline-color`.** Corrigida a
   especificidade, o anel ainda **nascia em `currentColor`** e só chegava ao
   roxo no fim da transição: `rgb(255,255,255)` no instante do foco,
   `rgb(97,68,197)` 600 ms depois. Quem navega devagar via; quem tabula rápido
   nunca via — e é quem mais depende dele.

Nenhum teste pegava. O axe não avalia contraste de anel de foco, e os 186
cenários passavam. A lição não é "faltou um teste": é que **estilo declarado não
é estilo aplicado**, e a diferença só aparece medindo o valor computado num
navegador. As duas jornadas novas medem o anel **sem espera nenhuma**, que é a
leitura que reprovava antes.

Registrado em `docs/decisions/0004`. 2 jornadas, 2 pares de contraste.


### 30. Verificação visual das telas novas — `porte/verificacao-visual`

Abrir as telas no navegador, em vez de confiar nas jornadas. Três coisas que
nenhum teste pegaria, porque todas são sobre **ênfase**, e ênfase não se afirma
em asserção.

- **A célula "sem agenda padrão" usava o ponto médio (`·`)** — o glifo mais
  apagado disponível — para o estado que o módulo inteiro existe para separar de
  "livre". A ênfase estava invertida: o achado mais importante do mapa era o
  mais fácil de não ver. Virou travessão sobre banda `ink-50`, o que faz a
  faixa sem agenda ler como um bloco contínuo — que é como ela acontece de fato,
  o dia inteiro. O par de contraste foi declarado (5,38:1).
- **Os chips de eixo pareciam controles e não são.** Quatro chips lado a lado,
  um deles em cor diferente, convidam ao clique. O eixo em uso passou a dizer
  "· em uso" em palavra, e a distinção deixou de depender só da cor.
- **"1 dias".** Erro pequeno com efeito grande: uma especificação que erra a
  concordância perde a autoridade para exigir precisão de quem a implementa.
  Corrigido em duas telas e fixado numa jornada.

3 jornadas novas, 1 par de contraste.


### 31. Revisão visual: supervisão, inativação e fase — `porte/revisao-visual`

As quatro telas restantes, abertas no navegador. Mais uma varredura automática
de hierarquia de títulos em todos os 186 cenários — **nenhum salto de nível**.
O que apareceu foram quatro coisas que regra automática nenhuma pega:

- **Crases renderizados literalmente.** A tela de fase terapêutica mostrava
  `` `TherapyPhase.changeset/2` `` com as crases visíveis: JSX não interpreta
  markdown. E o texto era jargão de código numa tela de produto — reescrito em
  português, sem nome de módulo Elixir.
- **Inativar paciente usava a variante primária.** A tela inteira explica que a
  ação é irreversível, e o botão vinha vestido com a cor da ação afirmativa,
  dizendo o contrário do que a tela acabou de dizer. Passou para `danger`.
- **Um aviso dentro de um cartão estava no mesmo nível de título do cartão.**
  Não é salto de nível — a varredura não pega, o axe não pega —, é hierarquia
  errada: conteúdo do cartão anunciado como irmão do título dele.
- **O supervisor selecionado não dizia que estava selecionado.** Borda e fundo
  deixavam a relação com o painel da direita por inferir.

3 jornadas novas.


### 32. Varredura de tela, e uma varredura que media o nada — `porte/varredura`

Em vez de olhar mais dez telas, transformar em varredura o que a revisão visual
tinha achado à mão: crase de markdown renderizada literalmente, jargão de código
no texto, hierarquia de títulos.

**A primeira versão passou anunciando que estava tudo certo — e media a página
antes de o React renderizar.** `innerText` vinha vazio, nenhum título existia,
nenhum salto era encontrado. Só notei porque a varredura de identificadores de
permissão também voltou vazia, e eu sabia que `patients.edit` aparecia numa
tela. Com a espera correta, os números se confirmaram: 186 cenários, **zero
páginas vazias, zero saltos de nível, zero crases**.

O registro importa mais que o resultado: eu tinha afirmado, na entrada anterior,
que não havia salto de nível em nenhum cenário. A afirmação estava certa e a
medição que a sustentava, não. **Uma varredura que mede o nada aprova tudo**, e é
pior que não existir, porque produz confiança. A varredura permanente
(`tests/e2e/varredura.spec.ts`) conta as páginas vazias e falha se houver
alguma — a asserção vem antes das outras duas de propósito, porque sem ela as
outras passam de graça.

O achado real: **`patients.edit` aparecia na frase que a pessoa lê.** "Ela exige
`patients.edit`" não ajuda ninguém a agir. O identificador ficou na regra e nas
pré-condições do cenário, onde quem implementa o lê, e a frase passou a dizer o
que a tela de destino é: o cadastro do paciente.

1 jornada de varredura (186 cenários), 5 cenários com o texto corrigido.


### 33. Ação destrutiva vestida de afirmativa — `porte/variante-destrutiva`

Mesma lógica das rodadas anteriores: em vez de olhar dez telas do bloco
financeiro, transformar em varredura o defeito que a revisão visual tinha
achado à mão.

Percorridos os 36 botões das 30 telas, um escapava — e era o pior possível:
em **Cancelar atendimento**, o botão que abre o painel usa a variante de perigo
e o botão que **executa** usava a primária. O passo irreversível vestido com a
cor da ação afirmativa, um clique depois de um aviso vermelho.

`scripts/check-button-variants.mjs` entrou no `pnpm check`. Ele tem uma lista de
exceções — rótulos que contêm palavra destrutiva sem serem a ação destrutiva,
como "Voltar" dentro do painel de cancelamento — e cada exceção carrega o
motivo. É a lista que impede o verificador de virar ruído, e é onde ele apodrece
se ninguém a revisar.

**O verificador foi provado por mutação, não por asserção.** Troquei
`variant="danger"` por `primary` em `Team.tsx`, confirmei que ele reprova com a
linha certa, e restaurei. Depois da varredura que media o nada, afirmar que um
verificador funciona sem vê-lo falhar deixou de ser aceitável aqui.

Um detalhe que a jornada fixou: o botão de confirmar nasce **indisponível** por
falta de justificativa, e o estilo de indisponível vence a variante — que é o
comportamento certo. A cor de perigo só se verifica depois que a ação passa a
ser possível, e o teste mede os dois estados.

1 script, 1 jornada.


### 34. O que a tela anuncia contra o que o cenário declara — `porte/anuncios`

Varredura de regiões vivas. O axe não alcança nada disto: ele valida a marcação,
não a coerência entre o que a especificação promete anunciar e o que a tela
anuncia de fato.

**A direção que importava estava sã:** nenhum cenário declara `announces` sem a
tela ter região viva. A especificação não promete anúncio inexistente.

A direção inversa achou quatro casos, de duas naturezas.

**Defeito de código — região viva já preenchida no primeiro quadro.** Uma
`role="status"` com texto ao carregar é lida na chegada: quem usa leitor de tela
ouve uma frase sobre uma ação que não praticou.

- Em Detalhe do atendimento, a dica "Duração mantida: 30 minutos" morava dentro
  da região viva do campo de reagendamento. Separada: a dica é texto estático,
  alcançado por `aria-describedby` no foco; a região viva ficou vazia até alguém
  escolher um horário. O elemento da dica continua sempre renderizado, ainda que
  sem texto — um id que some deixa o `aria-describedby` pendurado.
- No quiosque, `role="alert"` era incondicional. Interromper é certo quando a
  falha responde a algo que a pessoa acabou de fazer — digitou um CPF, mandou.
  É errado quando a falha **é o estado de chegada**: "unidade não encontrada"
  acontece porque o endereço aberto está errado, e anunciar assertivamente aí
  atropela a leitura do título da própria página.

**Lacuna de especificação — anúncio real não declarado.** O agradecimento do NPS
e o vazio do quiosque são anunciados de verdade, e os cenários não diziam.
Declarados.

A varredura virou `tests/e2e/anuncios.spec.ts` e foi **provada por mutação**:
devolvi o `role="status"` à dica inicial, confirmei a reprovação, restaurei.

1 jornada de varredura (186 cenários), 2 telas corrigidas, 2 cenários
completados.


### 35. Ordem de tabulação, e uma heurística errada — `porte/tabulacao`

Varredura comparando a ordem do DOM com a posição visual em todos os cenários.

**A primeira versão acusou três telas, e as três estavam certas.** Ela comparava
só a coordenada vertical, então marcava como defeito o momento em que o foco
desce a coluna esquerda e sobe para o topo da direita. Isso não é defeito: é o
comportamento esperado de um layout de duas colunas, e é o que quem navega por
teclado espera encontrar. Medido em 1280 px: "Abrir cadastro" em `y=552, x=413`,
"Cancelar atendimento" em `y=281, x=853` — colunas diferentes.

**A resposta certa era consertar a varredura, não as telas.** Uma verificação que
acusa código correto é pior que nenhuma: ou alguém "corrige" o que estava bom, ou
todo mundo aprende a ignorar o aviso. Com a heurística ciente de colunas — só
acusa salto para cima quando os dois elementos estão a menos de 120 px de
distância horizontal —, os 186 cenários passam limpos.

Sobrou a propriedade que de fato importa: **dentro de uma mesma coluna, o foco
desce.** Um salto para cima ali significa que a ordem do DOM discorda da ordem
lida.

Provada por mutação: inverti visualmente a lista de notificações com
`flex-col-reverse`, mantendo a ordem do DOM; a varredura reprovou; restaurei.

1 jornada de varredura (186 cenários). Nenhuma tela alterada — e é esse o
resultado.


### 36. Alvo de toque e viewport estreita — `porte/toque`

Dois critérios AA da WCAG 2.2 que o axe não verifica: **2.5.8 Target Size**
(24×24 px) e **1.4.10 Reflow** (sem rolagem horizontal em largura estreita).
Medidos a 375 px nos 186 cenários.

**Reflow: limpo.** Nenhum cenário produz rolagem horizontal. As tabelas densas
— mapa da unidade, controle de horas — rolam dentro do próprio contêiner, que
era a decisão declarada quando foram desenhadas, e ela se sustentou.

**Alvo de toque: dois defeitos e onze falsos positivos.**

Os falsos positivos primeiro, porque a lição é a mesma da rodada anterior: a
varredura acusou onze alvos de 1×1 no NPS. São os rádios `sr-only` do padrão
"rádio escondido dentro do label" — o alvo real é o label, de 47×49 px. **O alvo
é o que a pessoa toca, não o elemento que responde ao clique.** Onze ruídos numa
tela sozinha bastam para o relatório inteiro deixar de ser lido, então a
varredura passou a subir até o `label` quando o controle está escondido.

Os defeitos reais eram dois links de **19 px de altura**: "Abrir cadastro" no
detalhe do atendimento e o nome do paciente na lista. Nenhum dos dois está
dentro de uma frase, então a exceção de linha não se aplica; poderiam se
sustentar pela exceção de espaçamento, mas o argumento que decide é outro — 19 px
é difícil de acertar num tablet, e a recepção opera isto num tablet. Ambos
passaram a `min-h-6`.

Provada por mutação: removi o `min-h-6` da lista de pacientes, a varredura
reprovou, restaurei.

1 jornada de varredura (186 cenários), 2 telas corrigidas.


### 37. A escala tipográfica ignorava a pessoa — `porte/escala-tipografica`

Toda a tipografia estava em pixel: 294 ocorrências, mais `font-size: 16px` no
`body`. Zoom de página escala pixel; **preferência de fonte padrão, não** — e é
essa a acomodação mais comum de quem tem baixa visão. Medido: com a raiz em
32 px, um parágrafo de 13 px continuava em 13 px.

Isto era **conforme** — a WCAG 1.4.4 é satisfeita pelo zoom de página, e é assim
que quase todo produto em pixel passa. Não havia violação a corrigir; havia gente
sendo ignorada. Mesmo formato da decisão `0003`: a regra permitia, o argumento
não.

Convertido para `rem`. **A saída no padrão é idêntica** — `0.9375rem × 16 = 15px`
—, conferido no navegador antes e depois. Com a raiz dobrada, o texto dobra
(15→30, 13→26, 14→28) e o layout cresce de 10.021 px para 20.020 px de altura em
vez de cortar. Nenhum dos 186 cenários transborda na horizontal com a fonte
dobrada.

**A varredura nasceu cega, e a mutação revelou.** A primeira versão media *um*
elemento por tela. Passou — e passou também com `Notifications.tsx` inteiro
revertido para pixel, porque o único elemento amostrado por acaso escalava.
Passou a medir todos, e aí reprovou nomeando o elemento e os dois tamanhos.

É a terceira vez esta noite que a mutação expõe uma verificação cega, e as três
foram do mesmo tipo: **medir pouco aprova muito.**

Registrado em `docs/decisions/0005`. 1 jornada de varredura, 294 conversões.


### 38. A cadeia longa sem espaços — `porte/texto-longo`

E-mail de responsável, nome de arquivo, identificador de guia, URL colada num
recado do chat: todos existem no produto real e nenhum tem onde quebrar.

**A primeira sonda não achou nada, e o nada era o pior caso.** Ela media
`scrollWidth` do documento: a página não rolava, logo estava tudo bem. Medido no
elemento, 400 caracteres produziam **2.782 px de texto dentro de um parágrafo de
726 px** — algum contêiner acima simplesmente cortava. Texto ilegível, sem sinal
nenhum, aprovado como sucesso. Quarta vez esta noite que medir a coisa errada
aprova o defeito.

A correção foi de uma linha, e **a primeira tentativa piorou**. Escolhi
`overflow-wrap: anywhere` com o argumento de que ele também deixa o item flex
encolher; o argumento estava errado, é justamente isso que quebra. A varredura de
alvo de toque reprovou na mesma rodada: a 375 px, os links da agenda viraram
tiras verticais de uma letra — 13 px de largura por 199 px de altura. Trocado por
`break-word`, que quebra a palavra longa e não mexe no tamanho mínimo do
contêiner. As duas varreduras passam.

Vale registrar que foi **uma varredura anterior que pegou o estrago de uma
correção nova**. É o argumento a favor de deixá-las permanentes em vez de rodar
uma vez e apagar.

1 jornada de varredura (186 cenários), 1 linha de CSS.


### 39. Movimento reduzido — `porte/movimento`

O Bloomy tem pouquíssimo movimento: três `transition-colors` e a pulsação do
esqueleto de carregamento. Nenhum `prefers-reduced-motion` em lugar nenhum.

É justamente **por ser pouco** que honrar a preferência custa quase nada — e por
ser pouco que ninguém se lembra de fazer.

O caso que importa é a pulsação, porque ela é **infinita**. Uma tela que demora a
carregar fica piscando indefinidamente para quem tem enxaqueca ou distúrbio
vestibular, e a pessoa não tem como parar. As transições de cor são curtas e
inofensivas; a pulsação sem fim, não.

Dois testes, e o segundo é o que impede a varredura de virar vácua: **sem a
preferência, o esqueleto precisa continuar pulsando.** Sem essa asserção,
apagar o `animate-pulse` faria o primeiro teste passar — o mesmo erro de medir o
nada, agora antecipado em vez de descoberto depois.

Provado por mutação: troquei a consulta de mídia por uma que nunca casa, o teste
reprovou, restaurei.

2 jornadas, 1 bloco de CSS.


### 40. O horário mudava com o fuso de quem olha — `porte/fuso`

`Intl.DateTimeFormat` sem `timeZone` formata no fuso do navegador. Medido na
mesma URL do cenário `agenda.day`:

| Fuso | Primeiros horários |
| --- | --- |
| America/Sao_Paulo | 08:00, 08:30, 09:00 |
| Europe/Lisbon | 12:00, 12:30, 13:00 |
| Asia/Tokyo | 20:00, 20:30, 21:00 |

Três situações diferentes para o mesmo cenário. Isso desfaz a promessa central
deste Design Space — *a mesma URL produz a mesma situação* —, e é a promessa que
sustenta aprovar um cenário por link.

**O teste de determinismo que já existia não pegava**, e a razão merece registro:
ele compara a página **consigo mesma**, no mesmo navegador e no mesmo fuso. Um
teste que roda a mesma coisa duas vezes nas mesmas condições sempre concorda.
Quinta vez esta noite que a medição não alcançava o defeito.

Antes de ser um problema do Design Space, é do produto: **horário de atendimento
é do lugar onde o atendimento acontece.** Um coordenador viajando, ou um
navegador com fuso errado, via horários errados. O monólito já resolve isso —
`CalendarHelper.local_timezone/0` devolve `America/Sao_Paulo` — e o Design Space
passou a fixar o mesmo em `CLINIC_TIMEZONE`.

Provado por mutação: removi o `timeZone` de um formatador, o teste reprovou,
restaurei.

1 jornada (3 fusos × 6 cenários com horário visível), 1 constante.


### 41. O Design Space não paginava, e o produto pagina em 50 lugares — `porte/paginacao`

O monólito pagina com Flop em **50 schemas**: limites de 5, 8, 10 e 15. Até esta
rodada, paginação não aparecia em lugar nenhum do Design Space — nem em tela,
nem em regra, nem em documento. Quem aprovasse a lista de relatórios estaria
aprovando uma lista completa que o produto entrega de cinco em cinco.

**A resposta não foi reproduzir paginação em trinta telas.** Rolagem e página são
decisão de implementação; encher as telas de controles de página adiciona ruído
sem fixar comportamento. O critério que usei foi outro: *o limite é menor que a
unidade de trabalho da tela?*

Num caso, muito. **O controle de horas existe para conferir um mês**, e
`default_limit: 5` dá cinco páginas para vinte e dois dias úteis. O defeito que
a tela precisa revelar — meia hora truncada por dia — **só é visível somado**, e
cinco linhas por vez escondem exatamente a soma. Quem confere passa a confiar no
número que o sistema oferece porque não consegue montar o próprio.

Nos demais, não muda: relatórios e autorizações têm limite 5 e unidade de
trabalho de um documento por vez; pacientes e profissionais têm 15 e são listas
de busca, onde se filtra antes de rolar.

`hiddenByPaging/1` devolve `undefined` quando tudo cabe numa página, e há uma
jornada para isso — **um aviso que aparece sempre é um aviso que ninguém lê**.

Registrado em `docs/decisions/0006`. 1 cenário, 4 testes de regra, 2 jornadas.


### 42. A consulta existe e a pergunta não era feita — `porte/pendencias-de-cadastro`

`PatientFilters` aceita dezesseis filtros, e dois deles não têm equivalente em
tela nenhuma: `missing` e `missing_any`. O sistema **sabe** responder "quem está
sem plano, sem unidade, sem mapa de horas ou sem nível de suporte" — e ninguém
pergunta, porque a resposta só existe como parâmetro de endereço.

São quatro **relações que nunca foram estabelecidas**, e não campos obrigatórios
em branco — coisa diferente da regra de cadastro incompleto que o módulo já
tinha. E **nenhuma bloqueia nada**: o paciente é atendido, as sessões acontecem
e os programas rodam com as quatro em aberto. É o que as torna caras — um
bloqueio se resolve porque incomoda hoje; estas só incomodam quando alguém
precisa do dado, e aí já faz meses.

Três decisões:

- **A ordem é por consequência, não por nome.** Sem nível de suporte, o perfil
  TEA está incompleto — e é o dado que dimensiona a intensidade da intervenção,
  logo é lacuna clínica, do especialista. Sem unidade, o paciente some de todos
  os mapas. Sem mapa, não há semana pretendida. Sem plano, não há o que o
  responsável aceite. Listadas como "cadastro incompleto" as quatro pedem a
  mesma coisa; nomeadas pela consequência, cada uma tem dono e urgência
  próprios.
- **O tempo em atendimento vem junto da lacuna.** Duas semanas é tarefa; dez
  meses é processo que não fecha, e na lista as duas são idênticas sem isso.
- **O total ganha proporção.** Seis pendências não dizem nada sozinhas — seis de
  quarenta e oito, sim.

**A varredura de jargão pegou uma regressão minha.** Escrevi `missing` e
`missing_any` no texto da tela, exatamente o defeito que corrigi três rodadas
atrás com `patients.edit`. A varredura escrita naquela ocasião reprovou o commit
horas depois. É o segundo caso da noite em que uma verificação permanente pega o
estrago de trabalho novo.

4 cenários, 9 testes de regra, 7 jornadas.


### 43. O mapa que vence sem sucessor — `porte/mapa-vencendo`

Dos dezesseis filtros de paciente, `hour_map_status=expiring` é o mais denso:
mapa ativo terminando em sete dias **e sem nenhum mapa começando depois**. É a
única consulta do sistema que enxerga **interrupção de intervenção antes de ela
acontecer** — e, como as do módulo anterior, só existe como parâmetro.

Numa clínica ABA isso não é aviso administrativo. Continuidade é parte do
método: programa em aquisição interrompido regride. Uma semana sem mapa é
terapia que para.

Duas coisas seguem daí:

- **A ordem das perguntas é a ordem do risco.** `expiryState/3` pergunta
  primeiro se renova sozinho e se há sucessor — as duas resolvem o vencimento —
  e só então mede os dias. Medir primeiro produziria alarme em mapa que estava
  resolvido.
- **Só o caso seguro fica calado.** Mapa que renova sozinho não recebe aviso;
  todos os outros recebem, inclusive o que tem sucessor. **Ausência de aviso não
  distingue "está resolvido" de "ninguém olhou"** — e a renovação automática é
  desligada em massa quando um paciente é inativado, então o estado perigoso
  chega sem ninguém ter escolhido.

Um detalhe de escrita que a jornada pegou: a primeira versão da frase repetia o
título do aviso, e o leitor de tela ouviria a mesma afirmação duas vezes. O
título afirma o quê; o corpo traz o prazo e a razão.

2 cenários, 9 testes de regra, 3 jornadas.


### 44. Ausência não é cancelamento — `porte/ausencia`

`ScheduleFilters` tem três maneiras sobrepostas de perguntar a mesma coisa —
`missed` olha a coluna `missed_at`, `cancelled` olha `cancelled_at`, e `absence`
olha o campo `status` — e a terceira **soma as duas primeiras**:

```elixir
defp filter_by("absence", value, query) when value in ["true", true] do
  from(s in query, where: s.status in [:missed, :cancelled])
end
```

Cancelar e faltar são comportamentos opostos: um é comunicar, o outro é não
comunicar. Somados, o número não mede adesão — mede horário perdido, que é outra
pergunta e tem outro dono. **E é com esse número que alguém liga para a
família.**

A tela passou a separar as duas contagens, dizer o número que o filtro atual
responderia, e dar a proporção que era aviso prévio — é ela que muda a conversa.
O recorte só aparece quando os dois existem no mesmo dia; com um só não há o que
separar, e o aviso viraria ruído.

**O teste de coerência recusou uma regra minha, com razão.** Eu havia escrito
`status-and-schedule-status-are-the-same-filter` — os dois filtros executam a
mesma cláusula, dois nomes para um só. Ela ficou órfã porque **não tem
manifestação em tela nenhuma**, e o teste que exige um cenário por regra a
reprovou. Uma regra que nenhum cenário consegue exercitar é texto, não
especificação: virou achado sobre o monólito, que é o lugar dela.

1 cenário, 5 testes de regra, 3 jornadas.


### 45. "Atrasado" são duas coisas — `porte/atraso`

`ScheduleFilters` define pendente ou atrasado **três vezes**, com respostas
diferentes:

| Filtro | Situações incluídas | Janela |
| --- | --- | --- |
| `pending` | as quatro | nenhuma |
| `overdued` | as quatro | 48 horas |
| `overdued_for_coordinator` | três — **sem a do supervisor** | imediata |

Duas pessoas olhando "atrasados" no mesmo sistema veem listas diferentes, e
nenhuma sabe que existe outra definição. Um atendimento de três horas atrás está
atrasado para quem coordena e no prazo para todo o resto.

**As duas contas se defendem sozinhas.** Quem distribui a grade precisa ver na
hora; um relatório de pendência precisa de folga para não acusar o que ainda
está sendo escrito. O que não se defende é chamar as duas de "atrasado" em
silêncio — e a correção mais barata possível é a tela dizer qual está em vigor.

Duas decisões além dessa:

- **A faixa de divergência aparece separada.** Enquanto as definições concordam
  a ambiguidade não custa nada; o que interessa é o intervalo entre zero e 48
  horas, em que a coordenação já cobra e o relatório ainda não conta.
- **O ponto cego é nomeado.** `overdued_for_coordinator` exclui
  `pending_supervisor_signature` — coerente, não é a coordenação que assina. Mas
  a tela de Supervisão também não mostra pendência de assinatura (achado 21).
  **É a única etapa que some das duas listas.**

3 cenários, 9 testes de regra, 6 jornadas.


### 46. O supervisor se cobra antes de cobrar os outros — `porte/conta-do-supervisor`

`supervisor_query` é a **quarta** definição de atraso do mesmo arquivo, e a
única com **duas janelas na mesma consulta**:

```elixir
# a do próprio supervisor
where: ... p.id == ^value["supervisor_id"] and s.start_time < ^now
# a dos colegas da unidade
where: ... s.start_time < ^two_days_ago and p.id != ^value["supervisor_id"]
```

O atraso dele aparece na hora; o dos colegas, só depois de 48 horas.

**Isto não é inconsistência — é a única vez no sistema em que alguém aplica a si
um prazo mais duro que aos outros.** É uma escolha boa demais para se perder
numa reescrita, e sem estar nomeada é exatamente o tipo de coisa que a primeira
pessoa a "simplificar" apaga por parecer erro. Por isso virou regra com nome
próprio.

E há um segundo ponto que o nome comum esconde: as três definições anteriores
olham **atendimentos abertos** (`pending_*`); esta olha **agendamentos que nem
começaram** (`scheduled`, `incomplete`), e só os que não têm atendimento
associado. Chamar as duas listas de "atrasados" faz parecer que uma contém a
outra. Não contém: uma pergunta o que não foi fechado, a outra o que não foi nem
começado — dois problemas, dois donos.

Um erro meu que a jornada pegou: o título dizia "1 agendamento seu aparece **por
serem seus**". Concordância no plural aplicada ao singular.

1 cenário, 5 testes de regra, 4 jornadas.


### 47. Meia vigência não cobre data nenhuma — `porte/vigencia`

O filtro `health_care` decide cobertura com uma expressão de dois ramos:

```elixir
(pp.start_of_coverage <= ^today and pp.end_of_coverage >= ^today) or
  (is_nil(pp.start_of_coverage) and is_nil(pp.end_of_coverage))
```

São **quatro** combinações possíveis de datas e ele reconhece duas. A que fica
de fora é a mais natural de todas: **preencher o início e deixar o fim vazio**,
que é como se registra "a cobertura começou em março e continua".

Esse plano não casa em nenhum ramo. Não cobre data nenhuma, nunca — e não
depende da data consultada. O paciente simplesmente some das consultas por
operadora, sem erro, sem aviso. **A entrada de dado mais provável produz o pior
resultado.**

Duas decisões:

- **O estado quebrado ganhou nome.** `never-matches` é o que o monólito produz
  sem nomear; nomear é o que permite alguém decidir se quer mantê-lo.
- **Só ele sugere ação.** Os outros três são legítimos — inclusive "fora da
  vigência", que é um plano vencido de verdade. Sugerir correção neles seria
  ruído, e há uma jornada fixando que o aviso cala.

A outra ponta da assimetria também ficou declarada, mesmo não sendo defeito:
**nenhuma data cobre tudo, uma data cobre nada**, e as duas coisas convivem sem
que ninguém tenha decidido.

2 cenários, 6 testes de regra, 5 jornadas.


### 48. A rotina que gera fechamentos — `porte/geracao-de-fechamento`

Os filtros de fechamento são triviais. O que vale é como o fechamento **nasce**:
`GenerateMonthlyClosuresWorker` roda na virada, procura quem tem horas
registradas no mês anterior e gera um acerto para cada.

Três decisões dessa rotina custam dinheiro, e **nenhuma produz erro**.

**A busca filtra `p.status == true`** — ativo na hora em que o worker roda, e
não durante o mês fechado. Quem trabalhou o mês inteiro e foi desativado antes
da virada não recebe fechamento. O trabalho aconteceu, as horas estão
registradas; o que mudou foi o cadastro, depois. E a ausência de um fechamento
não gera nada que alguém veja. Na fixture são **258 horas** sem acerto.

**O worker conta falhas e devolve `{:ok, ...}` assim mesmo.** O Oban registra
sucesso, não tenta de novo, ninguém é avisado. A contagem existe — está no
retorno — e não vira erro, nem alerta, nem reprocessamento. É a mesma forma do
achado 14 (anamnese relata sucesso e não finaliza) e do 30 (log de
geolocalização descartado): **um padrão do código, não um caso isolado**.

**O mês fecha três horas antes.** `Date.utc_today()` na virada UTC é 21h do
último dia em Brasília — sexta ocorrência do padrão de fuso, e a primeira com
consequência financeira direta. Cai justamente na faixa em que acompanhamento
terapêutico acontece.

Os três avisos calam quando não há o que reportar, e há uma jornada para isso.

2 cenários, 8 testes de regra, 5 jornadas.


## Achados sobre o sistema real

Coisas encontradas ao ler o monólito que valem conversa com o time. Não são
bugs do Design Space; são observações sobre o produto.

| # | Achado | Onde |
| --- | --- | --- |
| 1 | `UnitPolicy.can?(role, :list)` compara com `"admin_clinic"`; o papel se chama `clinic_admin`. O admin de clínica não lista unidades. | `lib/bloomy/units/unit_policy.ex:5` |
| 2 | Metade das policies concede por lista negativa (`role not in`), liberando por omissão para papéis não considerados. `people` aparece com permissões de paciente que outra policy bloqueia antes. | várias |
| 3 | `patients.see_behavior_intervention_plan` exclui `therapeutic_companion` e `specialist`, e não exclui `applicator`. Quem conduz a intervenção não vê o plano; quem aplica, vê. | `lib/bloomy/patients/patient_policy.ex:29` |
| 4 | A Central de Autorizações verifica permissão na entrada da tela; nenhuma ação interna — adicionar autorização, editar agendamento, abrir token — tem verificação própria. | `lib/bloomy_web/backoffice/live/authorization_hub/` |
| 5 | `Appointment.valid_register?/1` retorna `true` quando o texto está **vazio**. O comportamento em `Finish` está correto; o nome diz o oposto do que a função faz. | `lib/bloomy/custom_services/appointment.ex:89` |
| 6 | `ProgramPolicy` não inclui `applicator` em nenhuma das oito ações, nem em `list`. Quem aplica o programa não tem permissão de vê-lo. | `lib/bloomy/programs/program_policy.ex` |
| 7 | A cascata de aquisição pergunta pela negativa (`has_unaquired_step?`), então um nível **sem filhos** conta como adquirido. Um objetivo sem programas fecha sozinho. | `lib/bloomy/programs/context.ex:119` |
| 8 | `ProtocolPolicy.can?(role, :list)` não inclui `supervisor`. Quem supervisiona o caso não alcança a avaliação que o originou — nem para leitura. | `lib/bloomy/protocols/protocol_policy.ex` |
| 9 | Em `CalculateProtocolExecution`, a variável que guarda as questões **respondidas** se chama `unanswered_count`. A conta está certa; o nome diz o contrário. Mesma classe do achado 5. | `lib/bloomy/custom_services/calculate_protocol_execution.ex:5` |
| 10 | No check-in, um horário vencido que estava em **Agendado** vira Atrasado, mas um que já estava em **Pronto** volta para Agendado. A mesma situação de fato — paciente presente, horário vencido — para em dois estados conforme o que veio antes. | `lib/bloomy/service_records/context.ex:94-141` |
| 12 | `provider_code` e `requester_code` de `HealthCare` são opcionais no changeset e obrigatórios na geração do lote TISS. O cadastro passa e o envio falha. | `lib/bloomy/health_cares/health_care.ex` |
| 14 | Finalizar uma anamnese incompleta **relata sucesso e não finaliza**. `keep_pending_until_required_fields/1` devolve o status para `pending` dentro do changeset, sem erro — quem clicou vê a anamnese ainda aberta, sem explicação. O cenário `record.anamnese-incomplete` mostra o atual e o proposto lado a lado. | `lib/bloomy/anamneses/anamnese.ex:31` |
| 15 | A permissão de **emitir** relatório não verifica a de **ler** o prontuário. `generate_report` inclui `attendant`; `see_clinic_overview` o exclui. Quem não pode abrir a evolução do paciente pode produzir um documento de evolução sobre ele, e o formulário não filtra o tipo por papel. | `lib/bloomy/patients/patient_policy.ex:22` |
| 13 | `SchedulePolicy.scope/2` esconde agendamentos `:incomplete` do usuário de operadora sem sinalizar. A lista de presença fica impossível de conciliar com a fatura quando os números não batem. | `lib/bloomy/schedules/schedule_policy.ex` |
| 11 | `ClosurePolicy` se contradiz sobre o especialista: `can_interact?` diz que ele age na etapa de aceite, mas `scope/2` não o lista e ele cai no `where: false`. O especialista não vê fechamento nenhum, nem o próprio. | `lib/bloomy/professionals/closures/closure_policy.ex` |
| 16 | `NotificationUser.changeset/2` exige `read_at` no `validate_required`. Uma notificação **não lida** é impossível de criar por ele. O remetente contorna usando `build_assoc` direto, então a validação nunca roda — é código morto que documenta o oposto do comportamento. | `lib/bloomy/backoffice/notification_user.ex:31` |
| 17 | Três dos quatro remetentes passam `""` como `on_click_url`. Em Elixir a string vazia é *truthy*: um template que faça `if notification.on_click_url` renderiza um link clicável para lugar nenhum. As notificações que mais precisariam levar a algum lugar — as três de agendamento — são justamente as que não levam. | `lib/bloomy/schedules/assume_schedule.ex:21,37,64` |
| 18 | `mark_all_notifications_read_for/1` grava `DateTime.utc_now()` sem truncar numa coluna `:utc_datetime`, enquanto `mark_notifications_read/1` trunca para segundo. Ecto rejeita microssegundos não vazios ao serializar `:utc_datetime` — há risco de “marcar todas como lidas” falhar onde “marcar uma” funciona. **Não reproduzido**: não rodamos o monólito. Vale um teste antes de qualquer conclusão. | `lib/bloomy/backoffice.ex:241-245` |
| 19 | A notificação de menção no chat aponta para `/backoffice/pacientes/:id/editar?message=:id` — o formulário de cadastro do paciente, não o chat de onde a menção saiu. Somado ao achado sobre `ChatPolicy`, quem é mencionado recebe um aviso que leva a uma tela que pode não abrir para o perfil dele. | `lib/bloomy/multidisciplinary_chat/send_message.ex:62` |
| 20 | O papel `supervisor` não tem `:list_supervisor`. A tela de Supervisão é de admin, admin de clínica e coordenação — quem supervisiona nunca a abre. Coerente com o desenho da tela, e contraditório com o nome dela. | `lib/bloomy/professionals/professional_policy.ex:18` |
| 21 | A tabela da tela de Supervisão não tem coluna de assinatura pendente. A segunda assinatura é o único efeito mecânico do vínculo em todo o sistema, e não aparece na tela do vínculo — quem coordena descobre a pendência pelo atraso. | `lib/bloomy_web/backoffice/live/supervisor/index.ex:84-118` |
| 22 | O período padrão da Supervisão é calculado com `Date.utc_today()`. Entre 21h e a meia-noite em Brasília, “hoje” já é o dia seguinte em UTC e a janela inteira anda um dia. Passa despercebido num intervalo de 30 dias até alguém conferir um número contra um relatório. | `lib/bloomy_web/backoffice/live/supervisor/index.ex:288-292` |
| 23 | `calculate_occupancy(_items, [])` devolve `0`. Um profissional **sem agenda padrão** no dia aparece com 0% de ocupação, idêntico a quem tem o dia todo definido e nenhum atendimento. As duas leituras pedem ações opostas — marcar alguém, ou cadastrar a agenda — e a segunda nunca acontece enquanto forem o mesmo número. | `lib/bloomy/unit_maps/list_with_defined_agenda_hours_week.ex:199` |
| 24 | `unit_hours = start_at.hour..(end_at.hour - 1)`. Uma unidade que fecha às 18h30 mostra o mapa até as 17h, e tudo o que acontece às 18h some da única tela que serve para ver ocupação — na faixa mais disputada do dia. | `lib/bloomy_web/backoffice/live/unit_map_live/show.ex:89-90` |
| 25 | `UnitMapPolicy.can?(role, :show)` não inclui `people`. Quem define a agenda padrão dos profissionais não alcança o mapa, que é onde a ausência dessa definição aparece. Par exato do achado 23. | `lib/bloomy/unit_maps/unit_map_policy.ex:2` |
| 26 | O mapa de calor renderiza `{inspect(@count)}` direto no HTML. É uma chamada de depuração deixada na marcação: o usuário vê a representação Elixir do valor, incluindo `nil` quando não há dado. | `lib/bloomy_web/backoffice/live/unit_map_live/components/unit_heat_map.ex:179` |
| 27 | A célula de especialidade cai em `"?"` quando a contagem não foi calculada — o usuário lê literalmente "? horas livres". Desconhecido é um estado legítimo e merece uma frase, não um caractere. | `lib/bloomy_web/backoffice/live/unit_map_live/components/unit_heat_map.ex:103` |
| 28 | `render_table/2` resolve a granularidade de forma oposta nos dois eixos: em `professional`, tudo que não é `"day"` vira semana; em `room`, tudo que não é `"week"` vira dia. Um valor inesperado — `nil`, lixo de formulário — cai em visões diferentes conforme o eixo. | `lib/bloomy_web/backoffice/live/unit_map_live/show.ex:28-40` |
| 29 | `RecalculateExpectedHours` soma os segundos previstos e faz `div(3600)`, que trunca — e `expected_hours` é coluna `:integer`. Um dia previsto de 7h30 é gravado como 7. O arredondamento vai sempre contra o profissional, e num mês de 22 dias úteis são 11 horas. | `lib/bloomy/professionals/clinical_hours/recalculate_professional_expected_hour.ex:11` |
| 30 | O log de verificação por geolocalização só é gravado quando latitude e longitude chegam preenchidas, e o resultado do `Repo.insert` é descartado. Sem coordenadas — ou com falha na gravação — o check-in reporta sucesso e o registro fica indistinguível de um verificado. | `lib/bloomy/professionals/clinical_hours/checkin.ex:18-38` |
| 31 | `ExpectedClinicHour.changeset` valida só `start_at`, e `RecalculateExpectedHours` chama `Time.diff(end_at, start_at)` sem checar nulo. O cadastro autoriza exatamente a forma que o cálculo não processa; o erro aparece no recálculo, longe de quem salvou. | `lib/bloomy/professionals/clinical_hours/expected_clinic_hour.ex:20` |
| 32 | Nada compara `end_at` com `start_at` em `ClinicHour`. Uma saída anterior à entrada é aceita e `Time.diff` devolve negativo, subtraindo horas do total do dia — que pode ficar menor que uma de suas parcelas. | `lib/bloomy/professionals/clinical_hours/clinic_hour.ex:20-31` |
| 33 | `Checkin.has_open_checkin?/1` ancora a busca em `Date.utc_today()`. Depois das 21h em Brasília, a pergunta "esta pessoa tem check-in aberto hoje?" é feita sobre o dia seguinte. Terceira ocorrência do mesmo padrão, junto dos achados 22 e o período do mapa. | `lib/bloomy/professionals/clinical_hours/checkin.ex:56` |
| 34 | `ScheduleVerification.verify/2` usa `Enum.find_value` sobre sete verificadores: para no primeiro que falha. Um horário com quatro impedimentos exige quatro tentativas de salvar para que todos apareçam, e a ordem em que eles surgem é a ordem do array — a lotação da sala, a mais fácil de contornar, é a última. | `lib/bloomy/schedules/schedule_verification.ex:10-24` |
| 35 | `TherapyPhase.changeset/2` faz `cast` de paciente, especialidade e etapa e **não chama `validate_required` para nenhum**. Uma fase sem especialidade é gravável, não pertence a percurso nenhum e nenhuma tela sabe onde mostrá-la. | `lib/bloomy/patients/therapy_phase.ex:37` |
| 36 | `step` tem `default: :ambiance` sem validação. Uma fase gravada sem etapa lê-se como "ambientação" — o começo do percurso — mesmo para quem está em terapia há um ano. Valor omitido e valor escolhido ficam idênticos. | `lib/bloomy/patients/therapy_phase.ex:9-18` |
| 37 | `set_status/2` mantém o paciente **ativo** quando a data de inativação é futura, mas `deactivate_patient_callbacks/3` roda sempre que há data. Agendar a inativação para o mês que vem cancela **hoje** todos os agendamentos daquele mês em diante. O status adia; a destruição não. | `lib/bloomy/patients/change_status.ex:37-39,99-108` |
| 38 | O corte da inativação é `DateTime.new!(deactivation_date, ~T[00:00:00], "Etc/UTC")` — 21h da véspera em Brasília. Atendimentos das últimas três horas do dia anterior são cancelados com motivo "paciente inativado" num dia em que o paciente ainda estava ativo. Quarta ocorrência do padrão de fuso. | `lib/bloomy/patients/change_status.ex:63` |
| 39 | `disable_auto_renew_hour_maps/2` não filtra por data: desliga a renovação automática de **todos** os mapas do paciente, inclusive os que já terminaram. | `lib/bloomy/patients/change_status.ex:76-83` |
| 40 | O filtro `absence` de `ScheduleFilters` seleciona `status in [:missed, :cancelled]` — cancelamento entra na contagem de ausência. São comportamentos opostos: cancelar é comunicar. O número resultante não mede adesão, e é ele que embasa a conversa com a família. | `lib/bloomy/schedules/schedule_filters.ex:216` |
| 41 | `status` e `schedule_status` são dois filtros com a mesma cláusula (`where: s.status == ^value`). Dobra o que precisa ser mantido e faz a próxima pessoa procurar qual dos dois é o certo. | `lib/bloomy/schedules/schedule_filters.ex:63,124` |
| 42 | Três filtros perguntam pelo mesmo fato por vias diferentes: `missed` pela coluna `missed_at`, `cancelled` por `cancelled_at`, `absence` pelo campo `status`. Concordam até o dia em que a situação muda depois do carimbo — e aí duas telas do mesmo sistema mostram números diferentes sem que nenhuma esteja errada. | `lib/bloomy/schedules/schedule_filters.ex:210-226` |
| 43 | `overdued` e `overdued_for_coordinator` definem atraso de formas diferentes no mesmo arquivo: 48 horas contra imediato, e a segunda exclui `pending_supervisor_signature`. Duas pessoas veem listas diferentes sob a mesma palavra, e nenhuma sabe da outra definição. | `lib/bloomy/schedules/schedule_filters.ex:67,84` |
| 44 | Somando o achado 43 ao 21: a etapa `pending_supervisor_signature` some da lista de atraso da coordenação **e** da tela de Supervisão. É a única das quatro situações abertas que não aparece em lista nenhuma de cobrança. | `lib/bloomy/schedules/schedule_filters.ex:87` |
| 45 | `supervisor_query` é a quarta definição de atraso do arquivo e a única com duas janelas na mesma consulta: imediata para os agendamentos do próprio supervisor, 48 horas para os dos colegas da unidade. É a única vez que o sistema aplica a alguém um prazo mais duro que aos outros — vale preservar explicitamente, porque parece erro para quem for simplificar. | `lib/bloomy/schedules/schedule_filters.ex:95-118` |
| 46 | O filtro `health_care` reconhece duas das quatro combinações de vigência: ambas as datas dentro do período, ou ambas nulas. Um plano com **só uma** das datas não casa em nenhum ramo e não cobre data nenhuma, em consulta nenhuma. É a forma mais natural de registrar cobertura em curso, e ela falha em silêncio. | `lib/bloomy/schedules/schedule_filters.ex:246-249` |
| 47 | `GenerateMonthlyClosuresWorker` filtra `p.status == true` — ativo **quando o worker roda**, não durante o mês fechado. Um profissional desativado antes da virada não recebe fechamento pelas horas que trabalhou, e a ausência de um fechamento não gera sinal nenhum. | `lib/bloomy/professionals/closures/generate_monthly_closures_worker.ex:41` |
| 48 | O mesmo worker conta `failures` e devolve `{:ok, ...}` de qualquer jeito. O Oban registra sucesso, não reprocessa, e ninguém é avisado — a contagem de falhas existe no retorno e não vira nada. Mesmo padrão dos achados 14 e 30. | `lib/bloomy/professionals/closures/generate_monthly_closures_worker.ex:24-27` |
| 49 | O worker usa `Date.utc_today()` para decidir a competência. Rodando à meia-noite UTC do dia 1º, em Brasília são 21h do último dia do mês que está sendo fechado — as três últimas horas caem no fechamento seguinte, na faixa em que acompanhamento terapêutico acontece. Sexta ocorrência do padrão de fuso. | `lib/bloomy/professionals/closures/generate_monthly_closures_worker.ex:14` |
