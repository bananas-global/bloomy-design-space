/**
 * O painel do lead na fila, num `drawer_modal`: o cruzamento da semana, os
 * horários por especialidade, o pedido e o responsável comercial. No rodapé,
 * Desistiu (vai para Perdido) e Encaixar / Voltar ao funil.
 *
 * Componentes do sistema: `drawer_modal`, `avatar`, `tag`, `button`, `icon`.
 * Feito na tela (componente novo): a grade da semana e a barra de horas por
 * especialidade, que tem duas partes (hoje e previsto) e o `progress/1` não tem.
 */
import type { ReactNode } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Avatar } from "../../components/Layout.js";
import { DrawerModal } from "../../components/Overlay.js";
import { Tag } from "../../components/Tag.js";
import { SemanaGrid } from "./SemanaGrid.js";
import {
  DIAS, FONTES, PROF, STATUS, br, curto, disponibilidadeTxt, etapaFunil, faixaTxt, hh, juntar, livresForaDaFamilia, parentesco, quando, statusTxt,
  type Avaliacao, type Linha, type Pedido, type Pin,
} from "./model.js";

export function EncaixeTag({ ev }: { ev: Avaliacao }) {
  const s = STATUS[ev.status];
  return <Tag item={statusTxt(ev)} variant={s.tag} pill leftIcon={`fa-solid ${s.icon}`} className="whitespace-nowrap text-xs!" />;
}

function Bloco({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-brand-purple-dark">{title}</h4>
        {action}
      </div>
      {children}
    </section>
  );
}

function Dado({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "col-span-2 min-w-0" : "min-w-0"}>
      <dt className="text-xs font-extrabold text-brand-purple-dark/60">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-brand-purple-dark">{children}</dd>
    </div>
  );
}

/** Horas de hoje e previstas de uma especialidade, com de onde vem cada hora. */
function EspecialidadeBloco({ r, s }: { r: Linha; s: Pedido }) {
  const need = Number(s.hours) || 0;
  const nowR = r.nowR.filter((g) => g.spec === s.spec), futR = r.futR.filter((g) => g.spec === s.spec);
  const soma = (l: typeof nowR) => l.reduce((n, g) => n + (g.to - g.from), 0);
  const now = soma(nowR), fut = soma(futR);
  const list = [...nowR, ...futR];
  const pct = (n: number) => `${need ? Math.min(100, (n / need) * 100) : 0}%`;
  let fora: { name: string; from: number; to: number; at: string | null; days: string[] }[] = [];
  if (!list.length) {
    const grp: Record<string, (typeof fora)[number]> = {};
    livresForaDaFamilia(r, s.spec).forEach((w) => {
      const k = `${w.prof}|${w.from}|${w.to}|${w.at || ""}`;
      (grp[k] ??= { name: PROF[w.prof]!.name, from: w.from, to: w.to, at: w.at, days: [] }).days.push(DIAS[w.day]!);
    });
    fora = Object.values(grp).sort((a, b) => (a.at || "").localeCompare(b.at || ""));
  }
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-brand-purple-dark/10 px-4 py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2.5">
        <span className="text-sm font-extrabold text-brand-purple-dark">{s.spec}</span>
        <span className="text-xs font-extrabold tabular-nums text-brand-purple-dark/70">{`${now} de ${need}h hoje${fut ? ` · +${fut}h previstas` : ""}`}</span>
      </div>
      <div className="flex h-1.5 overflow-hidden rounded-full bg-brand-purple-dark/10" aria-hidden="true">
        <i className="block h-full bg-green" style={{ width: pct(now) }} />
        <i
          className="block h-full"
          style={{ width: pct(Math.min(fut, need - now)), background: "repeating-linear-gradient(135deg,var(--color-blue) 0 3px,color-mix(in srgb,var(--color-blue) 40%,#fff) 3px 6px)" }}
        />
      </div>
      {list.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {list.map((g, i) => (
            <li key={i} className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-brand-purple-dark">
                <b className="min-w-24 font-extrabold tabular-nums">{faixaTxt(g)}</b>
                <span className="font-semibold">{PROF[g.pid]!.name}</span>
                {g.ahead > 0 && <Tag item={`${g.ahead} à frente na fila`} variant="dark-purple" pill title="Leads que chegaram antes e também cabem neste horário" className="text-xs!" />}
              </div>
              <div className={`flex items-center gap-1.5 pl-[106px] text-xs font-bold ${g.at ? "text-blue-dark" : "text-brand-purple-dark/60"}`}>
                <Icon name={FONTES[g.source].icon} type="solid" />
                {g.at ? `${FONTES[g.source].label} · a partir de ${br(g.at)}` : FONTES[g.source].label}
              </div>
            </li>
          ))}
        </ul>
      ) : fora.length > 0 ? (
        <div>
          <p className="mb-1.5 text-xs font-bold text-brand-purple-dark/70">Horas livres na especialidade, fora da disponibilidade da família:</p>
          <ul className="flex flex-col gap-1">
            {fora.map((o, i) => (
              <li key={i} className="text-sm font-semibold text-brand-purple-dark/70">
                <b className="mr-2 font-extrabold text-brand-purple-dark">{`${juntar(o.days)} ${hh(o.from)}–${hh(o.to)}`}</b>
                {`${curto(o.name)}${o.at ? ` · a partir de ${br(o.at)}` : ""}`}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-xs font-semibold text-brand-purple-dark/60">Nenhum profissional de {s.spec} com hora livre nesta unidade.</p>
      )}
    </div>
  );
}

export function PainelLead({
  r,
  show,
  onClose,
  onEdit,
  onRelease,
  onMove,
  onReset,
  onUnitMoves,
}: {
  r: Linha | null;
  show: boolean;
  onClose: () => void;
  onEdit: () => void;
  onRelease: (kind: "lost" | "fit") => void;
  onMove: (from: { spec: string; day: number; h: number }, to: Pin) => void;
  onReset: () => void;
  /** Leva às Movimentações do Mapa da Unidade. */
  onUnitMoves: () => void;
}) {
  const specs = r ? r.specialties.filter((s) => s.spec && Number(s.hours) > 0) : [];
  return (
    <DrawerModal
      id="fila-lead"
      show={show && !!r}
      variant="custom"
      customSize="max-w-[640px] rounded-l-none!"
      headerClass="items-start"
      contentClass="flex flex-col p-0!"
      onCancel={onClose}
      customTitle={{
        className: "flex items-start gap-3 min-w-0",
        children: r && (
          <>
            <Avatar size="medium" />
            <div className="min-w-0">
              <p className="text-xl font-extrabold text-brand-purple-dark">
                {r.child}
                <span className="ml-2 text-sm font-bold text-brand-purple-dark/60">{`${r.age} anos · ${r.pos}º na fila`}</span>
              </p>
              <p className="mt-0.5 text-sm font-semibold text-brand-purple-dark/60">{`${r.guardian}${parentesco(r)} · ${r.phone}`}</p>
              <div className="mt-2 flex items-center gap-2">
                <EncaixeTag ev={r.ev} />
                <Button variant="ghost" size="small" leftIcon="fa-pen" onClick={onEdit} title="Editar pedido">
                  Editar pedido
                </Button>
              </div>
            </div>
          </>
        ),
      }}
    >
      {r && (
        <>
          <div className="flex-1 space-y-6 p-6">
            <Bloco
              title="Cruzamento da semana"
              action={
                r.ev.status !== "full" && (
                  <button type="button" onClick={onUnitMoves} className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-blue-dark">
                    <Icon name="fa-right-left" type="solid" />
                    Ver no Mapa da Unidade
                  </button>
                )
              }
            >
              <SemanaGrid r={r} onMove={onMove} onReset={onReset} />
            </Bloco>
            <Bloco title="Horários por especialidade">
              {specs.map((s) => (
                <EspecialidadeBloco key={s.spec} r={r} s={s} />
              ))}
            </Bloco>
            <Bloco title="Pedido">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Dado label="Unidade preferida">{r.unit}</Dado>
                <Dado label="Disponibilidade da família">{disponibilidadeTxt(r.availability)}</Dado>
                <Dado label="Motivo da espera">{r.reason || "—"}</Dado>
                <Dado label="Entrou na fila">{`${br(r.enteredAt)} · vindo da etapa ${etapaFunil(r.fromStatus)}`}</Dado>
                {r.notes ? <Dado label="Observação" wide>{r.notes}</Dado> : null}
              </dl>
            </Bloco>
            <Bloco title="Responsável comercial">
              <div className="flex items-center gap-3">
                <Avatar size="medium" />
                <div>
                  <p className="text-sm font-extrabold text-brand-purple-dark">{r.owner}</p>
                  <p className="text-xs font-semibold text-brand-purple-dark/60">
                    {r.notifiedAt ? `Aviso de encaixe enviado no sino e na Home ${quando(r.notifiedAt)}` : "Recebe aviso no sino e na Home quando surgir encaixe"}
                  </p>
                </div>
              </div>
            </Bloco>
          </div>
          <div className="sticky bottom-0 border-t border-neutral-100 bg-white px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <Button variant="tint" color="red" title="Lead desistiu da espera · vai para Perdido" onClick={() => onRelease("lost")}>
                Desistiu
              </Button>
              <Button title={r.fitNow ? "Encaixar e voltar ao funil" : "Voltar ao funil"} rightIcon="fa-arrow-right" onClick={() => onRelease("fit")}>
                {r.fitNow ? "Encaixar" : "Voltar ao funil"}
              </Button>
            </div>
          </div>
        </>
      )}
    </DrawerModal>
  );
}
