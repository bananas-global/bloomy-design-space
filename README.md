# Bloomy Design Space

Especificação executável da experiência pretendida do Bloomy, sistema de gestão
de clínicas de **terapia ABA para autismo**. Atendimento, programas, protocolos,
autorizações, fechamentos e os três portais externos, em situações nomeadas pelo
domínio, abertas por link, com dados sintéticos e regras de negócio visíveis.

Não é um sistema de produção, não é um design system e não é promessa de reuso de
código. O Bloomy real é um monólito Elixir/Phoenix: a engenharia traduz o
comportamento descrito aqui, não porta os componentes React.

## Começar

```bash
pnpm install
pnpm dev
```

Abre em `http://localhost:5206` — porta derivada do nome do projeto, então é
sempre a mesma e não colide com outros Design Spaces abertos ao mesmo tempo.

A raiz mostra o produto como mapa de situações. Cada situação abre por URL
própria.

## O que existe hoje

286 cenários em vinte e quatro módulos, cobrindo sucesso, vazio, permissão, regra e
exceção. Desses, 285 formam a **referência portada e ainda não validada**; a única
mudança proposta reorganiza as abas de Listas gerenciais sem alterar o conteúdo
das onze listas existentes.

O conteúdo foi portado do monólito Elixir/Phoenix em 2026-08-01/02. O log do
porte — o que foi traduzido de onde, e treze achados sobre o sistema real — está
em [`docs/porte-do-sistema-real.md`](docs/porte-do-sistema-real.md).

| Módulo | Situações |
| --- | --- |
| **Agenda** | dia normal, vazia, conflito de horário, reagendamento com conflito, consulta cancelada, cancelamento exige justificativa, sem permissão para cancelar, ausência antes da tolerância, paciente ausente |
| **Atendimento** | pronto para atendimento, sem check-in, serviço não cobrável, profissional com atendimento em aberto, em andamento, pendente de registro, aguardando quem atendeu, aguardando o supervisor, finalizado, reverter permitido, reverter bloqueado, sem permissão para reverter, aplicador só lê, supervisão entre profissionais |
| **Programas** | plano de intervenção, sem plano, critério de domínio, linha de base, cascata de aquisição, regressão, programa incidental, versão substituída, aplicador sem acesso |
| **Na Clínica** | manhã na unidade, presente sem atendimento pronto, unidade vazia, visto por quem atende, visto pelo People |
| **Protocolos** | aplicação em andamento, retomar de onde parou, formato ABLLS-R, aplicação concluída, reavaliação atrasada, recém-aberta, recepção sem acesso |
| **Gerência** | segunda de manhã, o mais antigo não é o mais urgente, aplicador sem supervisor, nenhuma pendência, quem atende sem acesso |
| **Mapa de horas** | mapa com conflitos, sem agenda não é ocupado, perde profissional e sala, mapa limpo, mapa aplicado, mapa em branco |
| **Chat do caso** | uma semana de conversa, permanência antes do envio, menção que não chega, único canal do aplicador, chat vazio |
| **Relatórios** | relatórios do paciente, declaração incompleta, declaração com conteúdo clínico, recepção emitindo relatório clínico, PDF gerado, nenhum relatório |
| **Prontuário** | prontuário completo, documento que ninguém abre, documentos vencendo, anamnese incompleta, faltas acima do limite, sem critérios, recepção sem acesso |
| **Visitas** | o funil de julho, parado há dois meses, a conversão pede mais, sem disponibilidade, nenhuma visita |
| **Pacientes** | lista, vazia, cadastro completo, cadastro incompleto, menor sem responsável, menor com responsável, prontuário restrito (recepção), prontuário restrito (profissional) |
| **Estrutura** | estrutura da unidade, serviço sem sala, serviço impossível de agendar, três origens de bloqueio, não cobrável dispensa check-in, unidade sem estrutura |
| **Portal da operadora** | lista de presença, atendimentos sem fechar, agendamentos omitidos pelo escopo, o que a operadora não vê, competência sem movimento |
| **Portal da família** | portal, plano esperando aceite, plano aceito, plano vencido, plano de outra família, termos não aceitos, sem atendimentos |
| **Portal público** | totem esperando CPF, CPF errado, CPF sem cadastro, escolher quem chegou, nenhum atendimento hoje, chegada registrada, QR Code inválido, pesquisa de satisfação, nota baixa |
| **Equipe** | equipe da unidade, supervisão define a assinatura, profissional a definir, cadastro incompleto, contrato com taxa faltando, hora zerada válida, contrato sem nota, desativar sem data, quem atende sem acesso, unidade vazia |
| **Faturas** | pronta para fechar, as duas perdas silenciosas, faltam identificadores, nada atendido, lote já gerado, operadora sem códigos TISS, operação sem acesso |
| **Fechamentos** | o mês etapa por etapa, aguardando aceite, invisível em conferência, nota é do profissional, bloqueada para outros, contrato sem nota, pagar sem comprovante, pagar com comprovante, pago congelado, vazio |
| **Autorizações** | central, vazia, autorizada com saldo, pacote esgotado trava tudo, capitation não multiplica, validade vencida, autorizada parcialmente, erro de sincronização, aguardando documentação, recepção sem acesso |
| **Notificações** | quatro avisos do sistema, aviso sem destino, destino que não abre, informação exposta no texto, tudo lido, nenhuma notificação |
| **Supervisão** | janela de trinta dias, assinaturas paradas, supervisor sem acesso, vínculo recém-criado, janela futura, nenhum atendimento |
| **Mapa da unidade** | semana por profissional, agenda indefinida, horário omitido, simultaneidade, eixo do paciente, People sem acesso |
| **Controle de horas** | semana, arredondamento incorreto, localização ausente, saída anterior à entrada, previsão sem fim, paginação, leitura sem correção, vazio |

O módulo **Atendimento** é o que descreve o produto de verdade: o Bloomy é um
sistema de terapia ABA para autismo, e a sessão — com programas, tentativas,
evolução e cadeia de assinatura — é onde isso aparece. O porte do sistema real
está registrado em [`docs/porte-do-sistema-real.md`](docs/porte-do-sistema-real.md).

O baseline de 285 está com status `ported` (**Portado — não validado**). Quando
um tema entra no fluxo real de design, ele passa para `proposed` ou ganha um novo
cenário; só depois da validação de negócio pode chegar a `approved`. Listas
gerenciais está nesse caminho com um único cenário proposto para reorganizar a
navegação.

## Regras implementadas

Toda regra tem implementação em `src/rules/` e teste em `tests/rules.test.ts`.
Regra sem teste é frase que a engenharia reinterpreta.

| Id | Regra |
| --- | --- |
| `cancel-requires-reason` | Cancelamento exige justificativa registrada. |
| `cancel-requires-permission` | Só perfis com `schedules.cancel` cancelam: recepção, coordenador e admin. |
| `no-double-booking` | Mesmo profissional não pode ter atendimentos sobrepostos. |
| `no-show-after-tolerance` | Ausência só 15 minutos depois do horário. |
| `minor-requires-guardian` | Menor de 18 exige responsável legal completo. |
| `incomplete-registration-blocks-scheduling` | Campo obrigatório em falta bloqueia agendar. |
| `restricted-record-requires-permission` | Prontuário restrito exige permissão específica. |
| `authorization-availability-needs-all-three` | Autorizada, dentro da validade e com saldo em **todos** os pacotes. |
| `capitation-ignores-quantity` | No capitation o teto é o máximo mensal puro, sem multiplicar. |
| `partial-authorization-is-not-authorization` | Parcial liberou menos que o pedido, e não pode parecer autorizada. |
| `sync-error-is-not-denial` | Falha de integração se resolve reenviando, não remontando o pedido. |
| `pending-status-names-who-acts-next` | Cada espera diz de quem é a próxima ação. |
| `only-admin-edits-authorization` | Criar, editar e apagar autorização é exclusivo do admin. |
| `closure-hands-over-at-each-stage` | Cada etapa do fechamento tem um dono diferente. |
| `closure-status-moves-backward-only` | Correção manual de situação só volta, nunca avança. |
| `closure-is-invisible-until-sent` | O profissional não vê o próprio fechamento em conferência. |
| `paid-closure-is-frozen` | Fechamento pago não aceita interação de nenhum papel. |
| `invoice-belongs-to-the-professional` | Só o dono anexa a própria nota fiscal — regra de identidade. |
| `payment-proof-belongs-to-the-clinic` | Comprovante é de admin e People, e a confirmação depende dele. |
| `invoice-includes-only-executed-authorizations` | Autorização sem atendimento realizado não entra na fatura. |
| `authorization-without-agreement-is-worth-zero` | Linha sem acordo ativo entra valendo zero, em silêncio. |
| `invoice-needs-number-protocol-igdr` | Fechar o lote exige número, protocolo e IGDR. |
| `generated-invoice-is-final` | Fatura com lote gerado não é editada. |
| `tbd-professional-is-a-placeholder` | Profissional a definir exige dois campos, não dez. |
| `supervision-link-defines-second-signature` | A segunda assinatura do atendimento vem do vínculo de estágio. |
| `one-supervision-link-per-pair` | O mesmo supervisor não se vincula duas vezes ao mesmo profissional. |
| `contract-type-decides-required-rates` | Fixo e horista exigem valores diferentes — e zero vale só num deles. |
| `contract-decides-invoice-requirement` | O contrato do mês decide se o fechamento pede nota fiscal. |
| `deactivation-needs-a-date` | Desativar exige a data que separa o histórico do que ainda vale. |
| `kiosk-distinguishes-three-failures` | CPF errado, sem cadastro e sem agendamento são três mensagens. |
| `kiosk-lists-only-today-and-unstarted` | O totem lista só o de hoje, sem cancelamento e sem atendimento iniciado. |
| `kiosk-never-goes-back` | As etapas do totem avançam; a única saída é recomeçar. |
| `nps-rating-is-zero-to-ten` | Nota de 0 a 10, obrigatória exceto no convite ainda sem resposta. |
| `nps-code-identifies-the-invite` | Código de cinco caracteres, único por convite. |
| `plan-acceptance-records-who-when-and-what` | O aceite grava aprovação, assinatura, data e qual responsável. |
| `plan-is-visible-only-to-its-guardian` | O escopo do plano é por vínculo, não por link. |
| `expired-plan-cannot-be-accepted` | Plano vencido não recebe aceite. |
| `plans-cannot-overlap-for-a-patient` | Dois planos do mesmo paciente não têm vigências sobrepostas. |
| `terms-acceptance-records-context` | O aceite dos termos guarda instante, endereço de rede e dispositivo. |
| `insurer-sees-only-its-own-beneficiaries` | O vínculo é o plano, não a clínica. |
| `incomplete-schedules-are-hidden-from-the-insurer` | O escopo omite agendamentos incompletos, e o faz em silêncio. |
| `insurer-sees-attendance-not-clinical-record` | A operadora vê a prestação, não o conteúdo clínico. |
| `attendance-list-counts-only-what-happened` | Só Finalizado conta como prestado. |
| `service-decides-which-rooms-serve` | O serviço declara os tipos de sala que servem para ele. |
| `room-capacity-limits-the-session` | Capacidade limita o atendimento; sala inativa não conta. |
| `three-scopes-of-blocking` | Unidade, profissional e calendário — três origens, três saídas. |
| `service-without-room-type-is-a-contradiction` | Exigir sala sem declarar tipo torna o serviço inagendável. |
| `not-chargeable-service-skips-checkin` | O cadastro do serviço é que dispensa o check-in. |
| `only-clinical-documents-are-visible` | Só documento clínico abre, e para sete dos dez papéis. |
| `documents-warn-before-expiring` | O prazo de aviso é configurado em cada documento. |
| `anamnese-cannot-finish-incomplete` | Quatro campos de comportamento travam a finalização. |
| `absence-alerts-are-per-patient` | Os limites de falta são do paciente, não da clínica. |
| `report-urgency-depends-on-requester` | Atraso da operadora custa faturamento; da família, confiança. |
| `applicator-without-supervisor-cannot-close` | Sem vínculo, a sessão acontece e não tem quem assine. |
| `management-fronts-have-owners` | Fila sem dono é fila que ninguém trabalha. |
| `patient-without-clinical-owner-drifts` | Nada trava, e é justamente esse o problema. |
| `hour-map-generates-with-holes` | Conflito apaga o campo e cria o horário assim mesmo. |
| `conflict-family-decides-what-is-lost` | Conflito de profissional apaga o profissional; de sala, a sala. |
| `no-agenda-is-not-a-clash` | Sem agenda padrão é cadastro faltando, não horário ocupado. |
| `applied-map-is-not-redrawn` | Mapa aplicado não é editado: os agendamentos já existem. |
| `chat-is-per-patient` | O canal é do paciente, e acompanha o caso. |
| `chat-messages-are-permanent` | Sem edição e sem exclusão: o schema não tem campo para isso. |
| `mention-notifies-but-does-not-grant` | Menção notifica e não dá acesso a nada. |
| `chat-is-the-applicators-only-written-channel` | É a única superfície escrita do caso que ele alcança. |
| `lost-is-a-side-exit-not-the-last-step` | Perdido sai de qualquer passo, e não é o fim da fila. |
| `conversion-needs-more-than-the-visit-collected` | Converter exige cinco dados que a visita nunca coleta. |
| `availability-is-what-makes-the-first-schedule-possible` | Sem janela declarada, o contato trava no agendamento. |
| `step-history-explains-the-funnel` | Só o histórico distingue quem está parado de quem chegou ontem. |
| `report-type-decides-the-destination` | Cada tipo tem destinatário fora da clínica, e o conteúdo muda com ele. |
| `attendance-declaration-carries-no-clinical-content` | A declaração prova presença, e só. |
| `generated-report-is-frozen` | Com PDF gerado, o documento já saiu: cancele e emita outro. |
| `issuing-does-not-check-reading` | Quem emite emite os sete tipos, mesmo sem ler o prontuário. |
| `session-requires-checkin` | Atendimento cobrável de paciente só começa depois do check-in. |
| `one-open-session-per-professional` | Um profissional não tem dois atendimentos em aberto. |
| `empty-register-blocks-signature` | Finalizar sem evolução leva a pendente de registro, não a assinatura. |
| `owner-signs-before-supervisor` | Quem atendeu assina antes do supervisor. |
| `revert-requires-clean-session` | Reverter só enquanto não há tentativa nem resposta de protocolo. |
| `revert-requires-permission` | Só perfis com `custom_services.revert` revertem. |
| `mastery-closes-phase` | Passo fecha a fase ao atingir o percentual no número de sessões do critério. |
| `consecutive-differs-from-cumulative` | Consecutivo zera na primeira sessão abaixo do alvo; cumulativo não. |
| `baseline-has-no-performance-target` | Linha de base encerra por número de sessões, sem meta de acerto. |
| `regression-returns-to-previous-phase` | Queda abaixo do critério de regressão devolve o passo à fase anterior. |
| `acquisition-cascades-upward` | Passo fecha programa, que fecha objetivo, que fecha meta. |
| `superseded-version-keeps-its-history` | Versão substituída não é apagada nem editada: as tentativas são dela. |
| `protocol-resumes-at-first-unanswered` | Retomar vai ao primeiro item em branco: área atual, próximas, depois o começo. |
| `protocol-progress-is-completion-not-score` | O percentual mede preenchimento, não desempenho do paciente. |
| `protocol-area-progress-is-independent` | Cada área tem progresso próprio, contado sobre as questões dela. |
| `answer-scale-depends-on-format` | Escala compartilhada no formato padrão; faixa por item no ABLLS-R. |
| `reassessment-follows-the-instrument` | A data de reavaliação sai do intervalo declarado no protocolo. |
| `one-active-checkin-per-patient` | Sem check-out, um novo check-in é recusado. |
| `checkin-marks-later-schedules-ready` | O check-in põe em Pronto os horários do dia que ainda não passaram. |
| `checkin-marks-earlier-schedules-delayed` | E marca como Atrasado os que já passaram — atraso não é falta. |
| `checkout-returns-schedules-to-scheduled` | O check-out devolve a Agendado tudo que estava Pronto no dia. |
| `in-clinic-tabs-follow-role` | Pacientes some para People; profissionais some para quem atende. |

## Tokens: divergência deliberada com o produto real

Os tokens vêm de `bloomy/assets/css/app.css`, com correções. Vários tokens do
produto em produção não atingem WCAG 2.2 AA quando usados como texto ou como
preenchimento de botão:

| Token do produto | Medido | Usado para |
| --- | --- | --- |
| `--brand-blue` `#58bada` | 2.22:1 | CTA primário e ícones |
| `--brand-blue-dark` `#4094bb` | 3.40:1 | cor de link e títulos h1 |
| `--fg-2` alfa 0.6 | 4.01:1 | texto secundário e breadcrumb |
| `--fg-3` alfa 0.45 | 2.65:1 | placeholder de campo |
| verde `#3db03a` | 2.81:1 | indicador positivo |

O Design Space usa a versão corrigida, porque descreve a experiência
**pretendida**. O raciocínio, os valores novos e a medida de cada um estão em
[`docs/decisions/0001-tokens-corrigidos-para-contraste.md`](docs/decisions/0001-tokens-corrigidos-para-contraste.md).

`tests/tokens.test.ts` valida os pares corrigidos **e** afirma que os do produto
ainda falham — se o Bloomy corrigir a origem, o teste quebra e avisa que o
registro ficou obsoleto.

Para levar ao time: [`docs/pauta-contraste.md`](docs/pauta-contraste.md), com uma
[versão visual para apresentar](https://claude.ai/code/artifact/8c5ae249-1097-43af-894e-c3fb849a9abe).

## Qualidade

```bash
pnpm check
```

```bash
pnpm test:e2e
```

O que quebra o build de propósito:

- **Typecheck.** Contrato de componente e de cenário.
- **Contrato de cenário.** Fixture, persona, regra ou rota inexistente, e
  qualquer aviso acumulado.
- **Contraste dos tokens.** Par abaixo do alvo, ou com margem menor que 0.1 —
  aprovado por 4.5 exato não sobrevive ao próximo ajuste.
- **Axe, violação séria ou crítica.** Por cenário, nos 24, na mesma jornada
  Playwright.
- **Regras de negócio.** 30 testes cobrindo fronteiras: a tolerância exata dos 15
  minutos, sobreposição que só encosta na borda, menor que fez 18 anos.

Estado atual: 45 testes unitários, 75 jornadas Playwright.

Verificação automática é piso, não teto. Ordem de leitura confusa, rótulo
tecnicamente presente mas sem sentido e fluxo impossível de completar com leitor
de tela passam no axe — revisão humana nas jornadas críticas continua necessária.

## Determinismo

A mesma URL produz sempre a mesma situação. Duas consequências práticas no
código:

- Nenhuma fixture chama `new Date()` ou `Math.random()`. A data de referência é
  `TODAY` em `src/contracts/index.ts`, e a agenda carrega um `now` declarado para
  que a tolerância de ausência seja verificável.
- Idade é medida contra `TODAY`, não contra o relógio. Sem isso, o cenário "menor
  sem responsável" deixaria de existir no aniversário de 18 anos da fixture,
  meses depois de alguém tê-lo aprovado.

## O motor

Este projeto consome o motor publicado no npm:

```json
"@brucesantos/design-space": "^0.1.0"
```

Para desenvolver o motor e o produto ao mesmo tempo, aponte temporariamente para a
pasta local com `pnpm add @brucesantos/design-space@link:../design-space/packages/core`
— e lembre de voltar antes de commitar, senão o build da Vercel quebra: lá não
existe a sua pasta.

O motor não contém nenhuma UI, token ou regra do Bloomy — a fronteira está descrita
no [`AGENTS.md`](AGENTS.md).

## Preview

Todo push publica um preview na Vercel, **público e sem login**. Quem tem o link
abre e revisa, sem conta e sem convite.

- **URL de branch** — revisão em andamento.
- **URL de commit** — aprovação e handoff. Imutável.

O header `noindex` permanece: preview aberto não é preview indexado.

### Quem publica é o GitHub Actions, não a Vercel

O `vercel.json` tem `git.deploymentEnabled: false` — a integração Git da Vercel está
desligada de propósito. Quem publica é o [`deploy.yml`](.github/workflows/deploy.yml).

**O motivo é dinheiro.** No plano Pro, a Vercel só publica um commit se o autor do
commit for membro pago do time. Com um assento só, apenas os commits do dono viravam
deploy. Publicando pelo Actions com um token, quem aparece como autor do deploy é o
token — então qualquer pessoa com push no repositório dispara um preview, e o time
continua sem consumir assento.

O que o workflow faz, em ordem: typecheck e testes (falha barata, antes de gastar um
deploy), build no runner do GitHub, publica só o resultado na Vercel, e roda a
jornada Playwright com axe **contra a URL recém-publicada**. O link aparece no resumo
da execução.

Se o workflow parar de rodar, nada é publicado. É deslocamento de responsabilidade,
não redundância.

**Secrets necessários** no repositório (Settings → Secrets and variables → Actions):

| Secret | De onde vem |
| --- | --- |
| `VERCEL_TOKEN` | vercel.com → Account Settings → Tokens |
| `VERCEL_ORG_ID` | `.vercel/project.json`, depois de rodar `vercel link` |
| `VERCEL_PROJECT_ID` | o mesmo arquivo |

## Ver também

- [`AGENTS.md`](AGENTS.md) — instruções e guardrails para agentes de IA.
- [`docs/product.md`](docs/product.md) — visão, vocabulário, personas e cobertura.
- [`docs/handoff.md`](docs/handoff.md) — modelo de entrega para engenharia.
- [`docs/pauta-contraste.md`](docs/pauta-contraste.md) — pauta de design sobre contraste, para levar ao time.
- [`docs/decisions/`](docs/decisions/) — decisões **deste produto**.
- [Decisões do modelo](https://github.com/bananas-global/design-space/tree/main/docs/decisions) — fixture sintética, preview público, source
  mapping e as demais, que valem para todos os Design Spaces e vivem uma vez só.
