/**
 * Documentos da Operadora — nova aba da ficha da operadora no backoffice.
 * A aba é nova — não existe no Phoenix.
 *
 * No monólito, a ficha é `HealthCareLive.Show`: um `lazy_tabs` com o
 * `CardHeader` no slot `header`. Esta tela é o mesmo `lazy_tabs`, com o
 * `CardHeader` do HEEx e as abas reais; Documentos entra depois de Contratos.
 * As outras abas ficam só com um aviso, fora deste fluxo. Dentro de
 * Documentos, `button_tabs` separa Profissionais (credenciamento de cada um,
 * pelos documentos compartilhados) e Unidades (documentos obrigatórios de cada
 * unidade).
 */
import type { ScenarioContext, ScreenProps } from "@brucesantos/design-space";
import { LinkButton } from "../components/Action.js";
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
import { DocsProvider, useDocs } from "./documentos-operadora/store.js";
import { UnitsTab } from "./documentos-operadora/UnitsTab.js";

export const OPERATOR_DOCS_PATH = "/backoffice/operadoras/unimed";

/** O `tracker_id` do `button_tabs` de Documentos: `?documents_tab=operator_documents|<aba>`. */
export const DOCUMENTS_TRACKER = "documents_tab";
export const DOCUMENTS_TABS_ID = "operator_documents";

const CURRENT_USER = {
  name: "Marina Alves",
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

const pluralize = (word: string, count: number) => (count === 1 ? word : `${word}s`);

/** `HealthCareLive.Components.CardHeader`, no slot `header` do `lazy_tabs`. */
function CardHeader({ canEdit }: { canEdit: boolean }) {
  const { state } = useDocs();
  const op = state.operator;

  return (
    <div>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Avatar size="extra_large" />
          <div className="space-y-2">
            <h1 className="font-bold text-2xl">{op.name}</h1>

            <div className="flex gap-1.5 mt-2">
              <Tag item={`ANS: ${op.ans || "-"}`} variant="light-purple" className="rounded-full" icon="fa-hashtag" />
            </div>
            <div className="flex gap-5 mt-3 flex-wrap">
              <p>
                <Icon name="fa-briefcase" /> {`${op.planCount} ${pluralize("plano", op.planCount)} ${pluralize("ativo", op.planCount)}`}
              </p>

              <p>
                <Icon name="fa-phone" /> {op.phone || "-"}
              </p>
              <p>
                <Icon name="fa-envelope" /> {op.email || "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* O modal de Observações fica fora deste fluxo. */}
          <Button type="button" rightIcon="fa-notes" variant="tint" color="blue" notificationBadge={Boolean(op.observation)}>
            Observações
          </Button>

          <div className="flex flex-row gap-4">
            <div className="shrink-0">
              <DropdownMenu
                id="unit_header_dropdown"
                items={[
                  <LinkButton key="back" type="link" navigate="/backoffice/operadoras" leftIcon="fa-arrow-left" variant="ghost">
                    Voltar para lista
                  </LinkButton>,
                  canEdit && (
                    <Button key="delete" type="button" variant="ghost" className="text-red" leftIcon="fa-trash-alt">
                      Excluir Operadora
                    </Button>
                  ),
                ].filter(Boolean)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A aba Documentos: o título com os totais e as duas listas em `button_tabs`. */
function DocumentsTab({ canEdit }: { canEdit: boolean }) {
  const { state } = useDocs();
  const opId = state.operator.id;
  const links = Object.values(state.links).filter((l) => l.opId === opId);
  const profActive = links.filter((l) => l.status === "active").length;
  const unitActive = state.units.filter((u) => unitStatus(u, opId).key === "active").length;

  return (
    <ButtonTabs
      id={DOCUMENTS_TABS_ID}
      trackerId={DOCUMENTS_TRACKER}
      className="flex-row-reverse flex-wrap-reverse gap-4"
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

/** As abas que já existem no Phoenix: fora deste fluxo, ficam só com o aviso. */
function OtherTab({ title }: { title: string }) {
  return <p className="text-brand-purple-dark/60">{title}: aba existente no sistema, fora deste fluxo.</p>;
}

function OperatorDocumentsScreen({ context }: { context: ScenarioContext }) {
  const fixture = fixtureOf(context);
  // `HealthCarePolicy.can?(role, :edit)`: admin e operation.
  const canEdit = context.can("health_cares.edit");
  const other = (id: string, title: string, opts?: { card?: boolean }) => ({ id, title, component: <OtherTab title={title} />, opts });

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
          activeTab="documents"
          header={<CardHeader canEdit={canEdit} />}
          tabs={[
            other("health_care_data", "Dados da Operadora"),
            other("address", "Endereço"),
            other("plans", "Tipos de Planos"),
            other("contracts", "Contratos", { card: false }),
            { id: "documents", title: "Documentos", component: <DocumentsTab canEdit={canEdit} /> },
            { title: "Financeiro", tabs: [other("authorizations", "Autorizações"), other("invoices", "Faturamento")] },
            canEdit && other("audit", "Auditoria"),
            canEdit && other("users", "Usuários"),
          ]}
        />
      </BackofficeLayout>
    </DocsProvider>
  );
}

export function OperatorDocuments({ context }: ScreenProps) {
  if (context.isLoading) return null;
  // A chave remonta a tela quando o cenário troca: a aba de Documentos é lida da URL ao montar.
  return <OperatorDocumentsScreen key={`${context.scenario?.id ?? "-"}:${context.fixture?.id ?? "default"}`} context={context} />;
}
