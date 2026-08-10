# Auditoria visual — 10 de agosto de 2026

## Escopo

Foram auditadas as 43 rotas do Design Space que não pertencem ao Login nem à
Agenda. A referência é o checkout local do monólito Bloomy no commit
`395aac89`, principalmente os LiveViews e componentes HEEx em
`lib/bloomy_web/backoffice/live` e `lib/bloomy_web/public/live`.

O staging `https://admin.stg.bebloomy.com.br` foi aberto durante a auditoria,
mas redirecionou para `/backoffice/login`. O clone do `bloomy-kb-tools` também
não contém `.env` nem credenciais. Portanto, esta rodada comprova equivalência
estrutural pelo código real e integridade visual pela renderização local, mas
**não declara comparação pixel a pixel autenticada no staging**.

## Rotas com contraparte visual direta

| Rotas do Design Space | Referência no monólito | Resultado |
| --- | --- | --- |
| `/in-clinic`, `/in-clinic/auto-checkout` | `in_clinic_live/index.ex` e rotina de checkout | cartão e abas Pacientes/Profissionais alinhados; o segundo cenário explica a rotina, não replica uma página própria |
| `/sessions/:id`, `/sessions/meeting-summary` | `custom_services/edit.ex` e componentes de registro | abas e anatomia do atendimento alinhadas; o resumo automático é diagnóstico do worker |
| `/patients`, `/patients/:id` | `patient_live/index.ex` e `patient_live/show.ex` | filtros, tabela, cabeçalho do paciente e navegação primária/secundária alinhados |
| `/patients/:id/plan`, `/patients/:id/phases` | abas do plano em `patient_live/show.ex` | moldura do paciente e contexto de Plano Terapêutico alinhados |
| `/patients/:id/record`, `/patients/:id/reports` | abas Evolução e Relatórios de `patient_live/show.ex` | moldura, abas e hierarquia alinhadas |
| `/patients/:id/hour-map`, `/patients/:id/chat` | abas Mapa de Horas e Conteúdos de `patient_live/show.ex` | moldura e navegação alinhadas |
| `/patients/:id/deactivate` | `patient_live/components/deactivate_patient_modal.ex` | composição convertida para o modal real, preservando o cenário destrutivo |
| `/patients/:id/protocols/:executionId` | `protocols_live/components/patient_protocol.ex` | workspace em duas colunas, áreas, questão/lista, navegação e rodapé alinhados |
| `/notifications` | `notification_live/index.ex` | cabeçalho, ação global, cartões e indicador de não lida alinhados |
| `/supervision` | `supervisor/index.ex` | divisão 1/3–2/3, filtros e lista alinhados |
| `/unit-map` | `unit_map_live/show.ex` | barra de semana, granularidade e eixos alinhados |
| `/clinical-hours` | `professionals/hours_control.ex` | filtros de especialidade, profissional e mês alinhados |
| `/authorizations` | `authorization_hub/index.ex` | navegador de data e alternância diário/lista alinhados |
| `/closures` | `closure_live/index.ex` | quatro indicadores, filtros, tabela Período/Profissional/Valor/Status e conteúdo do fechamento alinhados |
| `/invoices/:id` | `patient_live/components/invoice/show.ex` | cabeçalho Faturas, ação e filtros alinhados; o detalhe explicativo permanece abaixo |
| `/team` | `professionals/index.ex` | cabeçalho, ações, cinco filtros e tabela Status/Nome/Especialidade/Conselho/Tipo/Formação alinhados |
| `/structure` | `unit_live/show.ex` e `unit_live/edit.ex` | resumo da unidade e abas alinhados |
| `/management` | `management/index.ex` | sete abas reais alinhadas |
| `/kiosk` | `public/live/auto_checkin_live/show.ex` e componentes | cabeçalho público, CPF, fluxo e ação fixa alinhados |
| `/nps` | `public/live/nps/index.ex` | títulos, pergunta, escala, comentário e envio alinhados |
| `/insurer` | `health_care/live/patient_attendance_live/index.ex` e `components/layouts/health_care.html.heex` | drawer exclusivo da operadora, cabeçalho, cartão de filtros e vocabulário de Lista de Presença alinhados; os diagnósticos do porte permanecem abaixo |

## Cenários sem página própria no sistema real

Estas rotas são especificações visuais de regras, workers ou contradições do
monólito. Não existe uma tela real que possa ser copiada literalmente; elas
usam o shell e os componentes do módulo de origem sem inventar uma
correspondência:

- pacientes: `/patients/address`, `/patients/deactivation-date`, `/patients/gaps`;
- autorizações: `/authorizations/coverage`, `/authorizations/renewal`, `/authorizations/distribution`;
- financeiro: `/closures/generation`, `/closures/tiss-batch`;
- estrutura: `/structure/fields`, `/structure/today`;
- equipe: `/team/patient-scope`;
- público: `/public/auto-checkin` (diagnóstico da divergência de fuso);
- utilitário: `/componentes`.

## Superfícies sem frontend correspondente neste checkout

Não foram encontrados LiveViews equivalentes para `/guardian`,
`/guardian/plan-signature` e `/prospects`. O portal do responsável deste checkout
expõe login/reset de senha em LiveView e o restante por API, sem o frontend
autenticado correspondente; por isso as duas rotas de responsável preservam os
contratos observados no domínio em superfície standalone. Leads conserva o shell
do backoffice. Elas precisam de uma referência renderizada ou do repositório
frontend correspondente para uma declaração de igualdade visual.

## Verificações executadas

- `pnpm typecheck`: passou.
- `pnpm test`: 667 testes passaram.
- `pnpm build`: passou.
- suíte E2E integral final: 923/924 passaram; a única falha foi intermitente na
  abertura do popup `Período dos programas`, fora das telas alteradas, e passou
  imediatamente quando reexecutada isoladamente;
- todas as 924 verificações ficam cobertas pela execução integral mais a
  reexecução verde dessa única falha; as varreduras globais de toque, contraste,
  teclado, ordem de foco, texto longo, zoom e jargão passaram no estado final;
- render local a 1280×720: sem overflow horizontal na rota de pacientes;
- render local da operadora a 1440×1000: drawer, cabeçalho e cartão de filtros
  conferidos visualmente, sem overflow horizontal;
- staging: alcançado, porém bloqueado por autenticação.

O `pnpm check` continua sujeito às citações históricas quebradas documentadas
no porte do monólito; esse problema precede esta rodada visual.
