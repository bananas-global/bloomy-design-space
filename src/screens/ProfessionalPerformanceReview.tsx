/**
 * Avaliação de desempenho — a ficha do profissional com o drawer de avaliação
 * aberto pelo menu ⋮ do card (`professionals/show.ex`). Novo, ainda não existe
 * no Phoenix.
 *
 * A tela monta os dados a partir dos controles (`avaliacao-desempenho/flow.ts`)
 * sobre a fixture do profissional (`avaliacao-desempenho/fixtures.ts`).
 */
import { useEffect } from "react";
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { ProfessionalLayout } from "../layouts/ProfessionalLayout.js";
import { TODAY } from "../components/today.js";
import { PROFESSIONAL, REVIEWS, type ReviewFixture } from "./avaliacao-desempenho/fixtures.js";
import { REVIEW_CONTROLS, useControlledState, type Controls, type DrawerState } from "./avaliacao-desempenho/flow.js";
import { LevelTag, ReviewDrawer, type DrawerView, type ReviewInput } from "./avaliacao-desempenho/ReviewDrawer.js";
import { cycleOf, reviewPolicyOf, scoreOf, type Review } from "./avaliacao-desempenho/model.js";

const CURRENT_USER = { name: "Marina Alves", units: ["Santana"], roles: [] };

const [YEAR, MONTH, DAY] = TODAY.split("-");
const TODAY_BR = `${DAY}/${MONTH}/${YEAR}`;

type State = { reviews: Review[]; open: boolean; view: DrawerView };

/**
 * Os dados da fixture do cenário. Lidos da própria fixture, e não de
 * `context.data`: ao trocar de atalho, a fixture nova chega no mesmo render que
 * o cenário, mas `context.data` ainda traz a anterior por um render.
 */
const fixtureOf = (context: ScenarioContext): ReviewFixture => {
  const data = context.fixture?.data;
  return ((typeof data === "function" ? data() : data) as ReviewFixture | undefined) ?? { professional: PROFESSIONAL, reviews: REVIEWS };
};

function viewOf(drawer: string | undefined, reviews: Review[]): Pick<State, "open" | "view"> {
  const first = reviews[0];
  switch (drawer as DrawerState | undefined) {
    case "list":
      return { open: true, view: { kind: "list" } };
    case "new":
      return { open: true, view: { kind: "new" } };
    case "view":
      return { open: true, view: first ? { kind: "view", id: first.id } : { kind: "list" } };
    case "edit":
      return { open: true, view: first ? { kind: "edit", id: first.id } : { kind: "list" } };
    default:
      return { open: false, view: { kind: "list" } };
  }
}

function derive(s: State): Controls {
  return { drawer: s.open ? s.view.kind : "closed" };
}

function ReviewScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  const role = context.persona?.id ?? "admin";
  const policy = reviewPolicyOf(role);
  const [state, setState] = useControlledState<State>(context, {
    groups: REVIEW_CONTROLS,
    seed: (c, prev) => {
      const reviews = prev?.reviews ?? fixture.reviews;
      return { reviews, ...viewOf(policy.view ? c.drawer : "closed", reviews) };
    },
    derive,
  });

  const draft: Review = {
    id: "new",
    date: TODAY_BR,
    cycle: cycleOf(TODAY),
    author: { name: CURRENT_USER.name, role },
    answers: {},
    feedback: { strengths: "", improvements: "", actionPlan: "", shared: false },
  };
  const latest = state.reviews[0] ? scoreOf(state.reviews[0].answers).level : null;

  // Cada troca de estado começa do topo, como o `phx:drawerScrollTop`.
  const viewKey = JSON.stringify(state.view);
  useEffect(() => {
    document.getElementById("performance_review_drawer-content")?.scrollTo(0, 0);
  }, [viewKey]);

  const navigate = (view: DrawerView) => setState((s) => ({ ...s, view }));
  // `put_toast/2`: `close_time` padrão de 3000.
  const success = (content: string) => showToast({ title: "Sucesso!", content, type: "success", closeTime: 3000 });

  function create(input: ReviewInput) {
    const created: Review = { ...draft, ...input, id: `pr-${Date.now()}` };
    setState((s) => ({ ...s, reviews: [created, ...s.reviews], view: { kind: "list" } }));
    success("Avaliação de desempenho criada.");
  }

  function update(id: string, input: ReviewInput) {
    setState((s) => ({
      ...s,
      reviews: s.reviews.map((r) => (r.id === id ? { ...r, ...input, edited: { by: CURRENT_USER.name, at: TODAY_BR } } : r)),
      view: { kind: "list" },
    }));
    success("Avaliação de desempenho atualizada.");
  }

  function remove(id: string) {
    setState((s) => ({ ...s, reviews: s.reviews.filter((r) => r.id !== id), view: { kind: "list" } }));
    success("Avaliação de desempenho excluída.");
  }

  return (
    <BackofficeLayout
      context={context}
      currentPath="/backoffice/profissionais"
      breadcrumbs={[{ label: "Profissionais", to: "/backoffice/profissionais" }, { label: fixture.professional.name }]}
      currentUser={CURRENT_USER}
    >
      <ProfessionalLayout
        context={context}
        professional={fixture.professional}
        onPerformanceReview={policy.view ? () => setState((s) => ({ ...s, open: true, view: { kind: "list" } })) : undefined}
        extraTags={policy.view && latest && <LevelTag level={latest} prefix="Desempenho " />}
      />
      <ReviewDrawer
        show={state.open}
        professionalName={fixture.professional.name}
        view={state.view}
        items={state.reviews}
        draft={draft}
        policy={policy}
        onClose={() => setState((s) => ({ ...s, open: false, view: { kind: "list" } }))}
        onNavigate={navigate}
        onCreate={create}
        onUpdate={update}
        onDelete={remove}
      />
    </BackofficeLayout>
  );
}

export function ProfessionalPerformanceReview({ context }: ScreenProps) {
  if (context.isLoading) return null;
  // Cada atalho começa dos dados da fixture, sem herdar o que se fez no anterior.
  return <ReviewScreen key={`${context.scenario?.id}|${context.fixture?.id}`} context={context} />;
}
