# Bloomy — produto

## Visão

O Bloomy é um sistema de **terapia ABA para autismo**. Não é um sistema de
clínica genérico com pacientes autistas dentro: a estrutura do produto é a
estrutura do método. Programas com fases de aquisição, protocolos ABLLS-R,
tentativas com dica verbal e motora, aplicadores atuando sob supervisão formal,
planos de intervenção comportamental.

Essa frase é a mais importante deste documento, e a mais fácil de perder. Um
recorte que trate o Bloomy como agenda + prontuário + faturamento produz um
produto plausível, navegável e errado — porque a unidade de trabalho da clínica
não é a consulta, é o **passo de um programa aplicado ao longo de meses**.

O Bloomy real é um monólito Elixir/Phoenix que renderiza páginas e executa
regras internamente, sem expor REST nem GraphQL. Os contratos em
`src/contracts/` foram derivados dos schemas, das políticas e do `enums.po` do
sistema real, e não modelados por conta própria — a diferença aparece nos
detalhes que ninguém inventaria, como as doze situações de agendamento ou a
distinção entre critério consecutivo e cumulativo.

## Vocabulário

O vocabulário é a interface com PO, negócio e cliente. Um nome errado aqui
aparece na navegação e na busca, e o time passa a traduzir mentalmente. Os
termos abaixo vêm do produto real — vários deles não existem fora de ABA.

| Termo | Significado |
| --- | --- |
| Programa | O plano de ensino de uma habilidade, dividido em passos, aplicado ao longo de meses. |
| Passo | A unidade que se ensina e se mede. Tem critério de domínio próprio. |
| Fase de aquisição | Em que ponto do ensino o passo está: linha de base, aquisição, manutenção, generalização. |
| Critério de domínio | Desempenho e número de sessões que declaram um passo aprendido. **Consecutivo** exige sequência; **cumulativo**, só o total. |
| Tentativa | Uma apresentação do estímulo, com a resposta e a dica que foi necessária. |
| Dica | O apoio dado para a resposta acontecer — verbal, motora, gestual. O objetivo é retirá-la. |
| Protocolo | Instrumento de avaliação padronizado, como o ABLLS-R. Perguntas com pontuação, não texto livre. |
| Aplicador | Quem aplica o programa na sessão, sob supervisão formal de um profissional habilitado. |
| Supervisão | O vínculo formal entre quem aplica e quem responde clinicamente. Decide quem assina. |
| Plano de intervenção | O documento que reúne os programas ativos do paciente e é aceito pelo responsável. |
| Mapa de horas | A semana pretendida do paciente, que o sistema materializa em agendamentos. |
| Fechamento | O acerto periódico entre a clínica e o profissional pelas horas atendidas. |
| Autorização | A liberação da operadora para um número de sessões num período. |
| Guia | A cobrança enviada à operadora, no padrão TISS. |
| Encaixe | Atendimento inserido fora da grade. |
| Check-in | O registro de que o paciente chegou à unidade. Alguns serviços dispensam. |

## Papéis

Dez papéis, não cinco. E eles não formam uma escada: **dois papéis clínicos com
autoridade parecida alcançam telas diferentes**, porque as políticas do sistema
real foram escritas uma a uma, por lista, ao longo de anos.

Os papéis se dividem em dois escopos, e a diferença é estrutural:

| Escopo | Papéis | Como funcionam |
| --- | --- | --- |
| Global | `admin`, `clinic_admin`, `attendant`, `operation`, `people` | Valem para a clínica inteira. |
| Por unidade | `coordinator`, `supervisor`, `specialist`, `therapeutic_companion`, `applicator` | A mesma pessoa pode ter papéis diferentes em unidades diferentes. |

| Papel | Rótulo em pt-BR | O que faz |
| --- | --- | --- |
| `admin` | Admin | Tudo, incluindo estrutura e faturamento. |
| `clinic_admin` | Admin de Clínica | O mesmo, dentro da clínica. |
| `attendant` | Recepção | Opera a agenda o dia inteiro. Cancela, remarca, faz check-in. |
| `operation` | Operação | Autorizações, guias, relação com as operadoras. |
| `people` | People | Cadastro de profissionais, contratos, agenda padrão. |
| `coordinator` | Coordenador | Distribui a grade da unidade e monta mapa de horas. |
| `supervisor` | Supervisor | Responde clinicamente pelos casos que supervisiona. Assina em segundo. |
| `specialist` | Especialista | Avalia, aplica protocolo, escreve plano de intervenção. |
| `therapeutic_companion` | Terapeuta | Atende, registra sessão, executa programa. |
| `applicator` | Aplicador | Aplica o programa sob supervisão. **Não alcança programa, protocolo nem prontuário.** |

As permissões não são escritas à mão: `scripts/gen-permissions.mjs` deriva 104
permissões × 10 papéis diretamente das 26 políticas Elixir e emite
`src/personas/permissions.ts`. **Esse arquivo nunca é editado à mão** —
transcrever mil combinações falha em silêncio, e o silêncio é o problema.

O aplicador merece um parágrafo. Ele é quem passa mais tempo com a criança, e
`ProgramPolicy` o exclui das oito ações de programa. Quem aplica não pode ver o
que aplica. O Design Space não corrige isso: reproduz, testa e registra — a
decisão de mudar é da engenharia, e ela só é possível se estiver visível.

## Módulos

Vinte e um módulos, 156 cenários. Na ordem em que foram portados:

| # | Módulo | Cenários | O que só existe aqui |
| --- | --- | --- | --- |
| 1 | Agenda | 9 | As doze situações de agendamento, e a tolerância antes da ausência. |
| 2 | Atendimento | 14 | A ordem dos impedimentos para começar, e a segunda assinatura. |
| 3 | Programas | 9 | Critério consecutivo × cumulativo, e a cascata de aquisição. |
| 4 | Protocolos | 7 | Pontuação por pergunta, e o contador que conta o oposto do nome. |
| 5 | Na clínica | 5 | O painel do dia, e as abas que mudam por papel. |
| 6 | Pacientes | 8 | A pendência nomeada, e o menor sem responsável. |
| 7 | Autorizações | 10 | O saldo de sessões, e a central que gateia a tela e não as ações. |
| 8 | Fechamentos | 10 | As etapas que dependem do contrato do profissional. |
| 9 | Guias | 7 | O lote TISS, e os campos opcionais no cadastro e obrigatórios no envio. |
| 10 | Equipe | 10 | O vínculo de supervisão, que decide quem assina em segundo. |
| 11 | Portal público | 9 | Auto check-in, anamnese e NPS — sem menu, sem sessão. |
| 12 | Portal do responsável | 7 | O aceite do plano, e o que fica registrado dele. |
| 13 | Portal da operadora | 5 | A lista de presença, e o que o escopo esconde em silêncio. |
| 14 | Estrutura | 6 | Serviços, salas e a dispensa de check-in que mora no serviço. |
| 15 | Prontuário | 7 | A anamnese que relata sucesso e não finaliza. |
| 16 | Gerência | 5 | As frentes em aberto, sem inventar valor monetário. |
| 17 | Mapa de horas | 6 | A grade que nasce com buracos em vez de erro. |
| 18 | Chat do caso | 5 | O único canal escrito do aplicador. |
| 19 | Visitas | 5 | O funil, e a conversão que pede o que a visita não coleta. |
| 20 | Relatórios | 6 | Sete tipos, e o destinatário que decide o cuidado. |
| 21 | Notificações | 6 | Quatro avisos no produto inteiro, três sem destino. |

## Ligações entre módulos

O que mais surpreende quem lê módulo a módulo: **várias regras não moram no
módulo onde aparecem**. Vale conhecer antes de mexer em qualquer um deles.

| O que parece ser de… | mora em… | e é lido por… |
| --- | --- | --- |
| Atendimento (segunda assinatura) | vínculo de estágio, `src/rules/team.ts` | `session.needsSupervisorSignature` |
| Fechamento (etapas de nota fiscal) | contrato do profissional, `src/rules/team.ts` | `closure.issuesInvoice` |
| Atendimento (dispensa de check-in) | cadastro do serviço, `src/rules/structure.ts` | `service.chargeable` |

## Cobertura

Cada situação do produto vira um cenário, e cada cenário carrega cinco coisas:
fixture sintética determinística, regra com implementação testável, tela React,
jornada Playwright e nota de acessibilidade.

| Camada | Quantidade |
| --- | --- |
| Cenários | 156 |
| Regras declaradas | 99 |
| Testes de regra | 392 |
| Jornadas Playwright | 486 (axe incluso, um por cenário) |

Erro e carregamento não têm cenário próprio: são alcançáveis pelo controle de
rede em qualquer cenário. Um cenário dedicado só se justifica quando a tela de
erro tiver conteúdo específico daquela situação.

## Estados de dados

Toda tela responde cinco estados, e os testes de jornada verificam isso:

| Estado | Como abrir |
| --- | --- |
| Sucesso | padrão do cenário |
| Carregando | `?network=loading` |
| Vazio | `?network=empty` ou fixture `*-empty` |
| Erro | `?network=error` |
| Sem permissão | trocar a persona pelo controle |

## Ação bloqueada continua visível

Nenhuma ação some por falta de permissão ou por estado. Ela fica visível,
desabilitada, e diz o motivo — `unavailableReason` associa a explicação ao
botão por `aria-describedby`.

Esconder é mais limpo de desenhar e pior de usar: quem não vê o botão não
descobre que a ação existe, não sabe a quem pedir, e volta a perguntar no
WhatsApp da equipe. O motivo é a informação; o botão é só onde ela cabe.

## Determinismo

A data de referência é `TODAY = "2026-07-30"` em `src/contracts/index.ts`.
`new Date()`, `Date.now()` e `Math.random()` não aparecem em fixture, regra nem
tela.

Idade é calculada contra `TODAY`, não contra o relógio. Sem isso, o cenário
"menor sem responsável" deixaria de existir no aniversário de 18 anos da
fixture, meses depois de alguém tê-lo aprovado — e ninguém perceberia, porque
os testes continuariam verdes.

## Dados

Nenhum dado real de paciente entra aqui. Todas as fixtures são sintéticas: os
nomes são inventados e os CPFs têm dígito verificador deliberadamente inválido,
para que não possam coincidir com pessoas reais nem serem usados por engano.

## Achados

O porte encontrou 19 divergências no sistema real — políticas que se
contradizem, contadores que contam o oposto do nome, uma anamnese que relata
sucesso sem finalizar. Elas estão em `docs/porte-do-sistema-real.md`, com o
arquivo e a linha de cada uma.

O monólito **não foi modificado**. Um Design Space que corrigisse o produto por
conta própria deixaria de descrevê-lo, e a divergência voltaria na próxima
leitura de alguém que não estava aqui.
