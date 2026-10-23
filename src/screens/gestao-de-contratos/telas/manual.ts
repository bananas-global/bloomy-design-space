import type { Feature } from "../../../app/features.js";
import { ContratosManual } from "../../ContratosManual.js";
import { FASES } from "../model.js";
import { ROTAS, papelControl } from "../ui.js";
import { FLOW, cenario } from "./comum.js";

const COMPONENTS = ["core.input", "core.copy-button", "core.modal", "core.empty-state-card"];
const c = cenario(COMPONENTS);

export const manual: Feature = {
  routes: [
    {
      path: ROTAS.manual,
      screen: ContratosManual,
      name: "Manual do Usuário",
      group: FLOW,
      description: "Procedimentos (POPs) e fluxogramas dos 13 módulos, com busca, filtro por fase e a janela Direitos & Licença.",
      components: COMPONENTS,
      controls: [
        {
          id: "manual",
          title: "Manual",
          controls: [
            { id: "busca", label: "Busca", default: "vazia", options: [{ value: "vazia", label: "Vazia" }, { value: "aditivo", label: "\"aditivo\"" }, { value: "xyz", label: "\"xyz\" (sem resultado)" }] },
            { id: "fase", label: "Fase", default: "todas", options: [{ value: "todas", label: "Todas" }, ...FASES.map((f) => ({ value: f.id, label: `${f.n}. ${f.label}` }))] },
            { id: "licenca", label: "Direitos & Licença", default: "fechada", options: [{ value: "fechada", label: "Fechada" }, { value: "aberta", label: "Aberta" }] },
          ],
        },
        papelControl("solicitante"),
      ],
      expected: [
        "13 módulos em acordeão, recolhidos, cada um com número, título, resumo e as fases do ciclo de vida em que atua.",
        "Aberto, o módulo mostra quem usa, o fluxograma em passos com setas (e os desvios), os POPs numerados, as travas de governança e o atalho Abrir a tela.",
        "Busca a partir de 2 letras, sem diferenciar acento nem caixa: sugestões com o módulo e o tópico, termo destacado e módulos encontrados abertos; Limpar busca volta ao manual inteiro.",
        "Expandir todos / Recolher todos age sobre os módulos visíveis; o filtro por fase soma com a busca.",
        "Direitos & Licença abre a certidão de titularidade com Copiar texto e Imprimir.",
      ],
    },
  ],
  scenarios: [
    c({
      id: "contratos.manual",
      title: "Manual do Usuário",
      route: ROTAS.manual,
      controls: { papel: "solicitante" },
      intent: "Consultar como se faz um procedimento do módulo, do cadastro da parte ao encerramento.",
      expected: [
        "Aba Manual destacada na navegação do módulo; botão Direitos & Licença no cabeçalho.",
        "Campo de busca, \"Expandir todos\", os filtros de fase (Todas as fases 13; 1. Elaboração 8; 2. Validação 6; 3. Aprovação 4; 4. Assinatura 4; 5. Execução Vigente 6; 6. Gestão de Aditivos & Reajuste 5; 7. Encerramento 4) e o contador \"13 módulo(s)\".",
        "13 módulos recolhidos, na ordem: Torre de Controle, Carteira & Esteira BPM, Cadastro de Partes, Tabelas de Apoio & Campos por Categoria, Minutas Padrão, Novo Contrato, Workflows de Aprovação & Assinatura, Ficha do Contrato, Diff Jurídico & Aditivo de Adequação, Vigência, Reajustes & Termos Aditivos, Conformidade: Dossiê Documental, Cobrança, Smart Intake & ERP, Encerramento & Distrato.",
        "Torre, Carteira e Ficha com o selo \"Todas as fases\"; os demais com as fases em que atuam.",
        "Abrir Workflows mostra o fluxograma Em Elaboração → Submeter → … → Vigente, o desvio da reprovação e a trava \"Bloqueio de Governança\".",
        "Expandir todos abre os 13 e o botão vira Recolher todos.",
      ],
    }),
    c({
      id: "contratos.manual-busca",
      title: "Manual: busca \"aditivo\"",
      route: ROTAS.manual,
      controls: { papel: "solicitante", busca: "aditivo" },
      intent: "Achar no manual tudo sobre termo aditivo.",
      expected: [
        "Lista de sugestões aberta sob a busca: módulo · tópico e o trecho com \"aditivo\" destacado; 8 sugestões e \"e mais 9 trecho(s) nos módulos abaixo\". Clicar numa sugestão abre o módulo e rola até ele.",
        "Linha: 17 trecho(s) com \"aditivo\" em 5 módulo(s); etiqueta Busca: \"aditivo\" removível e contador \"5 módulo(s)\".",
        "Só os 5 módulos com o termo, já abertos: Tabelas de Apoio, Ficha do Contrato, Diff Jurídico & Aditivo de Adequação, Vigência, Reajustes & Termos Aditivos e Encerramento & Distrato; o termo (e \"aditivos\") aparece destacado em títulos, passos, fluxograma e travas.",
        "Busca sem acento acha com acento (\"conformidade\" acha \"Conformidade\", \"reajuste\" acha \"Reajuste\").",
        "Limpar busca volta aos 13 módulos recolhidos. Com 1 letra, aparece \"Digite pelo menos 2 letras para buscar.\" e nada é filtrado.",
      ],
    }),
    c({
      id: "contratos.manual-fase",
      title: "Manual filtrado por fase",
      route: ROTAS.manual,
      controls: { papel: "solicitante", fase: "aditivos" },
      intent: "Ver só os procedimentos da fase 6, Gestão de Aditivos & Reajuste.",
      expected: [
        "Filtro \"6. Gestão de Aditivos & Reajuste\" ativo e etiqueta \"Fase: Gestão de Aditivos & Reajuste\" removível; contador \"5 módulo(s)\".",
        "Módulos: Torre de Controle, Carteira & Esteira BPM e Ficha do Contrato (todas as fases), Diff Jurídico & Aditivo de Adequação e Vigência, Reajustes & Termos Aditivos.",
        "Clicar de novo no filtro ou em Limpar Todos volta aos 13 módulos.",
        "Busca e fase se somam; sem módulo no cruzamento, estado vazio \"Nada encontrado\" com Limpar busca e filtro.",
      ],
    }),
    c({
      id: "contratos.manual-licenca",
      title: "Direitos & Licença",
      route: ROTAS.manual,
      controls: { papel: "solicitante", licenca: "aberta" },
      intent: "Consultar a titularidade do software e copiar ou imprimir a certidão.",
      expected: [
        "Janela \"Direitos & Licença\" com o quadro da certidão: Módulo de Gestão de Contratos, titular dos direitos patrimoniais e autoria.",
        "Quatro cláusulas resumidas: Titularidade, Base legal (Lei nº 9.609/1998 e Lei nº 9.279/1996), Licença de uso (interna, não exclusiva, intransferível) e Direitos reservados ao titular.",
        "Aviso de que titular e autor são fictícios no protótipo.",
        "Copiar texto copia a certidão em texto corrido e mostra o toast \"Copiado!\"; Imprimir abre a impressão só da certidão; Fechar ou o X fecham a janela.",
      ],
    }),
  ],
};
