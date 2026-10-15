import type { ControlGroup, Scenario } from "@brucesantos/design-space";
import type { Feature } from "../../app/features.js";
import { DETALHE, FilaDeEspera, PATH } from "../FilaDeEspera.js";
import { FILA_FIXTURES } from "./fixtures.js";
import { UNIDADES } from "./model.js";

const FLOW = "Fila de Espera";
const lead = (id: string) => DETALHE.replace(":id", id);

/** Componentes do catálogo que a tela usa. */
const COMPONENTS = [
  "layout.backoffice", "core.breadcrumbs", "core.notification", "core.card", "core.header", "core.input", "core.table", "core.tag",
  "core.avatar", "core.button", "core.empty-state-card", "core.loading-card", "core.drawer-modal",
];

const unidade: ControlGroup = {
  id: "unidade",
  title: "Unidade",
  note: "No sistema, a unidade vem do seletor do cabeçalho.",
  controls: [{ id: "unidade", label: "Unidade", options: UNIDADES.map((u) => ({ value: u, label: u })) }],
};
const estado = (options: [string, string][]): ControlGroup => ({
  id: "situacao",
  title: "Situação da tela",
  controls: [{ id: "estado", label: "Estado", options: options.map(([value, label]) => ({ value, label })) }],
});

type S = Omit<Scenario, "fixture" | "persona" | "components"> & { fixture?: string; persona?: string };
const scenario = ({ fixture = "fila.base", persona = "admin", ...s }: S): Scenario => ({ ...s, fixture, persona, components: COMPONENTS });

/** Fila de Espera: leads esperando vaga, com o cruzamento da semana. */
export const feature: Feature = {
  fixtures: [...FILA_FIXTURES],
  scenarios: [
    scenario({
      id: "fila.lista",
      title: "Fila da unidade",
      route: PATH,
      intent: "O comercial abre a fila da unidade para ver quem já pode ser encaixado.",
      expected: [
        "Cabeçalho, filtros e a lista num cartão só. Filtros: busca (criança, responsável ou telefone), especialidade, responsável comercial e encaixe.",
        "Leads em ordem de chegada, com posição, criança e responsável familiar, especialidades com horas por semana, selo de encaixe, dias na fila e responsável comercial.",
        "Selo: completo (verde), parcial (laranja, com quando completa), previsto (azul, com a data) ou sem encaixe.",
        "No celular, a tabela vira uma lista de linhas.",
        "Sino com os avisos de encaixe; clicar num aviso abre o painel do lead.",
      ],
    }),
    scenario({
      id: "fila.outra-unidade",
      title: "Fila de outra unidade",
      route: PATH,
      controls: { unidade: "Unidade Girassol" },
      intent: "Cada unidade tem a sua fila; a posição conta só dentro dela.",
      expected: ["Três leads da Unidade Girassol, numerados a partir de 1º."],
    }),
    scenario({
      id: "fila.vazia",
      title: "Fila vazia",
      route: PATH,
      fixture: "fila.vazia",
      tags: ["vazio"],
      intent: "Unidade sem ninguém na fila.",
      expected: ["Estado vazio, sem filtros."],
    }),
    scenario({
      id: "fila.completo",
      title: "Lead com encaixe completo",
      route: lead("wq4"),
      intent: "Todas as horas pedidas cabem hoje: dá para encaixar e devolver ao funil.",
      expected: [
        "Painel à direita com a criança, a posição, o responsável familiar e o selo Encaixe completo.",
        "Cruzamento da semana: blocos de cada especialidade na hora livre, estrela na disponibilidade da família, tracejado nas horas livres de profissional.",
        "Horários por especialidade com a barra de horas, o profissional, a fonte (escala atual) e quantos estão à frente no mesmo horário.",
        "Rodapé: Desistiu (vai para Perdido) e Encaixar. Os dois tiram o lead da fila com um aviso.",
      ],
    }),
    scenario({
      id: "fila.parcial",
      title: "Lead com encaixe parcial",
      route: lead("wq1"),
      intent: "Parte das horas cabe hoje; o resto libera com uma alta de paciente.",
      expected: ["Selo Encaixe parcial · 4 de 6h.", "Blocos de hoje cheios e os previstos com contorno, com a data em que liberam.", "Arrastar um bloco acende as horas possíveis; soltar move o encaixe e mostra Voltar à sugestão do sistema."],
    }),
    scenario({
      id: "fila.previsto",
      title: "Lead com encaixe previsto",
      route: lead("wq3"),
      intent: "Nada cabe hoje, mas um desligamento de paciente libera a vaga numa data.",
      expected: ["Selo Encaixe previsto com a data.", "Ver no Mapa da Unidade no cruzamento da semana.", "No rodapé, Voltar ao funil no lugar de Encaixar."],
    }),
    scenario({
      id: "fila.parcial-previsto",
      title: "Lead com parcial previsto",
      route: lead("wq9"),
      intent: "Duas especialidades: uma sem vaga, outra com vaga só no futuro.",
      expected: ["Selo Parcial previsto com a data.", "A especialidade sem horário dentro da disponibilidade lista as horas livres fora dela."],
    }),
    scenario({
      id: "fila.sem-encaixe",
      title: "Lead sem encaixe",
      route: lead("wq7"),
      intent: "A família só pode no fim da tarde, e não há profissional livre nesse horário.",
      expected: ["Selo Sem encaixe.", "Observação da família no pedido.", "Horas livres de Análise do Comportamento fora da disponibilidade, para o comercial negociar."],
    }),
    scenario({
      id: "fila.editar",
      title: "Editar pedido",
      route: lead("wq1"),
      controls: { estado: "editar" },
      intent: "Mudar especialidades, carga ou disponibilidade do pedido.",
      expected: [
        "Drawer com unidade, motivo, especialidades com horas por semana, disponibilidade da família (dia, das, até) e observação.",
        "Salvar pedido fica desabilitado sem ao menos uma especialidade com horas e um horário.",
        "Os encaixes que continuam valendo são mantidos ao salvar.",
      ],
    }),
    scenario({
      id: "fila.coordenacao",
      title: "Fila vista pela coordenação",
      route: PATH,
      persona: "coordinator",
      intent: "A coordenação também vê a fila, como vê os Leads.",
      expected: ["Item Fila de Espera no menu, junto do menu da coordenação."],
    }),
  ],
  routes: [
    {
      path: PATH,
      screen: FilaDeEspera,
      name: "Fila de Espera",
      group: FLOW,
      description: "Os leads esperando vaga numa unidade, em ordem de chegada, com o encaixe que o cruzamento encontrou.",
      controls: [unidade],
      components: COMPONENTS,
    },
    {
      path: DETALHE,
      params: { id: "wq1" },
      screen: FilaDeEspera,
      name: "Lead na fila",
      group: FLOW,
      description: "O painel do lead: cruzamento da semana, horários por especialidade, pedido e responsável comercial.",
      controls: [estado([["painel", "Painel"], ["editar", "Editar pedido"]])],
      components: COMPONENTS,
    },
  ],
};
