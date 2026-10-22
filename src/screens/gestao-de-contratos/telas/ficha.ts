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
  { value: "pdf", label: "PDF do contrato" },
];

export const ficha: Feature = {
  routes: [
    {
      path: ROTAS.ficha,
      params: { id: "CTR-2026-0001" },
      screen: ContratosFicha,
      name: "Ficha do Contrato",
      group: FLOW,
      description: "Hub de ações do contrato: ficha consolidada, conteúdo por modalidade, dossiê, versões com o texto de cada uma, aditivos, histórico de workflow, Linha do Tempo Forense, auditoria e o painel de workflows com só a próxima ação.",
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
        papelControl("administrador"),
      ],
      expected: [
        "Sem a navegação do módulo: o breadcrumb volta à tela de origem (Carteira, Cobrança & ERP, Dossiê, Vigência…). Cabeçalho com código CTR-AAAA-NNNN, versão, status, modalidade, categoria, fluxo e Liminar (quando houver); menu ⋯ com Exportar PDF (pré-visualização A4) em qualquer fase, Ver cobranças e Ver vigência e aditivos, abertos filtrados pelo contrato (FR-049).",
        "Abas Resumo · Conteúdo · Dossiê · Versões & Aditivos · Histórico de workflow · Linha do Tempo · Auditoria.",
        "Painel de workflows mostra só a próxima ação (FR-036); Assinatura com cadeado (Aguardando Aprovação Prévia) até a aprovação.",
        "Cada ação grava, no mesmo momento, o histórico de workflow com o papel (RN-071) e a auditoria (RN-066), e mostra toast. Ação fora do estado válido é recusada com toast de erro e nada muda.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.ficha-elaboracao",
      title: "Em Elaboração",
      route: fichaDe("CTR-2026-0006"),
      intent: "Gestor abre o contrato recém-criado da minuta para revisar as cláusulas e submeter.",
      expected: [
        "Cabeçalho CTR-2026-0006 v1.0, selos Em Elaboração, Adesão, PJ Assistencial e Despesa; parte Rafael Nunes Teixeira.",
        "Painel: Aprovação Em Elaboração com Submeter para aprovação e Revisão formal; Assinatura \"Aguardando Aprovação Prévia\" com cadeado.",
        "Aba Conteúdo: 10 cláusulas da minuta com adicionar, editar e excluir. Editar dá o selo \"Editada\" (a minuta não muda); adicionar entra no fim, \"Editada\"; excluir pede confirmação e a auditoria guarda título e texto removidos.",
        "Submeter: status Em Aprovação, fase 3. Aprovação; \"Submetido para aprovação\" na Linha do Tempo (âmbar), linha \"Em Elaboração → Em Aprovação · Gestor da Área / Solicitante\" no Histórico de workflow e WORKFLOW_SUBMETER na Auditoria.",
        "Dossiê Pendente de Documentos: 3 itens DOS-CTR-2026-0006-01 a 03, sem arquivo.",
      ],
    }),
    c({
      id: "contratos.ficha-em-aprovacao",
      title: "Em Aprovação (visão do solicitante)",
      route: fichaDe("CTR-2026-0007"),
      controls: { papel: "solicitante" },
      intent: "Solicitante acompanha o contrato que submeteu e vê que depende do aprovador.",
      expected: [
        "Selo Em Aprovação (âmbar); parte Instituto Raízes de Educação Ltda.",
        "Painel: \"Aguardando aprovação de Diretoria / Jurídico\"; sem botões de aprovar.",
        "Assinatura com cadeado; o solicitante não vê Despachar.",
        "Aba Conteúdo: as cláusulas continuam editáveis (o contrato não está assinado nem encerrado, RN-069).",
      ],
    }),
    c({
      id: "contratos.ficha-aprovar",
      title: "Aprovar com parecer",
      route: fichaDe("CTR-2026-0007"),
      controls: { papel: "aprovador", modal: "aprovar" },
      intent: "Aprovador registra a aprovação com nome e parecer.",
      expected: [
        "Drawer \"Aprovar CTR-2026-0007 v1.0\" com Aprovador e Parecer vazios, ambos obrigatórios (erro por campo ao salvar vazio).",
        "Aprovar: Aprovação Aprovado com aprovador, data e parecer; Assinatura Pronto para Coleta; fase 4. Assinatura; cabeçalho v1.1.",
        "Versões ganha a v1.1 \"Aprovação de Governança\" com Ver texto (cópia das cláusulas); Histórico de workflow com \"Em Aprovação → Aprovado · Aprovador / Diretoria\" e \"Aguardando Aprovação Prévia → Pronto para Coleta · Sistema Automático\".",
        "Evento \"Aprovado com parecer\" (verde) no topo da Linha do Tempo, WORKFLOW_APROVAR na Auditoria e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-reprovar",
      title: "Reprovar com motivo",
      route: fichaDe("CTR-2026-0007"),
      controls: { papel: "aprovador", modal: "reprovar" },
      intent: "Aprovador devolve o contrato para ajuste.",
      expected: [
        "Drawer \"Reprovar CTR-2026-0007 v1.0\" com Aprovador e Motivo obrigatórios.",
        "Reprovar: status Reprovado (Em Ajuste), fase 1. Elaboração, assinatura Aguardando Aprovação Prévia; versão não muda.",
        "Histórico de workflow com parecer \"Reprovado por {aprovador}: {motivo}\" e papel Aprovador / Jurídico; evento vermelho na Linha do Tempo.",
      ],
    }),
    c({
      id: "contratos.ficha-reprovado",
      title: "Reprovado",
      route: fichaDe("CTR-2026-0008"),
      controls: { papel: "solicitante" },
      intent: "Solicitante vê por que o contrato voltou e ressubmete depois do ajuste.",
      expected: [
        "Selo Reprovado (vermelho); Corporativo, Serviços Terceirizados; parte Limpa Bem Serviços Gerais Ltda.",
        "Painel: aviso \"Reprovado por Carlos Menezes (Diretoria): Multa rescisória…\" e Ressubmeter e Revisão formal.",
        "Aba Conteúdo: o arquivo negociado (Corporativo) e os campos da categoria.",
        "Ressubmeter volta para Em Aprovação, com \"Reprovado (Em Ajuste) → Em Aprovação\" no histórico e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-pronto-coleta",
      title: "Pronto para Coleta",
      route: fichaDe("CTR-2026-0009"),
      controls: { papel: "operador" },
      intent: "Operador despacha o contrato aprovado para a plataforma de assinatura.",
      expected: [
        "Selo Pronto para Coleta; parte Amparo Saúde Cooperativa; v1.1.",
        "Painel: Aprovado por Carlos Menezes (Diretoria) em 28/07/2026 com o parecer; Assinatura com Despachar para assinatura.",
        "Despachar abre o drawer com Clicksign (Padrão) já marcado, DocuSign, Gov.br e ICP-Brasil e o identificador do envelope obrigatório.",
        "Salvar: status e assinatura Em Assinatura com a data de envio, \"Pronto para Coleta → Em Assinatura · Operador de Contratos / Jurídico\" no histórico, auditoria e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-bloqueio",
      title: "Bloqueio de Governança",
      route: fichaDe("CTR-2026-0007"),
      controls: { papel: "operador", modal: "bloqueio" },
      intent: "Operador tenta despachar um contrato que ainda está Em Aprovação.",
      expected: [
        "Modal com a mensagem exata \"Bloqueio de Governança: O contrato NÃO pode ser enviado para assinatura sem prévia aprovação!\"",
        "Motivo: aprovação Em Aprovação e assinatura Aguardando Aprovação Prévia; o que fazer: aguardar o parecer do aprovador.",
        "Atrás, o painel mostra Assinatura com cadeado e o botão Despachar com cadeado; nada muda no contrato.",
      ],
    }),
    c({
      id: "contratos.ficha-em-assinatura",
      title: "Em Assinatura (liminar)",
      route: fichaDe("CTR-2026-0010"),
      intent: "Operador acompanha o envelope e registra a conclusão da assinatura.",
      expected: [
        "Selos Em Assinatura, Específico, Paciente Particular, Receita e Liminar (vermelho), com o processo e a vara.",
        "Painel: Clicksign, envelope CS-A7B3-5521, despachado em 24/07/2026, e Concluir assinatura. À vista também Encerrar (Em Assinatura pode ser encerrado).",
        "Concluir pede confirmação; confirmado: Assinado Digitalmente, Vigente, fase 5. Execução Vigente, v1.2; histórico \"Em Assinatura → Assinado Digitalmente · Plataforma de assinatura\".",
        "Aba Conteúdo: os campos específicos (Carga horária determinada, Prazo da decisão) e o documento.",
      ],
    }),
    c({
      id: "contratos.ficha-vigente",
      title: "Vigente (Adesão)",
      route: fichaDe("CTR-2026-0001"),
      intent: "Ver a ficha consolidada do contrato em execução e chegar às cobranças, à vigência e aos aditivos.",
      expected: [
        "CTR-2026-0001 v1.4, Vigente, Adesão, PJ Assistencial; parte Clínica Integrar Terapias Ltda.",
        "Ações à vista: + Aditivo e Encerrar (tint vermelho). No menu ⋯: Exportar PDF, Ver cobranças e Ver vigência e aditivos (abrem filtradas por CTR-2026-0001).",
        "Resumo: gestor Coordenação de Terapias, centro de custo 101 - Clínica & Terapias, regra de remuneração, valor R$ •••••••• com olho, exige NF Sim, dados bancários, critério de glosa; término 17/08/2026, tipo de prazo, IPCA (IBGE), mês-base Agosto, aviso prévio e saneamento; Cláusula 7ª Sim com saldo de recesso 14,5 dia(s); equipamentos cedidos; campos da PJ Assistencial.",
        "Conteúdo: aviso \"Cláusulas de contrato assinado só podem ser alteradas por Termo Aditivo\"; a Cláusula 4ª tem o selo Editada.",
        "Versões v1.0 a v1.4, cada uma com Ver texto; aditivo TA-01/CTR-2026-0001 (1º Termo Aditivo); painel com Clicksign CS-8F2A-1190.",
      ],
    }),
    c({
      id: "contratos.ficha-aditivo",
      title: "Registrar Termo Aditivo",
      route: fichaDe("CTR-2026-0001"),
      controls: { modal: "aditivo", aba: "versoes" },
      intent: "Registrar um aditivo de prorrogação no contrato Vigente.",
      expected: [
        "Drawer \"Novo Termo Aditivo · TA-02/CTR-2026-0001\", \"Será registrado como 2º Termo Aditivo\".",
        "Tipo, data de celebração e justificativa obrigatórios; nova vigência antes do início é recusada; valor negativo é recusado; anexo opcional (PDF, DOC, DOCX, PNG, JPG, JPEG, XML até 25 MB).",
        "Salvar: aditivo Aprovado e Assinado na tabela; término e valor do contrato atualizados (valor só se > 0); versão v1.5; impacto padrão \"Ajuste de escopo / prazo\" ou \"Novo valor base R$ …\"; histórico \"Vigente → Vigente Repactuado · Aditamento\"; a fase continua 5. Execução Vigente.",
      ],
    }),
    c({
      id: "contratos.ficha-corporativo",
      title: "Corporativo",
      route: fichaDe("CTR-2026-0002"),
      controls: { aba: "conteudo" },
      intent: "Ver o documento negociado de um contrato Corporativo.",
      expected: [
        "Aba Conteúdo com o arquivo contrato-nuvem-clinica-negociado.pdf (1,8 MB) e Visualizar, mais os campos da TI / Software / SaaS; sem cláusulas.",
        "Selos Vigente, Corporativo, TI / Software / SaaS; painel com DocuSign DS-55C1-7720.",
        "Dossiê: 1 pendente (Relatório SOC 2).",
      ],
    }),
    c({
      id: "contratos.ficha-revisao",
      title: "Revisão formal",
      route: fichaDe("CTR-2026-0006"),
      controls: { modal: "revisao" },
      intent: "Registrar uma revisão formal com número calculado.",
      expected: [
        "Drawer com Minor (padrão) / Major e a prévia \"v1.0 → v1.1\" (Major mostra v2.0); o número não é editável.",
        "Fase, motivo, resumo e revisor obrigatórios, com erro por campo.",
        "Registrar muda o cabeçalho para v1.1, acrescenta a linha em Versões com Ver texto (cópia das cláusulas), REVISAO_FORMAL na Auditoria, evento de versão (roxo) na Linha do Tempo e toast.",
      ],
    }),
    c({
      id: "contratos.ficha-workflow",
      title: "Histórico de workflow",
      route: fichaDe("CTR-2026-0001"),
      controls: { aba: "workflow" },
      intent: "Ver cada transição de aprovação, assinatura e ciclo de vida com o papel de quem fez.",
      expected: [
        "7 transições do mais recente ao mais antigo: \"Vigente → Vigente Repactuado · Aditamento\" (TA-01) no topo e a criação \"— → Em Elaboração\" no fim.",
        "Colunas Data, Workflow, Transição (de → para), Parecer, Usuário e Papel (RN-071).",
      ],
    }),
    c({
      id: "contratos.ficha-linha-do-tempo",
      title: "Linha do Tempo Forense",
      route: fichaDe("CTR-2026-0001"),
      controls: { aba: "linha-do-tempo" },
      intent: "Ver tudo o que aconteceu com o contrato, em ordem decrescente.",
      expected: [
        "Eventos do contrato mais versões, aditivos, documentos do dossiê já anexados e cobranças/ERP: \"Omie ERP Sincronizado: Título #88412\" (09/07/2026) perto do topo e a criação a partir da MIN-PJA v2.0 (20/07/2025) no fim.",
        "Cores por tipo (RN-067): workflow aprovado/assinado verde e demais âmbar, criação azul, versão roxo, aditivo laranja (o `tag` não tem rosa), dossiê ciano, cobrança âmbar, ERP verde, distrato vermelho.",
        "Pílulas por tipo filtram a linha; Todos volta.",
      ],
    }),
    c({
      id: "contratos.ficha-auditoria",
      title: "Trilha de auditoria",
      route: fichaDe("CTR-2026-0001"),
      controls: { aba: "auditoria" },
      intent: "Auditar as gravações deste contrato, separadas da Linha do Tempo.",
      expected: [
        "8 registros só de CTR-2026-0001, do mais recente ao mais antigo, com usuário, perfil, ação (CRIACAO_CONTRATO, REVISAO_FORMAL, WORKFLOW_*, ADITIVO_REGISTRAR, CLAUSULA_EDITAR) e detalhes.",
        "Texto: a auditoria só recebe inclusões.",
      ],
    }),
    c({
      id: "contratos.ficha-pdf",
      title: "PDF do contrato",
      route: fichaDe("CTR-2026-0001"),
      controls: { modal: "pdf" },
      intent: "Baixar o contrato em PDF pela ficha.",
      expected: [
        "Pré-visualização A4 CTR-2026-0001-v1.4.pdf com quadros I a IV, as cláusulas sem tags e a página de assinaturas com o selo digital.",
        "Gerar o PDF não altera o contrato.",
      ],
    }),
    c({
      id: "contratos.ficha-encerrar",
      title: "Encerrar contrato",
      route: fichaDe("CTR-2026-0003"),
      controls: { papel: "diretoria", modal: "encerrar" },
      intent: "Diretoria encerra a locação.",
      expected: [
        "Drawer \"Encerrar CTR-2026-0003\" com data (padrão hoje, editável), tipo (Término de vigência, Distrato amigável, Rescisão unilateral, Encerramento judicial) e motivo obrigatórios; distrato opcional.",
        "Atrás: Específico Locação com destaque para IPTU (780,00), Condomínio (0,00) e Garantia (Seguro Fiança), mais os demais campos e o arquivo.",
        "Encerrar: status Encerrado, fase 7. Encerramento, motivo \"[tipo] motivo\", versão v1.3-ENC no histórico de versões sem mudar a versão atual (v1.3), histórico \"Vigente → Encerrado · Ciclo de Vida\"; aviso no topo; somem + Aditivo e Encerrar; toast.",
      ],
    }),
    c({
      id: "contratos.ficha-encerrado",
      title: "Encerrado",
      route: fichaDe("CTR-2025-0031"),
      intent: "Consultar um contrato encerrado.",
      expected: [
        "Aviso no topo: encerrado em 15/01/2026 · Distrato amigável, motivo \"[Distrato amigável] Fornecedor deixou de atender a região.\" e link distrato-grafica-pontual.pdf.",
        "Selo Encerrado; sem + Aditivo e sem Encerrar; no menu ⋯ continuam Exportar PDF, Ver cobranças e Ver vigência e aditivos.",
        "Cláusulas travadas; Versões com v1.2-ENC; Linha do Tempo com \"Encerramento & Distrato Formal\" (vermelho).",
      ],
    }),
    c({
      id: "contratos.ficha-nao-encontrado",
      title: "Contrato não encontrado",
      route: fichaDe("CTR-9999-0000"),
      intent: "Abrir um link de contrato que não existe.",
      expected: [
        "Estado vazio \"Contrato não encontrado\" citando CTR-9999-0000, com Voltar à carteira.",
      ],
    }),
  ],
};
