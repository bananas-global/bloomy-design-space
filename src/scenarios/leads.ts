import type { Scenario } from "@brucesantos/design-space";

/**
 * Cenários do CRM de leads **proposto**.
 *
 * Todos com `status: "proposed"`, e a marca é deliberada: o resto deste
 * repositório descreve o Bloomy que roda hoje, traduzido do monólito. Isto aqui
 * é a extensão desenhada para aposentar o CRM externo e as planilhas do Drive,
 * e não tem uma linha de Elixir por trás ainda. Misturar as duas coisas sem
 * marca tornaria a especificação impossível de conferir contra a realidade.
 *
 * Convivem com os cinco cenários de `prospects.ts`, que descrevem
 * `/backoffice/visitas` como ele é. Dois deles são exatamente o que esta
 * proposta ataca — a conversão que pede o que a visita não coleta, e a
 * disponibilidade que ninguém anota.
 */
export const leadScenarios: Scenario[] = [
  /* ============================================================== funil */
  {
    id: "prospects.crm-funnel",
    title: "O funil em colunas",
    intent:
      "Fazer o estado de cada lead caber num relance — quem está parado, quem é de anúncio pago e quem ninguém está atendendo.",
    route: "/leads",
    persona: "attendant",
    fixture: "leads-funnel",
    rules: [
      "every-active-lead-owes-a-next-action",
      "the-funnel-counts-who-reached-the-step-not-who-is-parked-there",
      "scheduled-means-two-places-in-the-funnel",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada coluna é uma região com heading próprio e contagem no rótulo. O semáforo de follow-up tem texto, não só cor — e mover de etapa é possível pelo seletor de etapa do card, não só arrastando.",
    },
    status: "proposed",
    preconditions: [
      "Vinte e seis leads distribuídos pelas sete etapas em linha, mais convertidos e perdidos.",
      "Quatro deles sem próxima ação.",
    ],
    expected: [
      "Cada coluna mostra o nome da etapa e quantos leads estão nela.",
      "O card traz origem, operadora, dono, tempo na etapa e a saúde do follow-up por extenso.",
      "Convertido e Perdido aparecem recolhidos, e a contagem deles continua visível.",
      "O card sem dono diz “Sem dono” em vez de deixar o campo em branco.",
      "A tela avisa que “Avaliação agendada” não é a mesma etapa que a chave `scheduled` representa hoje, e que a migração precisa reposicionar o histórico.",
    ],
    tags: ["lista", "regra"],
  },
  {
    id: "prospects.crm-funnel-empty",
    title: "Nenhum lead no filtro",
    intent: "Definir o vazio, distinguindo “ainda não entrou ninguém” de “o filtro não casa”.",
    route: "/leads",
    persona: "attendant",
    fixture: "leads-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela explica o que entra no funil e como um lead chega até ele.",
      "As ações de criar lead e importar planilha continuam disponíveis.",
    ],
    tags: ["vazio"],
  },
  {
    id: "prospects.crm-no-next-action",
    title: "Quatro leads sem próxima ação",
    intent:
      "Tornar a ausência de próxima ação tão visível quanto um atraso — porque é o mesmo problema.",
    route: "/leads",
    persona: "attendant",
    fixture: "leads-without-next-action",
    rules: ["every-active-lead-owes-a-next-action"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
    },
    status: "proposed",
    preconditions: [
      "Dois leads sem nenhuma tarefa aberta e dois com tarefa vencida.",
    ],
    expected: [
      "O aviso do topo nomeia quantos leads estão sem próxima ação.",
      "Lead sem tarefa e lead com tarefa atrasada recebem o mesmo tratamento visual.",
      "Cada card diz qual é a próxima ação que a etapa pede.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "prospects.crm-first-contact-sla",
    title: "Dois dias sem ninguém ligar",
    intent:
      "Cobrar o primeiro contato de quem chegou por anúncio — o custo desse lead já saiu do caixa.",
    route: "/leads",
    persona: "attendant",
    fixture: "leads-sla-breach",
    rules: ["first-contact-has-twenty-four-hours"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    preconditions: [
      "Lead de Instagram parado em “Novo” desde 28/07, sem dono e sem nenhuma interação humana.",
      "Interação automática de recebimento não conta como contato.",
    ],
    expected: [
      "O lead fora do SLA aparece destacado, com há quantas horas está em silêncio.",
      "A mensagem diz por que 24 horas importam, e não só que o prazo passou.",
      "O lead que chegou hoje e já tem tarefa não é sinalizado.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "prospects.crm-advance-needs-qualification",
    title: "Agendar avaliação sem saber a operadora",
    intent:
      "Impedir que a primeira coisa cara do funil seja marcada às cegas — sala, especialista e uma hora de agenda.",
    route: "/leads/ld-6",
    persona: "attendant",
    fixture: "leads-needs-qualification",
    rules: ["qualification-is-what-scheduling-an-evaluation-costs"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    preconditions: [
      "Pai ligou perguntando valores e não passou nome, idade nem nível de suporte da criança.",
    ],
    expected: [
      "Avançar para “Avaliação agendada” aparece indisponível, listando os quatro dados que faltam.",
      "As etapas anteriores continuam disponíveis: o lead pode circular incompleto até ali.",
      "O motivo fica associado ao controle, não solto na tela.",
    ],
    tags: ["exceção", "regra"],
  },

  /* ============================================================== perfil */
  {
    id: "prospects.crm-lead-profile",
    title: "O perfil de um lead qualificado",
    intent:
      "Reunir num lugar só o que decide a próxima ligação: o que se sabe da família e tudo que já foi conversado.",
    route: "/leads/ld-9",
    persona: "attendant",
    fixture: "leads-profile",
    rules: ["converting-writes-the-link-back-to-the-lead"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A timeline é uma lista com heading por item. Os atalhos de WhatsApp e ligação são links reais, não ícones sem nome acessível.",
    },
    status: "proposed",
    preconditions: [
      "Lead importado da planilha da Unimed em 18/07, qualificado por telefone no dia seguinte.",
    ],
    expected: [
      "O stepper mostra a etapa atual e quantas faltam até converter.",
      "A timeline traz importação, ligação e mudanças de etapa na mesma ordem cronológica.",
      "Os campos vazios dizem “Não informado” e são editáveis a partir dali.",
      "Converter aparece indisponível com o motivo da etapa — “realize a avaliação” —, não com um “não é possível”.",
    ],
    tags: ["detalhe"],
  },
  {
    id: "prospects.crm-lead-converted",
    title: "Depois que virou paciente",
    intent:
      "Fechar o funil sem perder o rastro — é o vínculo que responde quanto custou o paciente que entrou.",
    route: "/leads/ld-22",
    persona: "attendant",
    fixture: "leads-converted",
    rules: [
      "converting-writes-the-link-back-to-the-lead",
      "a-lost-lead-reopens-a-converted-one-does-not",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Um aviso no topo leva ao cadastro do paciente que este lead originou.",
      "Reabrir aparece indisponível, explicando que criaria duas verdades sobre a mesma criança.",
      "A origem e a campanha continuam legíveis depois da conversão.",
    ],
    tags: ["detalhe", "regra"],
  },
  {
    id: "prospects.crm-reopen-lost",
    title: "Reabrir quem foi dado como perdido",
    intent:
      "Permitir a segunda tentativa sem inventar um lead novo — e sem apagar por que a primeira falhou.",
    route: "/leads/ld-26",
    persona: "attendant",
    fixture: "leads-lost",
    rules: [
      "a-lost-lead-reopens-a-converted-one-does-not",
      "lost-requires-a-reason-or-the-funnel-teaches-nothing",
    ],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    preconditions: ["Perdido em 21/07 na qualificação, por operadora não atendida."],
    expected: [
      "O motivo da perda aparece junto da etapa de onde o lead saiu.",
      "Reabrir está disponível e diz que o lead volta para “Em contato”.",
      "A perda anterior continua no histórico depois da reabertura.",
    ],
    tags: ["exceção", "regra"],
  },

  /* ============================================================== criação */
  {
    id: "prospects.crm-new-lead-minimal",
    title: "Registrar quem acabou de ligar",
    intent:
      "Reduzir o registro a quinze segundos — porque o formulário completo é o motivo de a recepção anotar no papel.",
    route: "/leads/new",
    persona: "attendant",
    fixture: "leads-funnel",
    rules: ["a-lead-costs-a-name-and-one-way-to-reach-back"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Os campos além do mínimo ficam numa seção expansível, e o botão de criar não depende de abri-la.",
    },
    status: "proposed",
    expected: [
      "Só nome e um meio de contato são obrigatórios.",
      "Criar fica indisponível enquanto faltar telefone e e-mail, dizendo que sem os dois o lead não é contatável.",
      "Os dados da criança, operadora e disponibilidade estão presentes, mas opcionais.",
    ],
    tags: ["formulário", "regra"],
  },
  {
    id: "prospects.crm-duplicate-lead",
    title: "Esse telefone já está no funil",
    intent:
      "Avisar antes de criar o segundo registro da mesma família, enquanto ainda dá para abrir o primeiro.",
    route: "/leads/new",
    persona: "attendant",
    fixture: "leads-duplicate-lead",
    rules: ["dedupe-checks-patients-not-only-leads"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: ["O aviso de duplicidade, assim que o telefone completo é digitado."],
    },
    status: "proposed",
    expected: [
      "O aviso aparece junto do campo, nomeando o lead existente e por qual dado bateu.",
      "Há um caminho direto para abrir o lead encontrado.",
      "Criar mesmo assim continua possível — duplicidade é aviso, não bloqueio.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "prospects.crm-duplicate-patient",
    title: "Não é lead novo: já é paciente",
    intent:
      "Impedir que o comercial ligue apresentando a clínica para uma família que frequenta a clínica.",
    route: "/leads/new",
    persona: "attendant",
    fixture: "leads-duplicate-patient",
    rules: ["dedupe-checks-patients-not-only-leads"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      announces: ["O aviso de que o contato pertence a um paciente, e não a outro lead."],
    },
    status: "proposed",
    preconditions: [
      "O telefone digitado pertence ao responsável de um paciente ativo.",
    ],
    expected: [
      "O aviso diz que o contato é de um paciente, não de outro lead.",
      "O caminho oferecido leva ao cadastro do paciente, não a um lead.",
      "A tela sugere tratar como pedido de segunda especialidade, não como captação.",
    ],
    tags: ["exceção", "regra"],
  },

  /* ============================================================ importação */
  {
    id: "prospects.crm-import-mapping",
    title: "De/para das colunas da operadora",
    intent:
      "Fazer o mapeamento uma vez por operadora, e não uma vez por planilha — que é o trabalho que a importação deveria eliminar.",
    route: "/leads/import",
    persona: "attendant",
    fixture: "leads-import",
    rules: ["the-column-mapping-is-made-once-per-operator"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "Cada seletor de coluna tem rótulo com o nome da coluna e uma amostra do conteúdo.",
    },
    status: "proposed",
    preconditions: ["Planilha da Unimed com seis colunas e seis linhas."],
    expected: [
      "As colunas vêm pré-mapeadas por sugestão, e a sugestão é identificada como tal.",
      "Templates salvos aparecem como atalho e reaplicam o mapeamento inteiro.",
      "Colunas não mapeadas são explicitamente ignoradas, não silenciosamente perdidas.",
    ],
    tags: ["formulário", "regra"],
  },
  {
    id: "prospects.crm-import-invalid-mapping",
    title: "Mapeamento que não fecha",
    intent:
      "Explicar o que exatamente impede a importação, em vez de desabilitar o botão e deixar a pessoa procurar.",
    route: "/leads/import",
    persona: "attendant",
    fixture: "leads-import-invalid-mapping",
    rules: ["the-column-mapping-is-made-once-per-operator"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    preconditions: [
      "Telefone não mapeado, e duas colunas apontando para o nome do responsável.",
    ],
    expected: [
      "Os dois problemas aparecem nomeados, com o campo em questão.",
      "Avançar fica indisponível, com os problemas como motivo associado ao botão.",
      "As colunas com conflito ficam marcadas na própria linha.",
    ],
    tags: ["exceção", "regra"],
  },
  {
    id: "prospects.crm-import-review",
    title: "Revisar linha a linha antes de importar",
    intent:
      "Impedir que uma linha ruim invalide a planilha inteira, e que uma linha duplicada crie a segunda cópia de uma família.",
    route: "/leads/import",
    persona: "attendant",
    fixture: "leads-import",
    rules: ["the-import-decides-row-by-row", "dedupe-checks-patients-not-only-leads"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A tabela tem cabeçalho de linha e coluna, e o estado de cada linha é texto na célula, não só cor de fundo.",
    },
    status: "proposed",
    preconditions: [
      "Seis linhas: três válidas, duas duplicadas — uma contra lead, outra contra paciente — e uma sem nome com telefone impossível.",
    ],
    expected: [
      "Os contadores no topo separam válidos, duplicados e com erro.",
      "Cada duplicado nomeia contra quem bateu, e se é lead ou paciente.",
      "Linha com erro só oferece ignorar; duplicada oferece atualizar, criar mesmo assim ou ignorar.",
      "O botão de importar diz quantos leads vão entrar de fato.",
    ],
    tags: ["tabela", "regra"],
  },
  {
    id: "prospects.crm-import-history",
    title: "O que cada lote trouxe",
    intent:
      "Deixar rastreável de qual planilha veio cada lead — sem isso, ninguém confia no número de origem.",
    route: "/leads/import",
    persona: "clinic_admin",
    fixture: "leads-import",
    rules: ["the-import-decides-row-by-row"],
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "Cada lote mostra arquivo, quem importou, quando, e as quatro contagens.",
      "Há um caminho para ver só os leads de um lote.",
      "As tarefas de primeiro contato criadas pelo lote são contadas junto.",
    ],
    tags: ["lista"],
  },

  /* =========================================================== integrações */
  {
    id: "prospects.crm-integrations",
    title: "Os quatro canais de captação",
    intent:
      "Mostrar num lugar só se os leads estão entrando — e por qual porta eles param de entrar.",
    route: "/leads/integrations",
    persona: "clinic_admin",
    fixture: "leads-integrations",
    rules: ["an-active-integration-that-went-quiet-is-a-broken-integration"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "O estado de cada integração é texto no cartão, não um ponto colorido.",
    },
    status: "proposed",
    preconditions: [
      "Formulário do site e Google Ads recebendo; Meta aguardando revisão do app; planilha do Drive sem leitura desde ontem.",
    ],
    expected: [
      "A planilha muda desde ontem aparece como erro, não como ativa.",
      "A Meta aparece como “em revisão”, distinta de desconectada.",
      "Cada cartão diz o que a clínica precisa fazer, não só em que estado está.",
      "O endpoint público e o token do formulário do site são copiáveis.",
    ],
    tags: ["lista", "regra"],
  },

  /* ============================================================= métricas */
  {
    id: "prospects.crm-dashboard",
    title: "Onde o funil vaza e o que o anúncio traz",
    intent:
      "Responder as duas perguntas que justificam o CRM: onde as pessoas param, e qual canal entrega paciente.",
    route: "/leads/dashboard",
    persona: "clinic_admin",
    fixture: "leads-funnel",
    rules: [
      "the-funnel-counts-who-reached-the-step-not-who-is-parked-there",
      "lost-requires-a-reason-or-the-funnel-teaches-nothing",
    ],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "Cada barra tem o número por extenso ao lado. O gráfico é uma tabela de valores antes de ser um desenho.",
    },
    status: "proposed",
    preconditions: ["Vinte e seis leads, dois convertidos e três perdidos por motivos diferentes."],
    expected: [
      "O funil mostra quantos alcançaram cada etapa, e a conversão em relação à etapa anterior.",
      "A distinção entre alcançado e parado está explícita, não implícita no desenho.",
      "Os motivos de perda aparecem ordenados por frequência, com a participação de cada um.",
      "A leitura por origem mostra quantos entraram, quantos converteram e a taxa.",
    ],
    tags: ["métrica", "regra"],
  },
  {
    id: "prospects.crm-dashboard-empty",
    title: "Painel sem dados no período",
    intent: "Evitar que um filtro vazio pareça um funil que despencou.",
    route: "/leads/dashboard",
    persona: "clinic_admin",
    fixture: "leads-empty",
    a11y: { keyboard: "full", contrast: "AA" },
    status: "proposed",
    expected: [
      "A tela diz que não há leads no recorte, em vez de mostrar zeros e barras vazias.",
      "Os filtros continuam alcançáveis para desfazer o recorte.",
    ],
    tags: ["vazio"],
  },

  /* ============================================================== tarefas */
  {
    id: "prospects.crm-tasks",
    title: "As tarefas de hoje",
    intent:
      "Dar ao comercial uma fila em vez de um quadro — a pergunta da manhã é “quem eu ligo agora”, não “como está o funil”.",
    route: "/leads/tasks",
    persona: "attendant",
    fixture: "leads-tasks",
    rules: ["every-active-lead-owes-a-next-action"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes: "Os três grupos são regiões com heading. Concluir é um controle por tarefa, alcançável por teclado.",
    },
    status: "proposed",
    expected: [
      "As tarefas aparecem em três grupos: atrasadas, de hoje e próximas, nessa ordem.",
      "Cada tarefa mostra o lead ao lado, com a etapa em que ele está.",
      "As atrasadas dizem há quantos dias venceram.",
      "Concluir uma tarefa oferece registrar o que aconteceu, e não só some com a linha.",
    ],
    tags: ["lista", "regra"],
  },

  /* ================================================================ lista */
  {
    id: "prospects.crm-list",
    title: "A lista, para trabalhar em lote",
    intent:
      "Cobrir o que o quadro não cobre: ordenar por qualquer coluna e agir sobre dezenas de leads de uma vez.",
    route: "/leads/list",
    persona: "attendant",
    fixture: "leads-funnel",
    rules: ["every-active-lead-owes-a-next-action"],
    a11y: {
      keyboard: "full",
      contrast: "AA",
      notes:
        "A tabela tem cabeçalho associado, e cada caixa de seleção tem nome acessível com o contato que ela seleciona.",
    },
    status: "proposed",
    expected: [
      "As colunas incluem origem, operadora, dono, próxima ação e tempo na etapa.",
      "A seleção múltipla habilita atribuir dono, mudar etapa e marcar perdido em lote.",
      "Marcar perdido em lote também exige motivo — um por vez ou um para todos.",
      "Os filtros são os mesmos do quadro, e sobrevivem à troca de visão.",
    ],
    tags: ["tabela"],
  },
];
