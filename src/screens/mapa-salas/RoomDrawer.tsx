/**
 * Mapa de Salas — a gaveta da sala.
 *
 * Criação simplificada: nome, tipo e os pontos de atendimento. O padrão de
 * cada ponto é definido depois, direto no mapa (clique num horário vazio).
 * Renomear um ponto mantém o planejado e a escala dele.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Icon } from "../../components/Icon.js";
import { Input } from "../../components/Input.js";
import { DrawerModal } from "../../components/Overlay.js";
import { POINT_NAMES, ROOM_TYPES, type Room, type RoomType, type ServicePoint } from "./model.js";
import { DRAWER_SIZE, DrawerFooter, Note, Warn } from "./parts.js";
import { useRoomsMap } from "./store.js";

type PointRow = { key: string; name: string; src: ServicePoint | null };

export function RoomDrawer({ room }: { room: Room | null }) {
  const { rooms, unit, saveRoom, closeModal } = useRoomsMap();
  const isEdit = Boolean(room);
  const [name, setName] = useState(room ? room.name : "");
  const [type, setType] = useState<RoomType>(room ? room.type : "attendance");
  const [pts, setPts] = useState<PointRow[]>(() =>
    room && room.servicePoints.length ? room.servicePoints.map((sp, i) => ({ key: `k${i}`, name: sp.name, src: sp })) : [{ key: "k0", name: "A", src: null }],
  );
  const [active, setActive] = useState(room ? room.active !== false : true);
  const [seq, setSeq] = useState(0);
  const number = room ? room.number : Math.max(0, ...rooms.map((r) => r.number)) + 1;
  const names = pts.map((p) => p.name.trim().toUpperCase());
  const dup = names.find((x, i) => x && names.indexOf(x) !== i);
  const blankPt = names.some((x) => !x);
  const valid = name.trim().length > 0 && pts.length > 0 && !dup && !blankPt;
  // Pontos removidos que ainda têm padrão ou profissional.
  const removed = room ? room.servicePoints.filter((sp) => !pts.some((p) => p.src === sp) && (sp.plan.length || sp.periods.length)) : [];

  function addPt() {
    const used = new Set(names);
    const next = POINT_NAMES.find((x) => !used.has(x)) ?? String(pts.length + 1);
    setPts((l) => [...l, { key: `n${seq}`, name: next, src: null }]);
    setSeq((n) => n + 1);
  }
  function save() {
    const servicePoints = pts.map((p) => ({ ...(p.src ?? { plan: [], periods: [] }), name: p.name.trim().toUpperCase() }));
    saveRoom({
      ...(room ?? { areaId: unit.areas[0]?.id ?? "" }),
      number,
      name: name.trim(),
      type,
      capacity: servicePoints.length,
      active,
      servicePoints,
    } as Room);
  }

  return (
    <DrawerModal
      id="mapa-salas-sala"
      show
      onCancel={closeModal}
      variant="custom"
      customSize={DRAWER_SIZE}
      contentClass="flex flex-col"
      title={isEdit ? "Editar sala" : "Nova Sala"}
    >
      <div className="flex flex-1 flex-col gap-6">
        <Input id="mapa-salas-sala-nome" label="Nome da Sala" value={name} placeholder={`Sala ${number}`} onChange={(e) => setName(e.target.value)} />
        <Input
          id="mapa-salas-sala-tipo"
          type="select"
          label="Tipo"
          prompt="Selecione o tipo da sala"
          clear={false}
          value={type}
          options={ROOM_TYPES}
          onChange={(v) => v && setType(v as RoomType)}
        />

        <div>
          <p className="mb-2 text-sm/4 font-bold text-brand-blue">Pontos de atendimento</p>
          <div className="flex flex-col gap-2">
            {pts.map((p) => {
              const nm = p.name.trim().toUpperCase();
              const bad = !nm || names.filter((x) => x === nm).length > 1;
              return (
                <div key={p.key} className="flex items-center gap-2">
                  <Input
                    id={`mapa-salas-sala-ponto-${p.key}`}
                    className="min-w-0 flex-1"
                    value={p.name}
                    maxLength={12}
                    placeholder="Nome do ponto"
                    aria-label="Nome do ponto"
                    inputClass={bad ? "border-brand-red!" : undefined}
                    onChange={(e) => setPts((l) => l.map((x) => (x.key === p.key ? { ...x, name: e.target.value } : x)))}
                  />
                  <Button
                    type="button"
                    variant="tint"
                    color="red"
                    title="Remover ponto"
                    aria-label="Remover ponto"
                    disabled={pts.length <= 1}
                    className="disabled:opacity-50"
                    onClick={() => setPts((l) => l.filter((x) => x.key !== p.key))}
                  >
                    <Icon name="fa-trash" className="block w-4 h-4 self-center" />
                  </Button>
                </div>
              );
            })}
            <div>
              <Button type="button" variant="tint" leftIcon="fa-plus" iconType="solid" onClick={addPt}>
                Adicionar ponto
              </Button>
            </div>
            {dup && <Warn>Já existe um ponto "{dup}" nesta sala.</Warn>}
          </div>
        </div>

        {removed.length > 0 && (
          <Warn>
            {removed.map((sp) => `${name.trim() || number}·${sp.name}`).join(", ")} {removed.length > 1 ? "têm" : "tem"} planejado ou escala. Ao remover, o ponto sai do
            mapa com o planejado dele.
          </Warn>
        )}
        {isEdit && (
          <div>
            <Input id="mapa-salas-sala-desativar" type="checkbox" label="Desativar sala" checked={!active} onChange={(e) => setActive(!e.target.checked)} />
            <p className="px-4 text-sm font-semibold text-brand-purple-dark/55">Sai do mapa, mas o histórico fica.</p>
          </div>
        )}
        {!isEdit && <Note>O planejado de cada ponto é definido depois, direto no mapa: clique num horário vazio da linha de cima.</Note>}
      </div>

      <DrawerFooter>
        <Button type="button" variant="ghost" color="red" rightIcon="fa-times" onClick={closeModal}>
          Cancelar
        </Button>
        {isEdit ? (
          <Button type="button" rightIcon="fa-check" iconType="solid" disabled={!valid} className="disabled:opacity-50" onClick={save}>
            Salvar
          </Button>
        ) : (
          <Button type="button" rightIcon="fa-plus" iconType="solid" disabled={!valid} className="disabled:opacity-50" onClick={save}>
            Criar sala
          </Button>
        )}
      </DrawerFooter>
    </DrawerModal>
  );
}
