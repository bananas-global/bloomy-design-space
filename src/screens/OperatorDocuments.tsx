/**
 * Documentos da Operadora — nova aba da ficha da operadora no backoffice.
 * Novo — não existe no Phoenix.
 *
 * No monólito, a ficha é `HealthCareLive.Show`: um `lazy_tabs` com o
 * `CardHeader` no slot `header`. Esta tela é o mesmo `lazy_tabs`, com o
 * cabeçalho do design e só a aba nova, Documentos. Dentro dela, `button_tabs`
 * separa Profissionais (credenciamento de cada um, pelos documentos
 * compartilhados) e Unidades (documentos obrigatórios de cada unidade).
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { showToast } from "../components/Action.js";
import { Button } from "../components/Button.js";
import { Icon } from "../components/Icon.js";
import { Avatar, Header } from "../components/Layout.js";
import { DropdownMenu } from "../components/Overlay.js";
import { ButtonTabs, LazyTabs } from "../components/Tabs.js";
import { Tag } from "../components/Tag.js";
import { BackofficeLayout } from "../layouts/BackofficeLayout.js";
import { OPERATOR_DOCS_FIXTURES, type OperatorDocsFixture } from "./documentos-operadora/fixtures.js";
import { unitStatus } from "./documentos-operadora/model.js";
import { ProfessionalsTab } from "./documentos-operadora/ProfessionalsTab.js";
import { activeUnits, DocsProvider, useDocs } from "./documentos-operadora/store.js";
import { UnitsTab } from "./documentos-operadora/UnitsTab.js";

export const OPERATOR_DOCS_PATH = "/backoffice/operadoras/unimed";

const CURRENT_USER = {
  name: "Marcus Vinícius Gimenes",
  units: ["Unidade Teste", "Santana"],
  roles: [],
  professional: false,
};

const fixtureOf = (context: ScenarioContext): OperatorDocsFixture => {
  const data = context.data as OperatorDocsFixture | undefined;
  if (data) return data;
  const first = OPERATOR_DOCS_FIXTURES[0]!.data;
  return typeof first === "function" ? first() : first;
};

/** O cabeçalho da ficha, no slot `header` do `lazy_tabs`. */
function OperatorHeader({ canEdit }: { canEdit: boolean }) {
  const { state, setOperatorActive } = useDocs();
  const op = state.operator;
  const units = activeUnits(state);

  function toggleActive() {
    setOperatorActive(!op.active);
    showToast({ type: "success", title: "Sucesso!", content: `Operadora ${op.active ? "inativada" : "reativada"}.`, closeTime: 4000 });
  }

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <Avatar size="extra_large" />
        <div className="min-w-0 space-y-2 text-brand-purple-dark">
          <h1 className="text-2xl font-bold">{op.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Tag
              pill
              item={op.active ? "Ativa" : "Inativa"}
              variant={op.active ? "green" : "red"}
              className="whitespace-nowrap"
              icon={op.active ? "fa-solid fa-circle-check" : "fa-solid fa-circle-xmark"}
            />
            <Tag pill item={op.type} variant="dark-purple" className="whitespace-nowrap" />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <p>
              <Icon name="fa-hashtag" /> ANS {op.ans}
            </p>
            <p>
              <Icon name="fa-suitcase-medical" /> {op.services} serviços
            </p>
            <p>
              <Icon name="fa-users" /> {op.patients} pacientes
            </p>
            <p>
              <Icon name="fa-bullhorn" /> {op.guides} guias vigentes
            </p>
            <p>
              <Icon name="fa-hospital" /> {units.length ? units.map((u) => u.name).join(" · ") : "Sem unidade credenciada"}
            </p>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="shrink-0">
          <DropdownMenu
            id="health_care_header_dropdown"
            items={[
              <Button
                key="active"
                type="button"
                variant="ghost"
                leftIcon={op.active ? "fa-circle-xmark" : "fa-circle-check"}
                className={op.active ? "text-red" : undefined}
                onClick={toggleActive}
              >
                {op.active ? "Inativar operadora" : "Reativar operadora"}
              </Button>,
            ]}
          />
        </div>
      )}
    </div>
  );
}

/** A aba Documentos: o título com os totais e as duas listas em `button_tabs`. */
function DocumentsTab({ canEdit, initialScope }: { canEdit: boolean; initialScope: OperatorDocsFixture["scope"] }) {
  const { state } = useDocs();
  const opId = state.operator.id;
  const links = Object.values(state.links).filter((l) => l.opId === opId);
  const profActive = links.filter((l) => l.status === "active").length;
  const unitActive = state.units.filter((u) => unitStatus(u, opId).key === "active").length;

  return (
    <ButtonTabs
      id="operator_documents"
      className="flex-row-reverse flex-wrap-reverse gap-4"
      initialTab={initialScope === "units" ? 1 : 0}
      actions={
        <Header subtitle={`${profActive} de ${state.professionals.length} profissionais credenciados · ${unitActive} de ${state.units.length} ${state.units.length === 1 ? "unidade credenciada" : "unidades credenciadas"}`}>
          Documentos
        </Header>
      }
      tab={[
        { title: "Profissionais", content: <ProfessionalsTab canEdit={canEdit} /> },
        { title: "Unidades", content: <UnitsTab canEdit={canEdit} /> },
      ]}
    />
  );
}

function OperatorDocumentsScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  // `HealthCarePolicy.can?(role, :edit)`: admin e operation.
  const canEdit = context.can("health_cares.edit");

  return (
    <DocsProvider initial={fixture}>
      <BackofficeLayout
        context={context}
        currentPath={OPERATOR_DOCS_PATH}
        breadcrumbs={[{ label: "Operadoras", to: "/backoffice/operadoras" }, { label: fixture.operator.name }]}
        currentUser={CURRENT_USER}
        currentUnit="Unidade Teste"
      >
        <LazyTabs
          id="health_care_tabs"
          header={<OperatorHeader canEdit={canEdit} />}
          tabs={[{ id: "documents", title: "Documentos", component: <DocumentsTab canEdit={canEdit} initialScope={fixture.scope} /> }]}
        />
      </BackofficeLayout>
    </DocsProvider>
  );
}

export function OperatorDocuments({ context }: ScreenProps) {
  if (context.isLoading) return null;
  // A chave remonta a tela quando o cenário troca de fixture.
  return <OperatorDocumentsScreen key={context.fixture?.id ?? "default"} context={context} />;
}
