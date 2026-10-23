import type { Feature } from "../../../app/features.js";
import { ContratosDiff } from "../../ContratosDiff.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.input", "core.table", "core.modal", "core.empty-state-card", "core.toast-wrapper"];
const c = cenario(COMPONENTS);

const VERSOES = ["v1.0", "v1.1", "v1.2", "v2.0", "v2.1"].map((v) => ({ value: v, label: v }));

export const diff: Feature = {
  routes: [
    {
      path: ROTAS.diff,
      screen: ContratosDiff,
      name: "Diff Jurídico",
      group: FLOW,
      description: "Comparação entre versões da minuta (linha a linha ou lado a lado em A4) e os contratos vigentes na versão base, com o Termo Aditivo de adequação.",
      components: COMPONENTS,
      controls: [
        {
          id: "comparacao",
          title: "Comparação",
          note: "Sem minuta escolhida, abre a primeira com pelo menos 2 versões (RN-047). Versão que não existe para a minuta escolhida cai no padrão: nova = vigente, base = a anterior a ela.",
          controls: [
            { id: "modo", label: "Modo", default: "linhas", options: [{ value: "linhas", label: "Linha a linha" }, { value: "lado-a-lado", label: "Lado a lado" }] },
            { id: "minuta", label: "Minuta", default: "auto", options: [{ value: "auto", label: "Sem seleção (padrão)" }, ...["MIN-PJA", "MIN-CLT", "MIN-REC", "MIN-PAR"].map((v) => ({ value: v, label: v }))] },
            { id: "base", label: "Versão base", default: "v2.0", options: VERSOES },
            { id: "nova", label: "Versão nova", default: "v2.1", options: VERSOES },
            { id: "catalogo", label: "Catálogo", default: "com-minutas", options: [{ value: "com-minutas", label: "Com minutas" }, { value: "vazio", label: "Vazio (nenhum modelo)" }] },
            { id: "foco", label: "Foco", default: "topo", options: [{ value: "topo", label: "Topo da tela" }, { value: "impactados", label: "Contratos impactados" }] },
          ],
        },
        papelControl("juridico"),
      ],
      expected: [
        "Seleção de minuta, versão base e versão nova; contagens de linhas adicionadas, removidas, inalteradas e o total (RN-046).",
        "Linha a linha sobre o texto, sem formatação: cada título e parágrafo é uma linha numerada; adicionadas em verde, removidas em vermelho, inalteradas apagadas; na linha alterada, as palavras que mudaram.",
        "Lado a lado: duas folhas A4 (base | nova) com as diferenças destacadas.",
        "Contratos vigentes na versão base, com o motivo da revisão e Gerar Termo Aditivo de adequação (só Jurídico).",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.diff-linhas",
      title: "Diff linha a linha (MIN-PJA v2.0 → v2.1)",
      route: ROTAS.diff,
      controls: { modo: "linhas", minuta: "MIN-PJA", base: "v2.0", nova: "v2.1" },
      intent: "Ver o que mudou da MIN-PJA v2.0 para a v2.1, cláusula a cláusula.",
      expected: [
        "Contagens: +6 adicionadas, −4 removidas, 14 inalteradas, 24 linhas no total, e o motivo da v2.1 (anticorrupção e 48h para incidente LGPD).",
        "Preâmbulo e Cláusulas 1ª a 4ª (título e texto) inalteradas, em cinza.",
        "Cláusula 5ª: \"renovando-as antes do vencimento\" em verde; Cláusula 6ª: \"comunicando qualquer incidente de segurança em até 48 horas\" em verde.",
        "Linhas novas da Cláusula 7ª — Da Anticorrupção em verde; títulos de Rescisão e Foro com o número trocado (7ª→8ª, 8ª→9ª) em vermelho e verde.",
        "Tags {{TAG}} em roxo dentro do texto.",
      ],
    }),
    c({
      id: "contratos.diff-lado-a-lado",
      title: "Diff lado a lado em A4",
      route: ROTAS.diff,
      controls: { modo: "lado-a-lado", minuta: "MIN-PJA", base: "v2.0", nova: "v2.1" },
      intent: "Comparar as duas versões como documento, uma folha ao lado da outra.",
      expected: [
        "Duas folhas A4 com \"Página X de Y\": MIN-PJA v2.0 (Base) e MIN-PJA v2.1 (Nova).",
        "Na base, o que saiu em vermelho riscado; na nova, o que entrou em verde (a Cláusula 7ª — Da Anticorrupção com fundo verde).",
        "Em telas estreitas, as folhas empilham.",
      ],
    }),
    c({
      id: "contratos.diff-impactados",
      title: "Contratos impactados pela revisão",
      route: ROTAS.diff,
      controls: { modo: "linhas", minuta: "MIN-PJA", base: "v2.0", nova: "v2.1", foco: "impactados" },
      intent: "Gerar o Termo Aditivo de adequação dos contratos vigentes na MIN-PJA v2.0.",
      expected: [
        "A tela abre rolada até \"Contratos impactados (vigentes na MIN-PJA v2.0)\", com a seção em destaque (contorno azul), dentro do mesmo cartão da comparação.",
        "CTR-2026-0001 (Clínica Integrar, término 17/08/2026, 18 dias, selo Cláusula personalizada) e CTR-2025-0040 (término 31/03/2027), com o motivo da v2.1.",
        "Gerar Termo Aditivo pede confirmação com TA-02/CTR-2026-0001 (ou TA-01/CTR-2025-0040), tipo \"Adequação de Minuta Homologada\", impacto \"Sem alteração de valor nominal. Alinhamento de compliance.\" e a versão MAJOR do contrato (v1.4 → v2.0).",
        "Ao confirmar, o aditivo nasce Aprovado e Assinado, o contrato passa à MIN-PJA v2.1 (cláusulas não editadas atualizadas; a personalizada fica) e sai da lista; toast com o código.",
        "Sem contratos: \"Nenhum contrato vigente na versão base\".",
        "Em outro papel, sem o botão: aviso \"Só o Jurídico gera aditivo de adequação\".",
      ],
    }),
    c({
      id: "contratos.diff-padrao",
      title: "Comparador sem seleção",
      route: ROTAS.diff,
      controls: { minuta: "auto" },
      intent: "Abrir o Diff sem escolher minuta: ele escolhe a primeira com pelo menos 2 versões (RN-047).",
      expected: [
        "Abre a MIN-PJA (MIN-CLT e MIN-PAR têm uma versão só no catálogo), com v2.0 → v2.1.",
      ],
    }),
    c({
      id: "contratos.diff-versao-unica",
      title: "Minuta com uma versão só",
      route: ROTAS.diff,
      controls: { minuta: "MIN-CLT" },
      intent: "Ver o comparador numa minuta que ainda não teve revisão.",
      expected: [
        "Aviso \"MIN-CLT tem uma versão só (v1.2)\" e o texto da v1.2 inteiro como linhas inalteradas (0 adicionadas, 0 removidas, 10 inalteradas, 10 no total).",
        "Sem a seção de contratos impactados.",
      ],
    }),
    c({
      id: "contratos.diff-vazio",
      title: "Catálogo de minutas vazio",
      route: ROTAS.diff,
      controls: { catalogo: "vazio" },
      intent: "Abrir o comparador sem nenhum modelo cadastrado.",
      expected: ["Cartão vazio \"Nenhum modelo cadastrado\"."],
    }),
  ],
};
