# Bloomy — produto

## Visão

Sistema de gestão para clínicas. O recorte deste Design Space cobre os três
módulos onde a experiência tem mais ramificação e mais regra: **Agenda**,
**Pacientes** e **Financeiro**.

O Bloomy real é um monólito Elixir/Phoenix que renderiza páginas e executa regras
internamente, sem expor REST ou GraphQL público. Isso não impede o Design Space:
os contratos em `src/contracts/` foram modelados a partir de fluxo, regra e
exemplo, não derivados de uma API.

## Vocabulário

O vocabulário é a interface com PO, negócio e cliente. Um nome errado aqui aparece
na navegação e na busca, e o time passa a traduzir mentalmente.

| Termo | Significado |
| --- | --- |
| Atendimento | Um horário marcado com paciente, profissional e procedimento. |
| Encaixe | Atendimento inserido fora da grade, geralmente por urgência. |
| Conflito de horário | Dois atendimentos sobrepostos do mesmo profissional. |
| Ausência | Paciente não compareceu, registrado depois da tolerância. |
| Tolerância | 15 minutos após o horário marcado, antes de poder registrar ausência. |
| Cadastro incompleto | Falta campo obrigatório. Bloqueia agendamento. |
| Responsável legal | Adulto responsável por paciente menor de 18 anos. |
| Prontuário restrito | Acesso limitado por decisão clínica ou pedido do paciente. |
| Guia | Solicitação de autorização e pagamento enviada ao convênio. |
| Recusa | Convênio negou a guia, com código e motivo. |
| Pendência de documento | Convênio pediu documento adicional. Não é recusa. |
| Reenvio | Nova submissão da guia ao convênio, após completar a documentação. |

A distinção entre **recusa** e **pendência** é a que mais gera confusão e é a que
o módulo financeiro existe para tornar visível: uma é decisão negativa, a outra é
espera.

## Módulos

### Agenda

O dia da clínica. A recepção trabalha sob interrupção constante, com o paciente na
frente ou no telefone, então cada tela precisa dar resposta imediata e erro
reversível.

Quatro regras: cancelamento exige justificativa, cancelamento exige permissão,
sobreposição de horário é bloqueada, ausência tem tolerância de 15 minutos.

### Pacientes

Cadastro, responsável legal e acesso a prontuário. A decisão de conteúdo mais
importante aqui: **a pendência é nomeada**. "Cadastro incompleto" sem dizer o que
falta obriga a recepção a caçar campo por campo com o paciente esperando.

Duas pendências que parecem uma: campo obrigatório em falta e responsável legal
ausente. O cenário `patients.minor-without-guardian` existe justamente porque o
cadastro está completo pela lista de campos e ainda assim não permite agendar.

### Financeiro

Guias e recusas de convênio. A analista trabalha em lote, por convênio, e precisa
saber exatamente o que falta em cada guia — porque reenvio sem documento é
recusado de novo e cada recusa consome um ciclo do prazo do convênio.

A fila é ordenada por **urgência de ação**, não por data: ordem cronológica
esconderia a guia recusada de três dias atrás embaixo das enviadas hoje.

## Personas

| Persona | Objetivo | Permissões |
| --- | --- | --- |
| Recepcionista | Manter a agenda do dia funcionando. | `agenda.read/create/reschedule`, `patients.read/create`, `finance.read` |
| Recepcionista líder | O mesmo, mais cancelar e registrar ausência. | acima + `agenda.cancel`, `agenda.no_show` |
| Profissional de saúde | Ver os atendimentos e acessar prontuário. | `agenda.read`, `patients.read`, `patients.record.read`, `patients.record.restricted` |
| Analista financeiro | Resolver guias recusadas antes que virem perda. | `finance.read`, `claims.read`, `claims.retry`, `patients.read` |
| Gestora da unidade | Acompanhar sem operar. | leitura em tudo |

A **recepcionista líder** existe como persona separada por um motivo específico: a
permissão de cancelar é o que muda o comportamento da tela de atendimento. Sem as
duas personas, o cenário "sem permissão para cancelar" não teria como existir.

## Cobertura de cenários

| Módulo | Sucesso | Vazio | Regra | Permissão | Exceção |
| --- | --- | --- | --- | --- | --- |
| Agenda | `agenda.day` | `agenda.empty` | `double-booking`, `reschedule-conflict`, `cancel-requires-reason`, `no-show-too-early` | `cancel-no-permission` | `cancelled`, `no-show` |
| Pacientes | `complete`, `minor-with-guardian` | `empty` | `incomplete`, `minor-without-guardian` | `restricted-record`, `restricted-record-professional` | `incomplete`, `minor-without-guardian` |
| Financeiro | `queue`, `invoice-under-review`, `resubmit-allowed` | `queue-empty` | `insurance-denied`, `pending-documents` | `resubmit-no-permission` | `insurance-denied`, `pending-documents` |

Erro e carregamento não têm cenário próprio: são alcançáveis pelo controle de rede
em qualquer cenário (`?network=error`, `?network=loading`). Um cenário dedicado só
se justifica quando a tela de erro tiver conteúdo específico daquela situação.

## Estados de dados

Toda tela responde cinco estados, e os testes de jornada verificam isso:

| Estado | Como abrir |
| --- | --- |
| Sucesso | padrão do cenário |
| Carregando | `?network=loading` |
| Vazio | `?network=empty` ou fixture `*-empty` |
| Erro | `?network=error` |
| Sem permissão | trocar a persona pelo controle |

## Determinismo

A data de referência é `TODAY = "2026-07-30"` em `src/contracts/index.ts`. A
agenda carrega um `now` declarado por fixture, o que torna a tolerância de
ausência verificável sem esperar 15 minutos.

Idade é calculada contra `TODAY`, não contra o relógio. Sem isso, o cenário
"menor sem responsável" deixaria de existir no aniversário de 18 anos da fixture,
meses depois de alguém tê-lo aprovado.
