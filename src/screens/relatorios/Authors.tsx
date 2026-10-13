/**
 * Relatórios do paciente — coautoria e assinaturas (`relatorios-autores.jsx`).
 * Novo — não existe no Phoenix: responsável e coautores editam o documento
 * inteiro; ao enviar para assinaturas o texto trava e cada autor assina em
 * qualquer ordem. As ações vêm de `useReports()` (`addCoauthor`,
 * `removeCoauthor`, `sign`, `requestChange`; `submitForSignature` é do editor).
 *
 * Exportado:
 *
 * - `CollabBar` (`RelCollabBar`): `report: Report`. Barra "Autores" no topo dos
 *   editores: chips dos autores, quem está editando agora (`report.editingNow`)
 *   ou a última alteração (`report.draft`), e o pedido de alteração pendente
 *   (`report.changeRequest`). Não renderiza nada sem autores.
 * - `AuthorsPanel` (`RelAuthorsPanel`): `report: Report`. Painel "Autores e
 *   assinaturas" da visualização: lista de autores com papel e conselho,
 *   assinaturas (assinar / pedir alteração durante "Aguardando assinaturas"),
 *   adicionar e remover coautor enquanto solicitado/em andamento. Vai dentro
 *   de um `FocusCard` sem título (o título é dele). Não renderiza nada em
 *   cancelado nem em tipo sem modelo.
 * - `AuthorAvatars` (`RfAuthors`): `report: Report`. Avatares empilhados e
 *   "Fulano editando", para a barra superior do editor.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { Avatar } from "../../components/Layout.js";
import { Tag } from "../../components/Tag.js";
import { REL_PROFS, relAuthors, relCouncil, relIsModel, signProgress, type Report } from "./model.js";
import { FocusCardTitle } from "./Focus.js";
import { Callout } from "./parts.js";
import { useReports } from "./store.js";

const first = (name: string) => name.split(" ")[0];

/** Ponto verde de "editando agora" (`ra-live`). Novo — não existe no Phoenix. */
function LiveDot() {
  return <span aria-hidden className="h-2 w-2 flex-none rounded-full bg-green ring-3 ring-green-light" />;
}

/** Avatares empilhados dos autores (`RfAuthors`). Novo — não existe no Phoenix. */
export function AuthorAvatars({ report: r }: { report: Report }) {
  const authors = relAuthors(r);
  if (!authors.length) return null;
  return (
    <div className="flex items-center" title={authors.map((a) => `${a.name} · ${a.role}`).join("\n")}>
      {authors.map((a, i) => (
        <Avatar key={a.id} size="custom" className={i ? "-ml-2 h-8 w-8 ring-2 ring-white" : "h-8 w-8 ring-2 ring-white"} title={a.name} />
      ))}
      {r.editingNow && (
        <span className="ml-2.5 hidden items-center gap-1.5 text-[12.5px] font-bold whitespace-nowrap text-brand-purple-dark/60 xl:inline-flex">
          <LiveDot />
          {`${first(r.editingNow)} editando`}
        </span>
      )}
    </div>
  );
}

/** Barra de coautoria no topo do editor (`RelCollabBar`). Novo — não existe no Phoenix. */
export function CollabBar({ report: r }: { report: Report }) {
  const authors = relAuthors(r);
  if (authors.length === 0) return null;
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-brand-purple-dark/10 px-3.5 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs font-black tracking-[0.04em] text-brand-purple-dark/55 uppercase">Autores</span>
        {authors.map((a) => (
          <span
            key={a.id}
            title={`${a.role} · ${a.specialty}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-purple-dark/5 py-0.5 pr-2.5 pl-0.5 text-[13px] font-bold text-brand-purple-dark"
          >
            <Avatar size="custom" className="h-6 w-6" title={a.name} />
            {first(a.name)}
          </span>
        ))}
      </div>
      <p className="flex items-center gap-2 text-[13px] text-brand-purple-dark/65">
        {r.editingNow ? (
          <>
            <LiveDot />
            {`${first(r.editingNow)} está editando agora. Salve com frequência para não sobrescrever as alterações.`}
          </>
        ) : r.draft ? (
          `Última alteração por ${r.draft.by} em ${r.draft.updatedAt}`
        ) : (
          "Todos os autores podem editar o documento inteiro."
        )}
      </p>
      {r.changeRequest && (
        <div className="mt-0.5">
          <Callout tone="warn" icon="fa-rotate-left">
            <strong>{`${r.changeRequest.by} pediu alteração:`}</strong> {r.changeRequest.reason}
          </Callout>
        </div>
      )}
    </div>
  );
}

/** Painel "Autores e assinaturas" da visualização (`RelAuthorsPanel`). Novo — não existe no Phoenix. */
export function AuthorsPanel({ report: r }: { report: Report }) {
  const { addCoauthor, removeCoauthor, sign, requestChange } = useReports();
  const [adding, setAdding] = useState("");
  const [change, setChange] = useState<{ id: string; reason: string } | null>(null);
  const authors = relAuthors(r);
  const sig = r.signatures ?? {};
  const st = r.status;
  const editable = st === "solicitado" || st === "em_andamento";
  const signing = st === "assinaturas";
  const showSigs = signing || st === "finalizado";
  const prog = signProgress(r);
  const available = REL_PROFS.filter((p) => !authors.some((a) => a.id === p.id));
  if (st === "cancelado" || !relIsModel(r)) return null;

  function addCo() {
    const p = REL_PROFS.find((x) => x.id === adding);
    if (!p) return;
    addCoauthor(r.id, p);
    setAdding("");
  }

  return (
    <div>
      <FocusCardTitle
        icon="fa-signature"
        chip={showSigs && prog.total > 0 && <Tag pill variant={prog.done === prog.total ? "green" : "orange"} item={`${prog.done} de ${prog.total} assinaturas`} />}
      >
        Autores e assinaturas
      </FocusCardTitle>

      {signing && (
        <div className="mb-3">
          <Callout tone="info" icon="fa-lock">
            Texto bloqueado para edição. O relatório é finalizado quando todos os autores assinarem, em qualquer ordem. Um pedido de alteração volta o relatório para edição e descarta as assinaturas feitas.
          </Callout>
        </div>
      )}
      {authors.length === 0 && <p className="text-[15px] font-medium text-brand-purple-dark/45 italic">Defina o profissional responsável para incluir autores.</p>}

      <div className="flex flex-col gap-2">
        {authors.map((a) => {
          const signed = sig[a.id];
          const isChanging = change?.id === a.id;
          return (
            <div
              key={a.id}
              className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-brand-purple-dark/10 px-3.5 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto]"
            >
              <Avatar size="custom" className="h-8 w-8" title={a.name} />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-brand-purple-dark">
                  {a.name}
                  <Tag pill variant={a.role === "Responsável" ? "light-blue" : "light-purple"} item={a.role} className="text-xs" />
                </p>
                <p className="mt-0.5 text-[12.5px] text-brand-purple-dark/60">{[a.specialty, relCouncil(a.id)].filter(Boolean).join(" · ")}</p>
                {isChanging && change && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="min-w-50 flex-1">
                      <Input
                        id={`pedido-alteracao-${a.id}`}
                        placeholder="O que precisa mudar?"
                        autoFocus
                        value={change.reason}
                        onChange={(event) => setChange({ ...change, reason: event.target.value })}
                      />
                    </div>
                    <Button type="button" variant="ghost" size="medium" onClick={() => setChange(null)}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="medium"
                      disabled={change.reason.trim().length < 3}
                      className="disabled:opacity-50"
                      onClick={() => {
                        requestChange(r.id, a.id, change.reason.trim());
                        setChange(null);
                      }}
                    >
                      Enviar pedido
                    </Button>
                  </div>
                )}
              </div>
              <div className="col-span-full flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
                {showSigs &&
                  (signed ? (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold whitespace-nowrap text-green-dark">
                      <Icon name="fa-circle-check" type="solid" />
                      {`Assinou em ${signed}`}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold whitespace-nowrap text-orange-dark">
                      <Icon name="fa-clock" />
                      Pendente
                    </span>
                  ))}
                {signing && !signed && !isChanging && (
                  <>
                    <Button type="button" size="medium" leftIcon="fa-rotate-left" iconType="solid" onClick={() => setChange({ id: a.id, reason: "" })}>
                      Pedir alteração
                    </Button>
                    <Button type="button" size="medium" variant="tint" leftIcon="fa-signature" iconType="solid" title={`Demonstração: assina como ${a.name}`} onClick={() => sign(r.id, a.id)}>
                      Assinar
                    </Button>
                  </>
                )}
                {editable && a.role === "Coautor" && (
                  <Button type="button" size="medium" variant="tint" color="red" title="Remover coautor" aria-label="Remover coautor" onClick={() => removeCoauthor(r.id, a.id)}>
                    <Icon name="fa-user-minus" type="solid" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editable && r.prof && available.length > 0 && (
        <div className="mt-2.5 flex max-w-[520px] items-start gap-2">
          <div className="flex-1">
            <Input
              id={`adicionar-coautor-${r.id}`}
              type="select"
              prompt="Adicionar coautor…"
              value={adding}
              options={available.map((p) => [`${p.name} · ${p.specialty}`, p.id] as const)}
              onChange={(v) => setAdding(v ?? "")}
            />
          </div>
          <Button type="button" variant="tint" rightIcon="fa-user-plus" iconType="solid" disabled={!adding} className="disabled:opacity-50" onClick={addCo}>
            Adicionar
          </Button>
        </div>
      )}
      {editable && authors.length > 1 && <p className="mt-2 text-[12.5px] text-brand-purple-dark/60">Todos os autores editam o documento inteiro e assinam o relatório.</p>}
    </div>
  );
}
