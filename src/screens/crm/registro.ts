import type { Feature } from "../../app/features.js";

import { Leads } from "../Leads.js";
import { LEADS_FIXTURES } from "./fixtures.js";
import { CRM_CONTROLS, FLOW, PATH } from "./flow.js";

/** Componentes do catálogo que o CRM de Leads usa. */
const CRM_COMPONENTS = [
  "layout.backoffice", "core.card", "core.header", "core.button", "core.input", "core.label", "core.tag", "core.table", "core.meta-info",
  "core.pagination", "core.dropdown", "core.drawer-modal", "core.radio-group", "core.checkbox-group", "core.switch-card",
  "core.multi-select-search", "core.custom-select", "core.file-uploader", "core.item", "core.progress", "core.timeline-list",
  "core.breadcrumbs", "core.toast-wrapper",
];

const scenario = (s: { id: string; title: string; controls: Record<string, string>; intent: string; expected: string[]; persona?: string; fixture?: string }) => ({
  route: PATH,
  fixture: s.fixture ?? "crm.leads",
  persona: s.persona ?? "admin",
  ...s,
});

/** CRM de Leads: funil, tabela e o painel do negócio por papel. */
export const feature: Feature = {
  scenarios: [
    scenario({
      id: "crm.board",
      title: "Funil",
      controls: { view: "board", lead: "closed", convert: "closed" },
      intent: "O quadro por etapa: Novo Lead, Em Contato, Qualificação, Agendamento de Visita, Validação Técnica, Aceite, Efetivado, Desqualificados e Perdido.",
      expected: [
        "Cada coluna mostra a contagem e a carga prevista (soma das horas/semana dos leads da coluna).",
        "O card traz o responsável legal, a criança e a idade, o comercial (iniciais), o convênio, o follow-up (atrasado em vermelho, hoje em laranja) e os dias na etapa.",
        "De Validação Técnica em diante, ou se já foi solicitada, o card mostra a autorização: \"Em análise há 9 dias\", \"Autorizado em …\".",
        "Arrastar um card para outra coluna move o lead, registra \"Movido para …\" no histórico e mostra o toast \"Etapa atualizada\".",
        "Soltar em Efetivado abre o drawer de Efetivar Paciente.",
        "Lucas Tavares (plano Amil, fora da rede) caiu sozinho em Desqualificados.",
        "Os filtros (busca, comercial, origem, follow-up e suporte) valem para o funil e a tabela.",
      ],
    }),
    scenario({
      id: "crm.table",
      title: "Tabela",
      controls: { view: "table", lead: "closed", convert: "closed" },
      intent: "A lista do Phoenix, com 15 por página, a etapa como tag e o menu ⋮.",
      expected: [
        "Colunas: Criança / Idade, Responsável, Suporte, Int. unidade, Status, Atualizado em e Ações.",
        "⋮ → Editar abre o painel do negócio; Efetivar Paciente fica desabilitado em Perdido e Desqualificado.",
        "\"Mostrando 1 até 15 de 23 registros\" e a paginação.",
      ],
    }),
    scenario({
      id: "crm.deal-qualification",
      title: "Negócio em Qualificação",
      controls: { view: "board", lead: "ld17", tab: "negocio", convert: "closed" },
      intent: "A vez do Comercial: Lívia Barros em Qualificação, com quatro itens faltando para agendar a visita.",
      expected: [
        "Cabeçalho: \"Com: Comercial\", dias na etapa contra o SLA (5d) e \"faltam 4 itens\"; etapa e responsável pelo negócio à direita.",
        "Checklist do Comercial à esquerda; clicar num item rola até o cartão do campo, destaca e foca o primeiro campo vazio.",
        "Cartões: Preenchimento pela família, Responsáveis, Contato e follow-up, Criança e plano de saúde, Carga horária, Disponibilidade da família (grade de pintar direto no cartão), Agenda anterior, Laudos, Unidade e endereço e Agendamento da visita. Contatos à direita.",
        "Cada alteração salva sozinha (\"Salvando...\" → \"Salvo\").",
        "Avançar só libera com o checklist da etapa completo; o título do botão lista o que falta.",
      ],
    }),
    scenario({
      id: "crm.deal-visit",
      title: "Relatório da visita",
      controls: { view: "board", lead: "ld5", tab: "visita", convert: "closed" },
      intent: "A vez da Coordenação: Miguel Costa tem visita agendada (remarcada uma vez) e o relatório a preencher.",
      expected: [
        "Relatório em seis blocos: aconteceu, quem veio, o que foi apresentado, objeções, como a família saiu e um texto livre.",
        "Pré-anamnese: CIDs, nível de suporte, terapia anterior, comportamentos, comunicação, mobilidade, perfil sensorial e reforçadores. \"Pedir para a família\" manda só a pré-anamnese pelo WhatsApp.",
        "Proposta de grade pendente: Montar proposta ou Importar da clínica atual (a agenda anterior de Miguel tem 6 horários).",
        "À direita, a visita agendada (com as remarcações) e o contexto do comercial, só leitura.",
        "Enviar para autorização libera com visita realizada, relatório, pré-anamnese, proposta de grade e família decidida, e leva o negócio para Validação Técnica.",
      ],
    }),
    scenario({
      id: "crm.deal-family-sent",
      title: "Pedido à família enviado",
      controls: { view: "board", lead: "ld7", tab: "negocio", convert: "closed" },
      intent: "Enzo Souza: o comercial mandou o link para Marina preencher sete seções do cadastro e aguarda a resposta.",
      expected: [
        "\"Preenchimento pela família\" no topo da aba: \"Link enviado para Marina Souza\", as seções pedidas e a tag \"Aguardando resposta\".",
        "Novo pedido abre o drawer: as nove seções (Completo, Pendente ou Família já respondeu), o WhatsApp, a mensagem que acompanha as seções marcadas e a prévia da conversa.",
        "Ver formulário mostra, num celular, o que a família abre pelo link: as seções pedidas com o que já está no cadastro preenchido e dicas nas perguntas menos óbvias. É uma página pública do portal, sem o menu da clínica.",
        "Enviar respostas no formulário (ou Simular resposta da família) preenche os cards e marca cada um com \"Família\".",
      ],
    }),
    scenario({
      id: "crm.deal-family-answered",
      title: "Família respondeu",
      controls: { view: "board", lead: "ld9", tab: "negocio", convert: "closed" },
      intent: "Helena Prado: a família respondeu pelo link e as respostas já estão nos cards; falta a equipe revisar.",
      expected: [
        "Tag \"Respondida · revisar\" e o botão Marcar como revisada.",
        "\"O que Bruna respondeu\" abre o resumo por seção (responsáveis, nascimento, plano, carga, horários, agenda, laudo e endereço).",
        "Responsáveis, Criança e plano, Carga horária, Agenda anterior, Laudos e Unidade e endereço com o selo \"Família\".",
        "Agenda anterior preenchida pela família: \"Revisar agenda\" abre a grade; ao salvar, fica revisada pela equipe.",
      ],
    }),
    scenario({
      id: "crm.deal-current-week",
      title: "Agenda anterior",
      controls: { view: "board", lead: "ld5", tab: "negocio", convert: "closed" },
      intent: "Miguel Costa faz 6h por semana em outra clínica; a equipe registrou a agenda.",
      expected: [
        "O card Agenda anterior: \"6 horários por semana · 6h\", as horas por especialidade e Enviar por WhatsApp.",
        "Editar agenda abre a grade de segunda a sábado, das 07:00 às 20:00, no desenho do Padrão de Agenda: estrela na disponibilidade da família, Shift + clique para vários horários e o painel de edição ao lado.",
        "Ao salvar, \"Usar como carga horária\" troca a carga do lead pelas horas da grade; \"Usar como disponibilidade\" troca a disponibilidade da família.",
      ],
    }),
    scenario({
      id: "crm.deal-grade",
      title: "Proposta de grade aceita",
      controls: { view: "board", lead: "ld3", tab: "visita", convert: "closed" },
      intent: "Davi Lima: a coordenação montou 16h de Psicologia com Vanessa Duarte em Santana e a família aceitou pelo WhatsApp.",
      expected: [
        "\"Família aceitou\" e a lista dos horários propostos (\"Seg 08:00–12:00 · Psicologia · Vanessa Duarte\").",
        "Editar proposta abre a grade: unidade, pílulas de especialidade que mostram quantos profissionais estão livres em cada horário, Importar agenda da clínica atual e Sugerir profissionais.",
        "No painel, o profissional vem sugerido entre os livres; os indisponíveis aparecem à parte, com o motivo.",
        "Proposto × pedido por especialidade; Exportar PDF mostra o documento para a família.",
      ],
    }),
    scenario({
      id: "crm.deal-authorization",
      title: "Autorização em análise",
      controls: { view: "board", lead: "ld3", tab: "autorizacao", convert: "closed" },
      intent: "A vez do Orçamentista: Davi Lima tem a solicitação enviada ao convênio há 9 dias e aguarda o retorno.",
      expected: [
        "Carga solicitada × autorizada por especialidade, com a diferença (Integral, −Nh ou Aguardando).",
        "Resultado Autorizado integralmente preenche o autorizado com o solicitado; Negado zera e oferece Marcar como perdido (\"Plano não autorizou\").",
        "Documentos exigidos à direita, com o atalho para a aba onde falta.",
        "Concluir autorização leva o negócio para Aceite.",
      ],
    }),
    scenario({
      id: "crm.deal-accept",
      title: "Aceite: efetivar",
      controls: { view: "board", lead: "ld4", tab: "autorizacao", convert: "closed" },
      intent: "Beatriz Faria está autorizada: falta efetivar como paciente.",
      expected: ["\"Autorização concluída. Falta efetivar como paciente.\"", "Efetivar paciente fica verde no cabeçalho."],
    }),
    scenario({
      id: "crm.convert",
      title: "Efetivar Paciente",
      controls: { view: "board", lead: "closed", convert: "open" },
      intent: "O drawer de Efetivar Lead como Paciente, aberto para o primeiro lead em Aceite.",
      expected: [
        "Resumo da criança e do responsável, data de nascimento estimada pela idade, operadora e unidade.",
        "Efetivar Paciente tira o lead do funil e mostra \"<criança> efetivado(a) como paciente.\"",
      ],
    }),
    scenario({
      id: "crm.new",
      title: "Novo Lead",
      controls: { view: "board", lead: "new", tab: "negocio", convert: "closed" },
      intent: "O cadastro abre como rascunho no painel do negócio, em Novo Lead.",
      expected: [
        "\"Rascunho, salva ao fechar\" no rodapé.",
        "Fechar com o nome da criança ou do responsável cria o lead (toast \"Lead criado com sucesso!\"); sem nome, só fecha.",
        "Com plano fora da rede ou idade acima de 17 anos, o lead entra direto em Desqualificados.",
      ],
    }),
    scenario({
      id: "crm.disqualified",
      title: "Desqualificado",
      controls: { view: "board", lead: "ld8", tab: "negocio", convert: "closed" },
      intent: "Lucas Tavares tem plano Amil, fora da rede.",
      expected: ["A tag \"Plano fora da rede (Amil)\" no cabeçalho.", "Requalificar só libera depois de trocar o plano por um atendido."],
    }),
    scenario({
      id: "crm.lost",
      title: "Perdido",
      controls: { view: "board", lead: "ld6", tab: "historico", convert: "closed" },
      intent: "Laura Araújo foi perdida: a família escolheu outra clínica.",
      expected: ["A tag do motivo no cabeçalho e o registro no histórico.", "Reabrir volta o negócio para Novo Lead."],
    }),
    scenario({
      id: "crm.empty",
      title: "Sem leads",
      fixture: "crm.empty",
      controls: { view: "board", lead: "closed", convert: "closed" },
      intent: "A clínica ainda não tem leads.",
      expected: ["Todas as colunas com \"Nenhum lead\" e o \"+ Novo lead\" em Novo Lead."],
    }),
    scenario({
      id: "crm.supervisor",
      title: "Sem cadastro de lead",
      persona: "supervisor",
      controls: { view: "board", lead: "closed", convert: "closed" },
      intent: "Proposta: só admin, admin de clínica, recepção e coordenação cadastram lead.",
      expected: ["Sem Novo Lead no cabeçalho nem \"+ Novo lead\" no funil.", "O menu do Phoenix não mostra Leads para este papel; a rota é aberta direto."],
    }),
  ],
  fixtures: [...LEADS_FIXTURES],
  routes: [
    {
      path: PATH,
      screen: Leads,
      name: "Leads · CRM",
      group: FLOW,
      description: "A lista de Leads com o funil por etapa e o painel do negócio por papel (Comercial, Coordenação, Orçamentista).",
      controls: CRM_CONTROLS,
      expected: [
        "Novo: visão Funil (kanban com arrastar e soltar) ao lado da Tabela, com os mesmos filtros.",
        "Novo: filtros de responsável comercial, origem e follow-up.",
        "Novo: etapas Novo Lead, Em Contato, Qualificação, Agendamento de Visita, Validação Técnica, Aceite, Desqualificado e Perdido, cada uma com papel, SLA e checklist.",
        "Novo: painel do negócio no lugar do modal, com as abas Negócio, Visita, Autorização e Histórico, autosave e Avançar condicionado ao checklist.",
        "Novo: desqualificação automática por plano fora da rede ou idade acima de 17 anos.",
        "Novo: Preenchimento pela família — o link por WhatsApp com as seções escolhidas; as respostas entram nos cards com o selo \"Família\".",
        "Novo: Agenda anterior — a semana que a criança faz em outra clínica, registrada na grade ou pela família.",
        "Novo: Proposta de grade — a grade semanal com profissional, na estrutura do Padrão de Agenda, exigida no checklist da Coordenação; vai para a família em PDF ou WhatsApp.",
        "Efetivar Paciente segue no drawer, com resumo do lead, nascimento, operadora e unidade.",
      ],
      components: CRM_COMPONENTS,
    },
  ],
};
