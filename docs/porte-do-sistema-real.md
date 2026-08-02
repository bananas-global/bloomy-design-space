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

## Achados sobre o sistema real

Coisas encontradas ao ler o monólito que valem conversa com o time. Não são
bugs do Design Space; são observações sobre o produto.

| # | Achado | Onde |
| --- | --- | --- |
| 1 | `UnitPolicy.can?(role, :list)` compara com `"admin_clinic"`; o papel se chama `clinic_admin`. O admin de clínica não lista unidades. | `lib/bloomy/units/unit_policy.ex:6` |
| 2 | Metade das policies concede por lista negativa (`role not in`), liberando por omissão para papéis não considerados. `people` aparece com permissões de paciente que outra policy bloqueia antes. | várias |
| 3 | `patients.see_behavior_intervention_plan` exclui `therapeutic_companion` e `specialist`, e não exclui `applicator`. Quem conduz a intervenção não vê o plano; quem aplica, vê. | `lib/bloomy/patients/patient_policy.ex:29` |
| 4 | A Central de Autorizações verifica permissão na entrada da tela; nenhuma ação interna — adicionar autorização, editar agendamento, abrir token — tem verificação própria. | `lib/bloomy_web/backoffice/live/authorization_hub/` |
| 5 | `Appointment.valid_register?/1` retorna `true` quando o texto está **vazio**. O comportamento em `Finish` está correto; o nome diz o oposto do que a função faz. | `lib/bloomy/custom_services/appointment.ex:89` |
| 6 | `ProgramPolicy` não inclui `applicator` em nenhuma das oito ações, nem em `list`. Quem aplica o programa não tem permissão de vê-lo. | `lib/bloomy/programs/program_policy.ex` |
| 7 | A cascata de aquisição pergunta pela negativa (`has_unaquired_step?`), então um nível **sem filhos** conta como adquirido. Um objetivo sem programas fecha sozinho. | `lib/bloomy/programs/context.ex:119` |
| 8 | `ProtocolPolicy.can?(role, :list)` não inclui `supervisor`. Quem supervisiona o caso não alcança a avaliação que o originou — nem para leitura. | `lib/bloomy/protocols/protocol_policy.ex` |
| 9 | Em `CalculateProtocolExecution`, a variável que guarda as questões **respondidas** se chama `unanswered_count`. A conta está certa; o nome diz o contrário. Mesma classe do achado 5. | `lib/bloomy/custom_services/calculate_protocol_execution.ex:6` |
| 10 | No check-in, um horário vencido que estava em **Agendado** vira Atrasado, mas um que já estava em **Pronto** volta para Agendado. A mesma situação de fato — paciente presente, horário vencido — para em dois estados conforme o que veio antes. | `lib/bloomy/service_records/context.ex:94-141` |
| 12 | `provider_code` e `requester_code` de `HealthCare` são opcionais no changeset e obrigatórios na geração do lote TISS. O cadastro passa e o envio falha. | `lib/bloomy/health_cares/health_care.ex` |
| 14 | Finalizar uma anamnese incompleta **relata sucesso e não finaliza**. `keep_pending_until_required_fields/1` devolve o status para `pending` dentro do changeset, sem erro — quem clicou vê a anamnese ainda aberta, sem explicação. O cenário `record.anamnese-incomplete` mostra o atual e o proposto lado a lado. | `lib/bloomy/anamneses/anamnese.ex:31` |
| 13 | `SchedulePolicy.scope/2` esconde agendamentos `:incomplete` do usuário de operadora sem sinalizar. A lista de presença fica impossível de conciliar com a fatura quando os números não batem. | `lib/bloomy/schedules/schedule_policy.ex` |
| 11 | `ClosurePolicy` se contradiz sobre o especialista: `can_interact?` diz que ele age na etapa de aceite, mas `scope/2` não o lista e ele cai no `where: false`. O especialista não vê fechamento nenhum, nem o próprio. | `lib/bloomy/professionals/closures/closure_policy.ex` |
