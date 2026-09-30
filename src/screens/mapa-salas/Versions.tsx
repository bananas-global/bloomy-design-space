/**
 * Mapa de Salas — as vigências do planejamento.
 *
 * O planejamento (o `plan` de todas as salas) tem versões com início e fim; o
 * mapa aplica a que estiver selecionada. Vigências não têm buracos: a nova
 * começa no dia seguinte ao fim da anterior, e a última se renova até existir
 * uma próxima.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { RadioGroup } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { Input, cx } from "../../components/Input.js";
import { Dropdown, DrawerModal } from "../../components/Overlay.js";
import { TODAY_DATE, addDays, fmtBR, parseISO, toISO, versionStatus, type Version } from "./model.js";
import { DRAWER_SIZE, DrawerFooter, Note, VersionTag, Warn } from "./parts.js";
import { useRoomsMap } from "./store.js";

const range = (v: Pick<Version, "start" | "end">) => `${fmtBR(v.start)} – ${fmtBR(v.end)}`;

/** O seletor de vigência ao lado de "Nova Sala". Novo — não existe no Phoenix: `dropdown` com os itens da tela. */
export function VersionDropdown() {
  const { versions, version, selectVersion, openModal, canEdit } = useRoomsMap();
  const sorted = [...versions].sort((a, b) => b.start.localeCompare(a.start));
  return (
    <Dropdown
      id="mapa-salas-vigencia"
      placement="bottom-end"
      dropdownClass="min-w-80"
      items={
        <div className="flex flex-col gap-0.5">
          {sorted.map((v) => {
            const sel = v.id === version.id;
            return (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={sel}
                className={cx(
                  "flex w-full items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-[13px] text-brand-purple-dark hover:bg-brand-blue/10",
                  sel ? "bg-brand-blue/14 font-extrabold" : "font-bold",
                )}
                onClick={() => selectVersion(v.id)}
              >
                <span className="w-4 flex-none text-center text-[11px] text-brand-blue">{sel && <Icon name="fa-check" type="solid" />}</span>
                <span className="flex-1 tabular-nums">
                  {range(v)}
                  {v.autoRenew && (
                    <em className="ml-2 text-[11px] font-bold not-italic text-brand-purple-dark/45">
                      <Icon name="fa-rotate" type="solid" /> renova
                    </em>
                  )}
                </span>
                <VersionTag status={versionStatus(v)} />
              </button>
            );
          })}
          {canEdit && (
            <button
              type="button"
              className="mt-1 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-100 px-2.5 py-2 text-[13px] font-extrabold text-brand-blue hover:bg-brand-blue/10"
              onClick={() => openModal({ kind: "version" })}
            >
              <Icon name="fa-plus" type="solid" /> Nova vigência
            </button>
          )}
        </div>
      }
    >
      <span
        title="Vigência do planejamento"
        className="inline-flex h-12 items-center gap-2.5 whitespace-nowrap rounded-lg border border-neutral-100 bg-white px-3.5 text-sm font-extrabold text-brand-purple-dark transition-colors hover:border-brand-blue hover:bg-brand-blue/8"
      >
        <span className="inline-flex items-center gap-2 tabular-nums">
          {range(version)}
          <VersionTag status={versionStatus(version)} />
        </span>
        <Icon name="fa-chevron-down" type="solid" className="text-[10px] text-brand-purple-dark/50" />
      </span>
    </Dropdown>
  );
}

/** "A partir de quando vale?": publica o rascunho da vigência em curso. */
export function PublishDrawer() {
  const { version, draft, publishDraft, closeModal } = useRoomsMap();
  const today = toISO(TODAY_DATE);
  const min = today > version.start ? today : version.start;
  const [mode, setMode] = useState<"today" | "date">("today");
  const [date, setDate] = useState(toISO(addDays(TODAY_DATE, 7)));
  const [end, setEnd] = useState(version.end);
  const n = draft?.n ?? 0;
  const start = mode === "today" ? min : date;
  const err =
    mode === "date" && (!date || date < min)
      ? `O início precisa ser a partir de ${fmtBR(min)}.`
      : start > version.end
        ? `O início precisa estar dentro da vigência (até ${fmtBR(version.end)}).`
        : !end || end < start
          ? "O fim precisa ser igual ou depois do início."
          : end > version.end
            ? `O fim não pode passar do fim da vigência (${fmtBR(version.end)}).`
            : null;
  const partial = !err && end < version.end;

  return (
    <DrawerModal id="mapa-salas-publicar" show onCancel={closeModal} variant="custom" customSize={DRAWER_SIZE} contentClass="flex flex-col" title="A partir de quando vale?">
      <div className="flex flex-1 flex-col gap-6">
        <p className="text-sm text-brand-purple-dark/60 text-pretty">
          {n} {n > 1 ? "alterações" : "alteração"} no padrão em vigência ({range(version)}). A vigência atual termina no dia anterior ao início e a nova versão vale
          no período escolhido.
        </p>
        <RadioGroup
          label="Início"
          field={{ id: "mapa-salas-publicar-quando", name: "publicar[quando]", value: mode }}
          wrapperClass="flex flex-wrap gap-2 space-x-0!"
          radio={[
            { value: "today", label: `Hoje · ${fmtBR(min)}` },
            { value: "date", label: "Outra data" },
          ]}
          onChange={(e) => setMode(e.target.value as "today" | "date")}
        />
        <div className="grid grid-cols-2 items-start gap-3">
          {mode === "date" ? (
            <Input id="mapa-salas-publicar-inicio" type="date" label="Início da nova versão" value={date} onChange={(e) => setDate(e.target.value)} />
          ) : (
            <Input id="mapa-salas-publicar-inicio" type="date" label="Início da nova versão" value={min} disabled />
          )}
          <Input id="mapa-salas-publicar-fim" type="date" label="Fim da nova versão" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        {partial && (
          <Note>
            De {fmtBR(toISO(addDays(parseISO(end), 1)))} a {fmtBR(version.end)} volta o padrão atual, sem buracos entre vigências.
          </Note>
        )}
        {err && <Warn>{err}</Warn>}
      </div>
      <DrawerFooter>
        <Button type="button" variant="ghost" color="red" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" disabled={Boolean(err)} className="disabled:opacity-50" onClick={() => publishDraft(start, end)}>
          Publicar padrão
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}

/** "Nova vigência": começa no dia seguinte à última, em branco ou copiando outra. */
export function NewVersionDrawer() {
  const { versions, version, createVersion, closeModal } = useRoomsMap();
  const last = [...versions].sort((a, b) => b.end.localeCompare(a.end))[0];
  const start = last ? toISO(addDays(parseISO(last.end), 1)) : toISO(TODAY_DATE);
  const [end, setEnd] = useState(toISO(addDays(parseISO(start), 180)));
  const [copyFrom, setCopyFrom] = useState(version.id);
  const clash = versions.find((v) => start <= v.end && v.start <= end);
  const err = !start || !end
    ? "Informe início e fim da vigência."
    : start > end
      ? "O fim da vigência deve ser posterior ao início."
      : clash
        ? `Sobrepõe a vigência ${range(clash)}.`
        : null;

  return (
    <DrawerModal id="mapa-salas-nova-vigencia" show onCancel={closeModal} variant="custom" customSize={DRAWER_SIZE} contentClass="flex flex-col" title="Nova vigência">
      <div className="flex flex-1 flex-col gap-6">
        <p className="text-sm text-brand-purple-dark/60 text-pretty">
          Uma vigência é uma versão do planejamento de todas as salas da unidade. O mapa aplica a versão que cobre cada data.
        </p>
        <div className="grid grid-cols-2 items-start gap-4">
          <div>
            <Input id="mapa-salas-nova-vigencia-inicio" type="date" label="Início" value={start} disabled />
            <p className="mt-1 text-xs font-semibold text-brand-purple-dark/50">Dia seguinte ao fim da última vigência</p>
          </div>
          <Input id="mapa-salas-nova-vigencia-fim" type="date" label="Fim" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <Input
          id="mapa-salas-nova-vigencia-copia"
          type="select"
          label="Planejamento inicial"
          prompt="Começar em branco"
          value={copyFrom}
          options={[...versions]
            .sort((a, b) => b.start.localeCompare(a.start))
            .map((v): [string, string] => [`Copiar de ${range(v)} (${versionStatus(v).label.toLowerCase()})`, v.id])}
          onChange={(v) => setCopyFrom(v ?? "")}
        />
        {err && <Warn>{err}</Warn>}
        <Note>Vigências não têm buracos: a nova começa no dia seguinte à anterior. A última se renova automaticamente até existir uma próxima.</Note>
      </div>
      <DrawerFooter>
        <Button type="button" variant="ghost" color="red" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" disabled={Boolean(err)} className="disabled:opacity-50" onClick={() => createVersion({ start, end, copyFrom })}>
          Criar vigência
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
