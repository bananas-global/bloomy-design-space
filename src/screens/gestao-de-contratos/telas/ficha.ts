import type { Feature } from "../../../app/features.js";
import { ABAS, ContratosFicha } from "../../ContratosFicha.js";
import { ROTAS, fichaDe, papelControl, ORIGENS } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = [
  "core.tabs", "core.drawer-modal", "core.modal", "core.input", "core.radio-group", "core.radio-cards", "core.file-uploader",
  "core.table", "core.timeline-list", "core.empty-state-card", "core.toast-wrapper",
];
const c = cenario(COMPONENTS);

const MODAL_OPCOES = [
  { value: "nenhum", label: "Nenhum" },
  { value: "aprovar", label: "Aprovar" },
  { value: "reprovar", label: "Reprovar" },
  { value: "despachar", label: "Despachar" },
  { value: "bloqueio", label: "Bloqueio de Governança" },
  { value: "concluir", label: "Concluir assinatura" },
  { value: "revisao", label: "Revisão formal" },
  { value: "encerrar", label: "Encerrar" },
  { value: "aditivo", label: "+ Aditivo" },
  { value: "clausula", label: "Cláusula (adicionar)" },
];

export const ficha: Feature = {
  routes: [
    {
      path: ROTAS.ficha,
      params: { id: "CT-2026-001" },
      screen: ContratosFicha,
      name: "Ficha do Contrato",
      group: FLOW,
      description: "Hub de ações do contrato: dados, conteúdo por modalidade, dossiê, versões, aditivos, linha do tempo e o painel de workflows com só a próxima ação.",
      components: COMPONENTS,
      controls: [
        {
          id: "ficha",
          title: "Estado de abertura",
          note: "O drawer (ou a confirmação) só abre se a ação vale para o estado do contrato e o papel; senão a ficha abre sem nada aberto.",
          controls: [
            { id: "modal", label: "Modal", default: "nenhum", options: MODAL_OPCOES },
            { id: "aba", label: "Aba", default: "resumo", options: ABAS.map((a) => ({ value: a.id, label: a.label })) },
            { id: "origem", label: "Aberta a partir de", default: "carteira", description: "Tela de onde a ficha foi aberta: o breadcrumb volta para ela.", options: ORIGENS },
          ],
        },
        papelControl("operador"),
      ],
      expected: [
        "Sem a navegação do módulo: o breadcrumb volta à tela de origem (Carteira, Cobrança & ERP, Dossiê, Vigência…). Cabeçalho com código, versão, status, modalidade, categoria, fluxo e Liminar (quando houver); menu ⋯ com Exportar PDF em qualquer fase.",
        "Abas Resumo · Conteúdo · Dossiê · Versões & Aditivos · Linha do Tempo.",
        "Painel de workflows mostra só a próxima ação; Assinatura com cadeado até a aprovação.",
        "Cada ação atualiza a ficha, entra na Linha do Tempo e mostra toast.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.ficha-elaboracao",
      title: "Em Elaboração",
      route: fichaDe("CT-2026-006"),
      intent: "Gestor abre o contrato recém-criado da minuta para revisar as cláusulas e submeter.",
      expected: [
        "Cabeçalho CT-2026-006 v1.0, selos Em Elaboração, Adesão, PJ Assistencial e Despesa; parte Rafael Nunes Teixeira.",
        "Painel: Aprovação Em Elaboração com Submeter para aprovação e Revisão formal; Assinatura \"Aguardando aprovação\" com cadeado.",
        "Aba Conteúdo: 10 cláusulas da MIN-PJA v2.1 com adicionar, editar e excluir; editar dá o selo \"Editada\".",
        "Submeter muda o status para Em Aprovação, adiciona \"Submetido para aprovação\" à Linha do Tempo e mostra toast.",
        "Dossiê com 2 pendentes (CND Federal, Registro no CRFa).",
      ],
    }),
    c({
      id: "contratos.ficha-em-aprovacao",
      title: "Em Aprovação (visão do solicitante)",
      route: fichaDe("CT-2026-007"),
      controls: { papel: "solicitante" },
      intent: "Solicitante acompanha o contrato que submeteu e vê que depende do aprovador.",
      expected: [
        "Selo Em Aprovação (âmbar); parte Instituto Raízes de Educação Ltda.",
        "Painel: \"Aguardando aprovação de Diretoria / Jurídico\", submetido por Marina Alves em 24/07/2026 às 17:45; sem botões de aprovar.",
        "Assinatura com cadeado; o solicitante não vê Despachar.",
        "Aba Conteúdo: cláusulas sem editar, com aviso de texto congelado para aprovação.",
      ],
    }),
    c({
      id: "contratos.ficha-aprovar",
      title: "Aprovar com parecer",
      route: fichaDe("CT-2026-007"),
      controls: { papel: "aprovador", modal: "aprovar" },
      intent: "Aprovador registra a aprovação com nome e parecer.",
      expected: [
        "Drawer \"Aprovar CT-2026-007 v1.0\" com Aprovador e Parecer, ambos obrigatórios (erro por campo ao salvar vazio).",
        "Aprovar: status Pronto para Coleta, Aprovação Aprovado com aprovador, data 30/07/2026 e parecer; Assinatura destravada.",
        "Evento \"Aprovado com parecer\" no topo da Linha do Tempo e toast.",
        "No painel, o aprovador vê Aprovar e Reprovar lado a lado.",
      ],
    }),
    c({
      id: "contratos.ficha-reprovado",
      title: "Reprovado",
      route: fichaDe("CT-2026-008"),
      controls: { papel: "solicitante" },
      intent: "Solicitante vê por que o contrato voltou e ressubmete depois do ajuste.",
      expected: [
        "Selo Reprovado (vermelho); Corporativo, Serviços; parte Limpa Bem Serviços Gerais Ltda.",
        "Painel: aviso \"Reprovado por Carlos Menezes (Diretoria) em 23/07/2026\" com o motivo da multa rescisória e o que fazer; Ressubmeter e Revisão formal.",
        "Aba Conteúdo: o arquivo proposta-limpa-bem-2026.pdf (Corporativo).",
        "Ressubmeter volta para Em Aprovação, com evento e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-pronto-coleta",
      title: "Pronto para Coleta",
      route: fichaDe("CT-2026-009"),
      controls: { papel: "operador" },
      intent: "Operador despacha o contrato aprovado para a plataforma de assinatura.",
      expected: [
        "Selo Pronto para Coleta; parte Amparo Saúde Cooperativa.",
        "Painel: Aprovado por Carlos Menezes (Diretoria) em 28/07/2026 com o parecer; Assinatura com Despachar para assinatura.",
        "Despachar abre o drawer com Clicksign (Padrão), DocuSign, Gov.br e ICP-Brasil e o identificador do envelope obrigatório.",
        "Salvar muda para Em Assinatura, registra plataforma e envelope, evento e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-bloqueio",
      title: "Bloqueio de Governança",
      route: fichaDe("CT-2026-007"),
      controls: { papel: "operador", modal: "bloqueio" },
      intent: "Operador tenta despachar um contrato que ainda está Em Aprovação.",
      expected: [
        "Drawer \"Bloqueio de Governança\": CT-2026-007 não pode ir para assinatura.",
        "Motivo: aprovação Em Aprovação; nenhum contrato vai para assinatura sem aprovação com parecer.",
        "O que fazer: aguardar o parecer do aprovador; o Despachar é liberado no painel quando aprovado.",
        "Atrás, o painel mostra Assinatura \"Aguardando aprovação\" com cadeado e o botão Despachar com cadeado.",
      ],
    }),
    c({
      id: "contratos.ficha-em-assinatura",
      title: "Em Assinatura (liminar)",
      route: fichaDe("CT-2026-010"),
      intent: "Operador acompanha o envelope e registra a conclusão da assinatura.",
      expected: [
        "Selos Em Assinatura, Específico, Particular, Receita e Liminar (vermelho), com processo 0001234-56.2026.8.16.0001 · 3ª Vara Cível de Curitiba.",
        "Painel: Clicksign, envelope CS-A7B3-5521, despachado em 24/07/2026, e Concluir assinatura.",
        "Concluir pede confirmação; confirmado, o contrato fica Vigente e Assinado, com evento e toast.",
        "Aba Conteúdo destaca Carga horária determinada (20h semanais) e Prazo da decisão (180 dias) e o termo da liminar.",
      ],
    }),
    c({
      id: "contratos.ficha-vigente",
      title: "Vigente (Adesão)",
      route: fichaDe("CT-2026-001"),
      intent: "Ver o contrato em execução e chegar às cobranças, à vigência e aos aditivos.",
      expected: [
        "CT-2026-001 v1.1, Vigente, Adesão, PJ Assistencial; parte Clínica Integrar Terapias Ltda.",
        "Ações à vista: + Aditivo e Encerrar (tint vermelho). No menu ⋯: Exportar PDF, Ver cobranças e Ver vigência e reajustes (abrem filtradas por CT-2026-001). O painel de workflows fica fixo ao rolar.",
        "Resumo: valor R$ •••••••• com olho; término 17/08/2026, 18 dias (Crítico); IPCA, data-base 18/08/2026.",
        "Conteúdo: cláusulas travadas com o aviso \"só podem ser alteradas por Termo Aditivo\"; a Cláusula 4ª tem o selo Editada.",
        "Dossiê 100% Conforme; Versões v1.0 e v1.1; aditivo AD-001-01; painel com Clicksign CS-8F2A-1190.",
      ],
    }),
    c({
      id: "contratos.ficha-corporativo",
      title: "Corporativo",
      route: fichaDe("CT-2026-002"),
      controls: { aba: "conteudo" },
      intent: "Ver o documento negociado de um contrato Corporativo.",
      expected: [
        "Aba Conteúdo com o arquivo contrato-nuvem-clinica-negociado.pdf (1,8 MB) e Visualizar; sem cláusulas.",
        "Selos Vigente, Corporativo, Tecnologia; painel com DocuSign DS-55C1-7720.",
        "Dossiê: 1 pendente (Relatório SOC 2).",
      ],
    }),
    c({
      id: "contratos.ficha-revisao",
      title: "Revisão formal",
      route: fichaDe("CT-2026-006"),
      controls: { modal: "revisao" },
      intent: "Registrar uma revisão formal com número calculado.",
      expected: [
        "Drawer com Minor/Major e a prévia \"v1.0 → v1.1\" (Major mostra v2.0); o número não é editável.",
        "Fase, motivo, resumo e revisor obrigatórios, com erro por campo.",
        "Registrar muda o cabeçalho para v1.1, acrescenta a linha em Versões, evento na Linha do Tempo e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-linha-do-tempo",
      title: "Linha do Tempo Forense",
      route: fichaDe("CT-2026-001"),
      controls: { aba: "linha-do-tempo" },
      intent: "Auditar tudo o que aconteceu com o contrato.",
      expected: [
        "9 eventos do mais recente ao mais antigo: Título 88412 criado no Omie (09/07/2026) no topo, Contrato criado a partir da MIN-PJA v2.0 (20/07/2025) no fim.",
        "Cada evento com selo de cor e ícone por tipo (Criação, Workflow, Versão, Dossiê, Cobrança, ERP), data e hora, detalhe e autor.",
        "Pílulas por tipo filtram a linha; Todos 9 volta.",
      ],
    }),
    c({
      id: "contratos.ficha-encerrar",
      title: "Encerrar contrato",
      route: fichaDe("CT-2026-003"),
      controls: { papel: "diretoria", modal: "encerrar" },
      intent: "Diretoria encerra a locação com distrato.",
      expected: [
        "Drawer \"Encerrar CT-2026-003\" com data de hoje (30/07/2026, não editável), tipo (Término de vigência, Distrato amigável, Rescisão unilateral, Encerramento judicial), motivo e distrato anexo, todos obrigatórios.",
        "Atrás: Específico Locação com destaque para IPTU R$ 780,00 / mês, Condomínio Não se aplica e Garantia Seguro-fiança.",
        "Encerrar muda o status para Encerrado, mostra o aviso no topo, some + Aditivo e Encerrar, evento e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-encerrado",
      title: "Encerrado",
      route: fichaDe("CT-2025-031"),
      intent: "Consultar um contrato encerrado.",
      expected: [
        "Aviso no topo: encerrado em 15/01/2026 · Distrato amigável, motivo \"Fornecedor deixou de atender a região.\" e link distrato-grafica-pontual.pdf.",
        "Selo Encerrado; sem + Aditivo e sem Encerrar; no menu ⋯ continuam Exportar PDF e Ver cobranças.",
        "Cláusulas travadas; Linha do Tempo com o evento de encerramento no topo.",
      ],
    }),
    c({
      id: "contratos.ficha-nao-encontrado",
      title: "Contrato não encontrado",
      route: fichaDe("CT-9999"),
      intent: "Abrir um link de contrato que não existe.",
      expected: [
        "Estado vazio \"Contrato não encontrado\" citando CT-9999, com Voltar à carteira.",
      ],
    }),
  ],
};
