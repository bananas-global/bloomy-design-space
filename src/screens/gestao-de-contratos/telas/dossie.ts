import type { Feature } from "../../../app/features.js";
import { ContratosDossie } from "../../ContratosDossie.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.table", "core.input", "core.drawer-modal", "core.file-uploader", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

/** Contratos que têm itens de dossiê na fixture `contratos.base`. */
const CONTRATOS = ["CT-2026-001", "CT-2026-002", "CT-2026-003", "CT-2026-004", "CT-2026-005", "CT-2026-006", "CT-2026-007", "CT-2026-010", "CT-2025-018", "CT-2025-040"];

export const dossie: Feature = {
  routes: [
    {
      path: ROTAS.dossie,
      screen: ContratosDossie,
      name: "Conformidade — Dossiê",
      group: FLOW,
      description: "Os documentos exigidos de todos os contratos, o resumo 100% Conforme por contrato e o protocolo de documento.",
      components: COMPONENTS,
      controls: [
        {
          id: "abertura",
          title: "Abertura da tela",
          note: "A Torre leva com o filtro Pendentes; a Ficha do contrato leva filtrada pelo contrato.",
          controls: [
            {
              id: "filtro",
              label: "Filtro",
              options: [
                { value: "todos", label: "Todos" },
                { value: "conformes", label: "Conformes" },
                { value: "pendentes", label: "Pendentes" },
                { value: "aso", label: "ASO/Saúde" },
                { value: "certidoes", label: "Certidões" },
              ],
            },
            { id: "contrato", label: "Contrato", options: [{ value: "todos", label: "Todos" }, ...CONTRATOS.map((id) => ({ value: id, label: id }))] },
            { id: "modal", label: "Modal", options: [{ value: "nenhum", label: "Nenhum" }, { value: "protocolar", label: "Protocolar documento" }] },
          ],
        },
        papelControl("juridico"),
      ],
      expected: [
        "Resumo por contrato com o selo 100% Conforme ou N pendente(s); clicar filtra a lista.",
        "Lista com contrato, parte, natureza, documento, arquivo ou Pendente de Anexo, validade (vencida em vermelho, até 30 dias em âmbar), conformidade e auditor.",
        "Busca à esquerda dos selects de status e natureza, sem etiquetas removíveis; Exportar planilha.",
        "Protocolar documento: se já existe item pendente igual, o protocolo preenche esse item em vez de criar outro.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.dossie",
      title: "Dossiê de todos os contratos",
      route: ROTAS.dossie,
      intent: "O Jurídico confere o dossiê da carteira e vê o que falta para cada contrato ficar 100% Conforme.",
      expected: [
        "Resumo com 10 contratos: CT-2026-001, 003, 004, 007, 010 e CT-2025-018 com 100% Conforme; CT-2026-002 e CT-2026-005 com 1 pendente; CT-2026-006 com 2 pendentes; CT-2025-040 com 1 pendente (laudo não conforme).",
        "Lista com 17 itens; os sem arquivo mostram Pendente de Anexo (SOC 2 do CT-2026-002, ASO admissional do CT-2026-005, CND Federal e Registro no CRFa do CT-2026-006).",
        "Laudo de vigilância sanitária do CT-2025-040 com validade 30/06/2026 em vermelho (vencida) e Não conforme.",
        "Selects Conformes (12) e Pendentes (5), ASO/Saúde e Certidões; busca; Exportar planilha exporta só as linhas listadas.",
        "Botão Protocolar documento (some para quem só consulta: Diretoria, Financeiro).",
      ],
    }),
    c({
      id: "contratos.dossie-protocolar",
      title: "Protocolar o ASO pendente",
      route: ROTAS.dossie,
      controls: { contrato: "CT-2026-005", modal: "protocolar" },
      intent: "Protocolar o ASO admissional da Camila Rocha Duarte (CT-2026-005), que preenche o item pendente em vez de criar outro.",
      expected: [
        "Etiqueta \"Contrato: CT-2026-005\" na lista, com 2 itens (ASO admissional pendente e Registro no CRP conforme).",
        "Drawer Protocolar documento com contrato CT-2026-005, natureza ASO/Saúde e documento ASO admissional já preenchidos (é o único pendente do contrato).",
        "Aviso: \"Já existe um item pendente para este documento: o protocolo vai preencher esse item\".",
        "Salvar sem arquivo e como Conforme mostra o erro no campo Arquivo; com o arquivo, o item d9 é preenchido (nada é criado), o drawer fecha e o toast diz \"CT-2026-005 agora está 100% Conforme\".",
      ],
    }),
    c({
      id: "contratos.dossie-vazio",
      title: "Dossiê vazio",
      route: ROTAS.dossie,
      fixture: "contratos.vazio",
      intent: "Implantação nova: ainda não há contrato, então não há documento no dossiê.",
      expected: ["Estado vazio \"Nenhum documento no dossiê\", explicando que os itens nascem com o contrato (checklist da categoria)."],
    }),
  ],
};
