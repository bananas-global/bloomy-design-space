/**
 * Mapa de Salas — a sub-aba Bloqueios (`unit_room_schedule_blocking.ex`).
 *
 * A tabela do Phoenix com os filtros do protótipo (sala, tipo e período no
 * lugar do ano), a gaveta de novo bloqueio e o modal de detalhes
 * (`unit_room_schedule_blocking_modal`).
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { DrawerModal, Modal } from "../../components/Overlay.js";
import { Table } from "../../components/Table.js";
import { BLOCKING_TYPES, blockingTypeLabel, type BlockingType, type RoomBlocking } from "./model.js";
import { DRAWER_SIZE, DrawerFooter, Note, Warn } from "./parts.js";
import { useRoomsMap } from "./store.js";

type Filters = { room: string; type: string; from: string; to: string };
const EMPTY: Filters = { room: "", type: "", from: "", to: "" };

/** "dd/mm/aaaa[ hh:mm]" → "aaaa-mm-dd", para comparar com o período. */
const iso = (s: string) => (s ? `${s.slice(6, 10)}-${s.slice(3, 5)}-${s.slice(0, 2)}` : "");
/** "aaaa-mm-dd" → "dd/mm/aaaa". */
const br = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : "");

export function BlockingsPanel() {
  const { blockings, rooms, canEdit, openModal, removeBlocking } = useRoomsMap();
  const [f, setF] = useState<Filters>(EMPTY);
  const up = (k: keyof Filters, v: string) => setF((p) => ({ ...p, [k]: v }));
  const roomOpts = [...new Set(blockings.map((b) => b.room).concat(rooms.map((x) => x.name)))].map((n): [string, string] => [n, n]);
  const rows = blockings.filter(
    (b) => (!f.room || b.room === f.room) && (!f.type || b.type === f.type) && (!f.from || iso(b.end) >= f.from) && (!f.to || iso(b.start) <= f.to),
  );
  const anyF = Boolean(f.room || f.type || f.from || f.to);

  return (
    <div>
      <div className="grid grid-cols-1 items-end gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Input id="bloqueios-sala" type="select" label="Sala" prompt="Todas" value={f.room} options={roomOpts} onChange={(v) => up("room", v ?? "")} />
        <Input id="bloqueios-tipo" type="select" label="Tipo" prompt="Todos" value={f.type} options={BLOCKING_TYPES} onChange={(v) => up("type", v ?? "")} />
        <Input id="bloqueios-de" type="date" label="De" value={f.from} onChange={(e) => up("from", e.target.value)} />
        <Input id="bloqueios-ate" type="date" label="Até" value={f.to} onChange={(e) => up("to", e.target.value)} />
        {anyF && (
          <div>
            <Button type="button" variant="ghost" color="red" onClick={() => setF(EMPTY)}>
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      <div className="mt-8">
        <Table
          id="unit_room_schedule_blockigs_list"
          rows={rows}
          rowId={(b) => b.id}
          emptyMessage={anyF ? "Nenhum bloqueio encontrado com esses filtros" : "Não existe nenhum bloqueio de sala"}
          col={[
            { label: "Salas", render: (b) => b.room },
            { label: "Número", render: (b) => b.number },
            { label: "Nome", render: (b) => b.name || "Não informado" },
            { label: "Tipo", render: (b) => blockingTypeLabel(b.type) },
            { label: "De", render: (b) => b.start },
            { label: "Até", render: (b) => b.end },
            {
              label: "Ações",
              render: (b) => (
                <>
                  <button type="button" onClick={() => openModal({ kind: "blockingInfo", id: b.id })}>
                    <Icon name="fa-circle-info" className="h-2 w-2 text-neutral-800 mr-4" />
                  </button>
                  {canEdit ? (
                    <button className="text-red" type="button" title="Remover bloqueio" onClick={() => removeBlocking(b.id)}>
                      <Icon name="fa-trash" />
                    </button>
                  ) : (
                    <button className="text-neutral-400 cursor-not-allowed" disabled type="button" title="Sem permissão para remover">
                      <Icon name="fa-trash" />
                    </button>
                  )}
                </>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

/** `unit_room_schedule_blocking_modal/1`: os detalhes do bloqueio. */
export function BlockingInfoModal({ blocking }: { blocking: RoomBlocking }) {
  const { closeModal } = useRoomsMap();
  return (
    <Modal id={`step-blocking-${blocking.id}`} show onCancel={closeModal} title="Bloqueio de sala">
      <div className="space-y-4">
        <div>
          <p className="text-blue font-bold">Tipo de bloqueio</p>
          <div>{blockingTypeLabel(blocking.type)}</div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-blue font-bold">Bloqueio de</p>
            <div>{blocking.start}</div>
          </div>

          <div className="flex-1">
            <p className="text-blue font-bold">Até</p>
            <div>{blocking.end}</div>
          </div>
        </div>

        <div>
          <p className="text-blue font-bold">Nome</p>
          <div>{blocking.name}</div>
        </div>

        <div>
          <p className="text-blue font-bold">Observação</p>
          <div>{blocking.obs || "—"}</div>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Novo bloqueio. Sem data final, é um bloqueio de um dia só; horário
 * específico vale nesse horário em cada dia do período.
 */
export function BlockingDrawer() {
  const { rooms, addBlocking, closeModal } = useRoomsMap();
  const [form, setForm] = useState({ roomId: "", type: "time_period" as BlockingType, name: "", dFrom: "", dTo: "", hFrom: "", hTo: "", obs: "" });
  const up = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((p) => ({ ...p, [k]: v }));
  const slot = form.type === "slot";
  const dTo = form.dTo || form.dFrom;
  const err =
    form.dTo && form.dTo < form.dFrom
      ? "A data final precisa ser igual ou depois da inicial."
      : slot && form.hFrom && form.hTo && form.hTo <= form.hFrom
        ? "O horário final precisa ser depois do inicial."
        : null;
  const valid = Boolean(form.roomId && form.dFrom && (!slot || (form.hFrom && form.hTo)) && !err);
  const when = dTo === form.dFrom ? `Só em ${br(form.dFrom)}` : `De ${br(form.dFrom)} a ${br(dTo)}`;
  const hours = slot ? (form.hFrom && form.hTo ? `, das ${form.hFrom} às ${form.hTo}${dTo === form.dFrom ? "" : " em cada dia"}` : ", no horário escolhido") : ", dia inteiro";

  return (
    <DrawerModal id="unit_room_schedule_blocking_modal" show onCancel={closeModal} variant="custom" customSize={DRAWER_SIZE} contentClass="flex flex-col" title="Novo bloqueio">
      <div className="flex flex-1 flex-col gap-6">
        <Input
          id="bloqueio-sala"
          type="select"
          label="Sala"
          prompt="Selecionar"
          value={form.roomId}
          options={rooms.map((r): [string, string] => [`${r.number} - ${r.name}`, r.id])}
          onChange={(v) => up("roomId", v ?? "")}
        />
        <Input
          id="bloqueio-tipo"
          type="select"
          label="Tipo de bloqueio"
          clear={false}
          value={form.type}
          options={BLOCKING_TYPES}
          onChange={(v) => v && up("type", v as BlockingType)}
        />
        <Input id="bloqueio-nome" label="Nome" placeholder="Motivo do bloqueio" value={form.name} onChange={(e) => up("name", e.target.value)} />
        <div className="grid grid-cols-2 items-start gap-4">
          <Input id="bloqueio-data-inicial" type="date" label="Data inicial" value={form.dFrom} onChange={(e) => up("dFrom", e.target.value)} />
          <Input id="bloqueio-data-final" type="date" label="Data final (opcional)" value={form.dTo} onChange={(e) => up("dTo", e.target.value)} />
        </div>
        {slot && (
          <div className="grid grid-cols-2 items-start gap-4">
            <Input id="bloqueio-hora-inicial" type="time" label="Hora inicial" value={form.hFrom} onChange={(e) => up("hFrom", e.target.value)} />
            <Input id="bloqueio-hora-final" type="time" label="Hora final" value={form.hTo} onChange={(e) => up("hTo", e.target.value)} />
          </div>
        )}
        {form.dFrom && !err && <Note>{`${when}${hours}.`}</Note>}
        {err && <Warn>{err}</Warn>}
        <Input id="bloqueio-observacao" type="textarea" label="Observação" rows={3} value={form.obs} onChange={(e) => up("obs", e.target.value)} />
      </div>
      <DrawerFooter>
        <Button type="button" variant="ghost" color="red" rightIcon="fa-times" onClick={closeModal}>
          Cancelar
        </Button>
        <Button
          type="button"
          rightIcon="fa-save"
          disabled={!valid}
          className="disabled:opacity-50"
          onClick={() =>
            addBlocking({
              roomId: form.roomId,
              type: form.type,
              name: form.name,
              obs: form.obs,
              start: br(form.dFrom) + (slot ? ` ${form.hFrom}` : ""),
              end: br(dTo) + (slot ? ` ${form.hTo}` : ""),
            })
          }
        >
          Salvar
        </Button>
      </DrawerFooter>
    </DrawerModal>
  );
}
