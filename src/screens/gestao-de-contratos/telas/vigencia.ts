import type { Feature } from "../../../app/features.js";
import { ContratosVigencia } from "../../ContratosVigencia.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.lazy-tabs", "core.table", "core.drawer-modal", "core.input", "core.form-grid", "core.file-uploader", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

/** Os Vigentes da fixture base, para o controle "Contrato". Valor desconhecido = sem filtro. */
const VIGENTES = ["CT-2026-001", "CT-2026-002", "CT-2026-003", "CT-2026-004", "CT-2026-005", "CT-2025-018", "CT-2025-040"];

export const aditivosVigencia: Feature = {
  routes: [
    {
      path: ROTAS.vigencia,
      screen: ContratosVigencia,
      name: "Vigência & Aditivos",
      group: FLOW,
      description: "Radar de vencimentos, reajustes pela data-base e o livro de termos aditivos, só dos contratos Vigentes.",
      components: COMPONENTS,
      controls: [
        {
          id: "abertura",
          title: "Abertura",
          note: "A Ficha do Contrato abre esta tela com o contrato filtrado; a Torre de Controle abre o Radar na faixa Regular.",
          controls: [
            { id: "aba", label: "Aba", default: "radar", options: [{ value: "radar", label: "Radar" }, { value: "reajustes", label: "Reajustes" }, { value: "aditivos", label: "Aditivos" }] },
            { id: "contrato", label: "Contrato", default: "todos", options: [{ value: "todos", label: "Todos os Vigentes" }, ...VIGENTES.map((id) => ({ value: id, label: id }))] },
            { id: "faixa", label: "Filtro do Radar", default: "todas", options: [{ value: "todas", label: "Nenhum" }, { value: "critico", label: "Crítico" }, { value: "alerta", label: "Atenção" }, { value: "regular", label: "Regular" }, { value: "experiencia", label: "CLT em experiência" }] },
            { id: "modal", label: "Modal", default: "nenhum", options: [{ value: "nenhum", label: "Nenhum" }, { value: "aplicar-reajuste", label: "Aplicar reajuste" }, { value: "aditivo", label: "Novo aditivo" }] },
          ],
        },
        papelControl("financeiro"),
      ],
      expected: [
        "Três abas: Radar (Vigentes pelo fim mais próximo), Reajustes (data-base, janela, índice e sugestão) e Aditivos (livro).",
        "Com um contrato na abertura, etiqueta \"Contrato: CT-…\" removível e as três abas filtradas.",
        "Aplicar reajuste é do Financeiro; Novo aditivo, do Jurídico e do operador; a Diretoria só lê.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.vigencia-radar",
      title: "Radar de vigência",
      route: ROTAS.vigencia,
      controls: { aba: "radar", papel: "financeiro" },
      intent: "Ver quais contratos Vigentes terminam primeiro e o que já venceu.",
      expected: [
        "Aba Radar com os 7 Vigentes pelo fim mais próximo: CT-2025-018 (25/07/2026, Vencido), CT-2026-001 (17/08/2026, Crítico, 18 dias), CT-2026-005 (29/08/2026, Crítico, 30 dias), CT-2026-003 (20/10/2026, Atenção, 82 dias), CT-2025-040, CT-2026-002 e CT-2026-004 (Regular).",
        "Selects de faixa e experiência com contagem: Crítico 3 (inclui o vencido), Atenção 1, Regular 3, CLT em experiência 1 (CT-2026-005, Camila Rocha Duarte, experiência até 29/08/2026).",
        "Clicar na linha ou no ícone abre a ficha. Exportar planilha com os filtros aplicados.",
      ],
    }),
    c({
      id: "contratos.vigencia-reajustes",
      title: "Reajustes",
      route: ROTAS.vigencia,
      controls: { aba: "reajustes", papel: "financeiro" },
      intent: "O Financeiro vê as data-bases que se aproximam e quanto cada contrato deve subir.",
      expected: [
        "Lista dos 7 Vigentes pela próxima data-base: CT-2025-018 (26/07/2026, há 4 dias), CT-2026-001 (18/08/2026), CT-2026-002 (01/09/2026), CT-2026-003 (21/10/2026) com janela Aberta (data-base a até 90 dias ou já passada); CT-2025-040, CT-2026-004 e CT-2026-005 com \"Abre em …\".",
        "Taxas: IPCA 4,23%, IGP-M 3,87%, CCT 5,50%. CT-2026-003 mostra o último reajuste 21/10/2025 · 4,10%.",
        "Valor atual e novo valor sugerido mascarados (R$ ••••••••); revelados, CT-2026-003 vai de R$ 14.200,00 para R$ 14.749,54.",
        "Selects Janela (Janela Aberta 4) e Índice (IPCA 4, IGP-M 2, CCT 1). Índice sem taxa cadastrada aparece em vermelho \"índice desconhecido\" e sem sugestão (nenhum na fixture base).",
        "Aplicar reajuste só nas linhas com janela aberta e para o Financeiro (CT-2026-001, CT-2026-002, CT-2026-003); CT-2025-018, vencido, mostra \"Vencido: prorrogue antes\" no lugar do botão. Para outros papéis, aviso de visão de leitura.",
      ],
    }),
    c({
      id: "contratos.vigencia-aplicar-reajuste",
      title: "Aplicar reajuste",
      route: ROTAS.vigencia,
      controls: { aba: "reajustes", contrato: "CT-2026-003", modal: "aplicar-reajuste", papel: "financeiro" },
      intent: "Aplicar o reajuste IGP-M da locação CT-2026-003 (Imobiliária Horizonte), com a janela aberta.",
      expected: [
        "Etiqueta \"Contrato: CT-2026-003\" e drawer \"Aplicar reajuste · CT-2026-003\": valor atual R$ 14.200,00, taxa IGP-M 3,87%, valor calculado R$ 14.749,54, data-base 21/10/2026 e próxima 21/10/2027.",
        "Campo Novo valor pré-preenchido com 14.749,54 e Justificativa opcional.",
        "Mudar o valor (ex.: 14.700,00) mostra o aviso \"Ajuste manual\" e torna a justificativa obrigatória; sem ela, erro no campo.",
        "Aplicar fecha o drawer, atualiza valor, último reajuste (30/07/2026 · 3,87%, com selo Ajuste manual quando for o caso) e data-base (21/10/2027), e mostra o toast.",
        "Contrato vencido não oferece o reajuste: o drawer, se aberto nele, recusa com o motivo e o caminho (prorrogar por aditivo antes).",
      ],
    }),
    c({
      id: "contratos.vigencia-aditivos",
      title: "Livro de aditivos",
      route: ROTAS.vigencia,
      controls: { aba: "aditivos", papel: "juridico" },
      intent: "O Jurídico consulta os aditivos da carteira e filtra por tipo.",
      expected: [
        "Livro com 4 aditivos, mais recente primeiro: AD-003-02 (Prorrogação, até 20/10/2029, Em Aprovação, Aguardando aprovação com cadeado), AD-004-01 (Alteração de tabela), AD-001-01 (Inclusão de unidade), AD-003-01 (Reajuste).",
        "Novo valor mascarado; aprovação e assinatura com as cores do módulo.",
        "Busca à esquerda e select Tipo viram etiquetas removíveis; Exportar planilha.",
        "Botão Novo aditivo para o Jurídico e o operador; some para Financeiro e Diretoria.",
      ],
    }),
    c({
      id: "contratos.aditivo-novo",
      title: "Novo aditivo",
      route: ROTAS.vigencia,
      controls: { aba: "aditivos", modal: "aditivo", papel: "juridico" },
      intent: "Registrar um termo aditivo escolhendo o contrato entre os Vigentes.",
      expected: [
        "Drawer \"Novo Termo Aditivo\" com Contrato (só os 7 Vigentes), tipo, data, nova vigência, novo valor, motivo, impacto e anexo opcional.",
        "Salvar sem os obrigatórios mostra o erro em cada campo; nova vigência antes do término atual é recusada com a data atual.",
        "Salvar fecha o drawer, põe o aditivo no topo do livro (Em Elaboração, Aguardando aprovação) e mostra o toast.",
        "Vindo da ficha (controle Contrato), o contrato já vem fixo no formulário.",
      ],
    }),
  ],
};
