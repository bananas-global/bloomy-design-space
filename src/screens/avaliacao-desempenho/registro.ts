import type { Feature } from "../../app/features.js";

import { ProfessionalPerformanceReview } from "../ProfessionalPerformanceReview.js";
import { REVIEW_FIXTURES } from "./fixtures.js";
import { FLOW, PATH, PROFESSIONAL_ID, REVIEW_CONTROLS, professionalPath } from "./flow.js";

/** Componentes do catálogo que a avaliação de desempenho usa. */
const REVIEW_COMPONENTS = [
  "layout.backoffice", "layout.professional", "core.drawer-modal", "core.dropdown-menu", "core.breadcrumbs", "core.button",
  "core.tag", "core.avatar", "core.label", "core.error", "core.input", "core.progress", "core.inside-card",
  "core.toast-wrapper",
];

/** Avaliação de desempenho: o drawer da ficha do profissional. */
export const feature: Feature = {
  scenarios: [
    {
      id: "performance-review.list",
      title: "Todas avaliações",
      route: professionalPath(),
      fixture: "performance-review.history",
      persona: "coordinator",
      controls: { drawer: "list" },
      intent: "O drawer aberto pelo menu ⋮ do card do profissional, em Avaliação de Desempenho: o histórico por ciclo, com pontuação, classificação e os dois eixos.",
      expected: [
        "Três avaliações, da mais recente para a mais antiga: 2º tri/2026 Consolidado (45/48), 1º tri/2026 Em desenvolvimento (34/48) e 4º tri/2025 Plano de ação (36/48).",
        "Cada item mostra o papel e o nome de quem avaliou, o ciclo, a pontuação de cada eixo e, se houver, \"Editado por … em …\" (a do 1º tri).",
        "A do 2º tri tem a tag \"Devolutiva pendente\".",
        "No card do profissional, a tag \"Desempenho Consolidado\" vem da avaliação mais recente.",
        "Nova avaliação no rodapé.",
      ],
    },
    {
      id: "performance-review.new",
      title: "Nova avaliação",
      route: professionalPath(),
      fixture: "performance-review.history",
      persona: "coordinator",
      controls: { drawer: "new" },
      intent: "A avaliação trimestral: 12 itens em dois eixos na escala de 1 a 4, três deles críticos, e a devolutiva.",
      expected: [
        "Avaliador é quem está logado (Marina Alves, Coordenador) e o ciclo é o de hoje (3º trimestre · 2026).",
        "O cabeçalho explica a avaliação e a escala; Cálculo da classificação abre as faixas e a regra dos itens críticos (estrela).",
        "Os itens vêm em dois blocos: Competências técnicas e Conduta e comportamento.",
        "A barra conta os respondidos. Salvar com item em branco marca os que faltam e rola até o primeiro.",
        "Com os 12 respondidos aparece a classificação: 38 a 48 Consolidado, 26 a 37 Em desenvolvimento, 12 a 25 Plano de ação; nota 1 ou 2 num crítico dá Plano de ação e diz qual item. Abaixo, a pontuação de cada eixo.",
        "Em desenvolvimento e Plano de ação tornam o plano de ação combinado obrigatório.",
        "Salvar volta para a lista com a avaliação no topo e o toast \"Avaliação de desempenho criada.\"",
      ],
    },
    {
      id: "performance-review.view",
      title: "Avaliação com devolutiva pendente",
      route: professionalPath(),
      fixture: "performance-review.history",
      persona: "coordinator",
      controls: { drawer: "view" },
      intent: "A avaliação mais recente: Consolidado, mas a devolutiva ainda não foi conversada com o profissional.",
      expected: [
        "O resultado mostra Consolidado, 45/48 e as barras dos dois eixos (22/24 e 23/24).",
        "A devolutiva tem a tag \"Devolutiva pendente\" e os três textos.",
        "Cada resposta aparece como tag na cor da escala, nos dois blocos.",
        "Excluir e Editar no rodapé.",
      ],
    },
    {
      id: "performance-review.view-critical",
      title: "Plano de ação por item crítico",
      route: professionalPath(),
      fixture: "performance-review.history",
      persona: "coordinator",
      controls: { drawer: "list" },
      intent: "Abra a avaliação do 4º tri/2025: 36 pontos dariam Em desenvolvimento, mas a nota 2 no item 1 a leva a Plano de ação.",
      expected: ["O resultado mostra Plano de ação, 36/48 e o aviso \"Classificado como Plano de ação por item crítico\" com o item 1."],
    },
    {
      id: "performance-review.edit",
      title: "Editar avaliação",
      route: professionalPath(),
      fixture: "performance-review.history",
      persona: "coordinator",
      controls: { drawer: "edit" },
      intent: "O formulário preenchido com as respostas e a devolutiva da avaliação mais recente.",
      expected: [
        "Cancelar volta para a leitura da avaliação; Salvar volta para a lista com \"Editado por Marina Alves em 30/07/2026\".",
        "Toast \"Avaliação de desempenho atualizada.\"",
      ],
    },
    {
      id: "performance-review.empty",
      title: "Profissional sem avaliações",
      route: professionalPath(),
      fixture: "performance-review.empty",
      persona: "coordinator",
      controls: { drawer: "list" },
      intent: "A primeira avaliação do profissional.",
      expected: ["\"Nenhuma avaliação de desempenho cadastrada.\" e Nova avaliação.", "Sem a tag de desempenho no card do profissional."],
    },
    {
      id: "performance-review.people",
      title: "Pessoas vê e exclui",
      route: professionalPath(),
      fixture: "performance-review.history",
      persona: "people",
      controls: { drawer: "view" },
      intent: "Proposta de permissão: supervisão e coordenação avaliam; admin, admin de clínica e pessoas veem e excluem.",
      expected: ["Sem Nova avaliação na lista.", "Na avaliação, só Excluir."],
    },
    {
      id: "performance-review.hidden",
      title: "Atendente não vê",
      route: professionalPath(),
      fixture: "performance-review.history",
      persona: "attendant",
      controls: { drawer: "closed" },
      intent: "Os demais papéis não têm o item Avaliação de Desempenho no menu nem a tag no card.",
      expected: ["Menu ⋮ sem Avaliação de Desempenho.", "Sem a tag \"Desempenho …\" no card."],
    },
  ],
  fixtures: [...REVIEW_FIXTURES],
  routes: [
    {
      path: PATH,
      params: { id: PROFESSIONAL_ID },
      screen: ProfessionalPerformanceReview,
      name: "Ficha do profissional · Avaliação de desempenho",
      group: FLOW,
      description: "A ficha do profissional com o drawer de avaliação de desempenho, aberto pelo menu ⋮ do card.",
      controls: REVIEW_CONTROLS,
      expected: [
        "Novo: item Avaliação de Desempenho no menu ⋮ do card do profissional, que abre o drawer na lista.",
        "Lista: avaliador, ciclo trimestral, pontuação de 48, classificação (Consolidado, Em desenvolvimento, Plano de ação), pontuação por eixo e Devolutiva pendente.",
        "Formulário: 12 itens em dois eixos (Competências técnicas e Conduta e comportamento), três críticos, na escala Abaixo do esperado, Em desenvolvimento, Atende ao esperado, Referência para a equipe.",
        "Devolutiva: pontos fortes, pontos a desenvolver, plano de ação combinado (obrigatório em Em desenvolvimento e Plano de ação) e se já foi realizada.",
        "Novo no card do profissional: a tag \"Desempenho <classificação>\" da avaliação mais recente.",
        "Permissões (proposta, sem policy no Phoenix): criar e editar para coordenador e supervisor; ver e excluir também para admin, admin de clínica e pessoas.",
      ],
      components: REVIEW_COMPONENTS,
    },
  ],
};
