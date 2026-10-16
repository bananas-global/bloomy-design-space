/**
 * CRM de Leads — o painel do negócio, aberto no lugar da lista (breadcrumb
 * Leads › nome). Substitui o modal de cinco abas do Phoenix
 * (`prospect_modal.ex`) por três camadas, uma por papel: Negócio (Comercial),
 * Visita (Coordenação) e Autorização (Orçamentista), mais o Histórico.
 *
 * O avanço fica no rodapé e só libera quando o checklist da etapa está
 * completo; o seletor de etapa do cabeçalho faz o ajuste manual. Um negócio
 * existente salva sozinho a cada alteração; um novo é rascunho e salva ao
 * fechar.
 */
import { useEffect, useRef, useState } from "react";
import { Button } from "../../components/Button.js";
import { Card } from "../../components/Card.js";
import { Icon } from "../../components/Icon.js";
import { Input, Label } from "../../components/Input.js";
import { Tag } from "../../components/Tag.js";
import { AutorizacaoTab } from "./AutorizacaoTab.js";
import { HistoricoTab } from "./HistoricoTab.js";
import {
  LOST_REASONS, OWNERS, ROLES, STAGES, autoRoute, checkItem, daysInStage, disqualifyReason, guardianOf, hoursOf, moveLead, operatorName, pendingOf, stageOf,
  type Lead, type StageId, type TabId,
} from "./model.js";
import { NegocioTab } from "./NegocioTab.js";
import { DISABLED, DealTabs, Initials, StageMenu, opts } from "./parts.js";
import { VisitaTab } from "./VisitaTab.js";

/** A aba de quem está com a vez na etapa. */
export const tabOfStage = (status: string): TabId => {
  const s = stageOf(status);
  return s ? ROLES[s.role].tab : "negocio";
};

type SaveState = "idle" | "saving" | "saved";

export function DealPage({
  lead: initial, isNew, tab, onTab, onPatch, onCreate, onClose, onConvert, onTitle,
}: {
  lead: Lead;
  isNew: boolean;
  tab: TabId;
  onTab: (t: TabId) => void;
  onPatch: (l: Lead) => void;
  onCreate: (l: Lead) => void;
  onClose: () => void;
  onConvert: (l: Lead) => void;
  /** O nome que vai no breadcrumb, acompanhando o que se digita. */
  onTitle: (title: string) => void;
}) {
  const [f, setF] = useState(initial);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [losing, setLosing] = useState(false);
  const [lostReason, setLostReason] = useState(initial.lostReason);
  const current = useRef(f);
  current.current = f;
  const dirty = useRef(false);

  // Autosave: 700 ms depois da última alteração, como o `phx-debounce`.
  useEffect(() => {
    if (isNew || !dirty.current) return;
    setSaveState("saving");
    const t = setTimeout(() => { onPatch(current.current); dirty.current = false; setSaveState("saved"); }, 700);
    return () => clearTimeout(t);
  }, [f]); // eslint-disable-line react-hooks/exhaustive-deps

  const up = (patch: Partial<Lead>) => {
    dirty.current = true;
    setF((s) => ({ ...s, ...patch }));
  };

  function move(to: StageId, extra: Partial<Lead> = {}) {
    dirty.current = true;
    setF((s) => moveLead(s, to, extra));
  }

  /** Fechar: o rascunho novo é salvo se tiver nome da criança ou do responsável; um existente salva o que estiver pendente. */
  function close() {
    const cur = current.current;
    if (isNew) {
      if (cur.child.trim() || guardianOf(cur).name.trim()) onCreate(autoRoute(cur));
      else onClose();
      return;
    }
    if (dirty.current) onPatch(cur);
    onClose();
  }

  const title = f.child.trim() || (isNew ? "Novo negócio" : "Sem nome");
  useEffect(() => onTitle(title), [title]); // eslint-disable-line react-hooks/exhaustive-deps

  // O breadcrumb "Leads" fecha pelo mesmo caminho.
  useEffect(() => {
    const h = () => close();
    window.addEventListener("crm:close-deal", h);
    return () => window.removeEventListener("crm:close-deal", h);
  });

  const stage = stageOf(f.status);
  const idx = STAGES.findIndex((s) => s.id === f.status);
  const next = idx >= 0 ? STAGES[idx + 1] : undefined;
  const pending = pendingOf(f);
  const days = daysInStage(f);
  const g = guardianOf(f);
  const stillOut = disqualifyReason(f);

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col lg:min-h-[calc(100vh-9rem)]">
      <Card className="p-0!">
        <div className="flex flex-col gap-6 p-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex items-start gap-5">
            <Initials name={f.child || "?"} />
            <div className="min-w-0 space-y-2">
              <h1 className="text-3xl font-extrabold text-brand-purple-dark">{title}</h1>
              <div className="flex flex-wrap gap-2">
                {stage && <Tag item={`Com: ${ROLES[stage.role].label}`} variant="dark-blue" leftIcon="fa-circle-play" pill />}
                {stage && <Tag item={`${days === 1 ? "1 dia" : `${days} dias`} na etapa · SLA ${stage.sla}d`} variant={days > stage.sla ? "red" : "dark-purple"} leftIcon="fa-stopwatch" pill />}
                {stage && pending.length > 0 && <Tag item={pending.length === 1 ? "falta 1 item" : `faltam ${pending.length} itens`} variant="orange" leftIcon="fa-list-check" pill />}
                {f.status === "perdido" && f.lostReason && <Tag item={f.lostReason} variant="red" leftIcon="fa-circle-xmark" pill />}
                {f.status === "desqualificado" && <Tag item={f.disqualReason || stillOut || "Não preenche os critérios"} variant="dark-purple" leftIcon="fa-ban" pill />}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-brand-purple-dark/70">
                <Meta icon="fa-cake-candles">{f.age ? `${f.age} anos` : "Idade não informada"}</Meta>
                {g.name && <Meta icon="fa-user">{g.name}{g.relation ? ` (${g.relation.toLowerCase()})` : ""}</Meta>}
                <Meta icon="fa-building">{operatorName(f)}</Meta>
                <Meta icon="fa-location-dot">{f.prefUnit || "Unidade não definida"}</Meta>
                <Meta icon="fa-clock">{hoursOf(f)}h semanais</Meta>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label className="mb-2 text-xs uppercase tracking-widest">Etapa</Label>
              <StageMenu lead={f} onMove={(to) => move(to)} />
            </div>
            <Input
              type="select"
              id="deal-owner"
              name="owner"
              label="Responsável pelo negócio"
              prompt="Sem responsável"
              options={opts(OWNERS)}
              value={f.owner}
              className="min-w-56 [&_label]:text-xs [&_label]:uppercase [&_label]:tracking-widest"
              onChange={(v) => up({ owner: v ?? "" })}
            />
            {!isNew && f.status !== "perdido" && f.status !== "desqualificado" && (
              <Button type="button" variant={f.status === "aguardando" ? "default" : "tint"} color={f.status === "aguardando" ? "green" : "blue"} rightIcon="fa-user-check" onClick={() => { if (dirty.current) onPatch(current.current); onConvert(current.current); }}>
                Efetivar paciente
              </Button>
            )}
          </div>
        </div>

        <DealTabs lead={f} value={tab} onChange={onTab} />
      </Card>

      <div className="mt-6 flex-1">
        {tab === "negocio" && <NegocioTab lead={f} up={up} goTab={onTab} />}
        {tab === "visita" && <VisitaTab lead={f} up={up} move={move} />}
        {tab === "autorizacao" && <AutorizacaoTab lead={f} up={up} move={move} goTab={onTab} />}
        {tab === "historico" && <HistoricoTab lead={f} up={up} />}
      </div>

      <footer className="sticky bottom-0 z-30 -mx-4 -mb-4 mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 bg-white px-4 py-3.5 shadow-main lg:-mx-8 lg:-mb-8 lg:px-8">
        {losing ? (
          <>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-brand-purple-dark">Motivo da perda</span>
              <Input type="select" id="deal-lost-reason" name="lost_reason" prompt="Selecionar" options={opts(LOST_REASONS)} value={lostReason} className="min-w-64" onChange={(v) => setLostReason(v ?? "")} />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="tint" onClick={() => setLosing(false)}>Cancelar</Button>
              <Button type="button" color="red" disabled={!lostReason} className={DISABLED} onClick={() => { move("perdido", { lostReason }); setLosing(false); }}>Confirmar perda</Button>
            </div>
          </>
        ) : (
          <>
            <Button type="button" variant="tint" onClick={close}>Fechar</Button>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold text-brand-purple-dark/60">
                {saveState === "saving" ? <><Icon name="fa-circle-notch" className="mr-1.5 animate-spin" />Salvando...</> : saveState === "saved" ? <><Icon name="fa-check" className="mr-1.5 text-green" />Salvo</> : isNew ? "Rascunho, salva ao fechar" : ""}
              </span>
              {f.status === "desqualificado" && (
                <Button type="button" variant="tint" rightIcon="fa-rotate-left" disabled={!!stillOut} title={stillOut ? `Ainda não preenche: ${stillOut}` : undefined} className={DISABLED} onClick={() => move("novo", { disqualReason: "" })}>
                  Requalificar
                </Button>
              )}
              {f.status !== "perdido"
                ? <Button type="button" variant="tint" color="red" onClick={() => setLosing(true)}>Marcar perdido</Button>
                : <Button type="button" variant="tint" rightIcon="fa-rotate-left" onClick={() => move("novo", { lostReason: "" })}>Reabrir</Button>}
              {stage && next && (
                <Button
                  type="button"
                  rightIcon="fa-arrow-right"
                  disabled={pending.length > 0}
                  title={pending.length ? `Pendente: ${pending.map((id) => checkItem(id).label).join(", ")}` : undefined}
                  className={DISABLED}
                  onClick={() => move(next.id)}
                >
                  Avançar
                </Button>
              )}
            </div>
          </>
        )}
      </footer>
    </div>
  );
}

function Meta({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5">
      <Icon name={icon} className="text-brand-purple-dark/40" />
      {children}
    </p>
  );
}
