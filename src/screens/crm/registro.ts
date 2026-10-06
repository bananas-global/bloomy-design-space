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
        "Cartões: Responsáveis, Contato e follow-up, Criança e plano de saúde, Carga horária e disponibilidade, Laudos, Unidade e endereço e Agendamento da visita. Contatos à direita.",
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
        "Pré-anamnese: CIDs, nível de suporte, terapia anterior, comportamentos, comunicação, mobilidade, perfil sensorial e reforçadores.",
        "À direita, a visita agendada (com as remarcações) e o contexto do comercial, só leitura.",
        "Enviar para autorização libera com visita realizada, relatório, pré-anamnese e família decidida, e leva o negócio para Validação Técnica.",
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
        "Efetivar Paciente segue no drawer, com resumo do lead, nascimento, operadora e unidade.",
      ],
      components: CRM_COMPONENTS,
    },
  ],
};
