/**
 * Mapa de Salas — a aba Salas da unidade (`unit_live/components/unit_rooms.ex`).
 *
 * O `header` "Salas" do Phoenix, com o dia da semana e "Nova Sala" nas
 * `actions`; o Mapa de Salas substitui as visões tabela e cartões (o
 * `radio_selector` de visão vira o do dia).
 *
 * Bloqueios não ficam aqui: o PR #1646 do monólito tirou os `button_tabs`
 * Salas / Bloqueios da unidade e unificou os bloqueios em `blocking_live`
 * (`/backoffice/bloqueios`, no menu lateral).
 *
 * A visão (Mapa de Salas / Capacidade) é um segundo `radio_selector`, só com
 * ícones, à direita dos dias, como o seletor de visão (tabela / cartões) que o
 * Mapa de Salas substituiu. O dia vale para as duas visões. A visão
 * Capacidade é nova: não existe no Phoenix.
 */
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { Header } from "../../components/Layout.js";
import { Board } from "./Board.js";
import { Capacity } from "./Capacity.js";
import { dayShort, type DayKey } from "./model.js";
import { PlanDrawer } from "./PlanDrawer.js";
import { RoomDrawer } from "./RoomDrawer.js";
import { useRoomsMap, type RoomsView } from "./store.js";

const VIEWS: { value: RoomsView; icon: string; title: string }[] = [
  { value: "rooms", icon: "fa-chart-gantt", title: "Mapa de Salas" },
  { value: "capacity", icon: "fa-table-cells", title: "Capacidade" },
];

export function RoomsTab() {
  const { view, setView, days, day, setDay, canEdit, openModal } = useRoomsMap();

  return (
    <div>
      <Header
        className="mb-6"
        actions={
          <div className="flex items-center gap-2">
            <RadioSelector
              field={{ id: "mapa-salas-dia", name: "mapa[dia]", value: day }}
              className="inline-flex"
              radio={days.map((k) => ({ value: k, label: dayShort(k) }))}
              onChange={(e) => setDay(e.target.value as DayKey)}
            />
            <RadioSelector
              field={{ id: "mapa-salas-visao", name: "mapa[visao]", value: view }}
              className="inline-flex"
              radio={VIEWS}
              onChange={(e) => setView(e.target.value as RoomsView)}
            />
            {canEdit && (
              <Button type="button" rightIcon="fa-plus" iconType="solid" onClick={() => openModal({ kind: "room", roomId: null })}>
                Nova Sala
              </Button>
            )}
          </div>
        }
      >
        Salas
      </Header>
      {view === "capacity" ? <Capacity /> : <Board />}
    </div>
  );
}

/** A gaveta aberta. Monta só quando aberta, para o formulário começar limpo. */
export function ModalHost() {
  const { modal, rooms, canEdit, findPlan } = useRoomsMap();
  if (!modal || !canEdit) return null;
  const key = JSON.stringify(modal);
  switch (modal.kind) {
    case "room": {
      const room = modal.roomId ? rooms.find((r) => r.id === modal.roomId) : null;
      return room === undefined ? null : <RoomDrawer key={key} room={room} />;
    }
    case "plan":
    case "planEdit": {
      const room = rooms.find((r) => r.id === modal.roomId);
      const point = room?.servicePoints.find((sp) => sp.name === modal.point);
      if (!room || !point) return null;
      if (modal.kind === "plan") return <PlanDrawer key={key} room={room} point={point} from={modal.from} />;
      const pl = findPlan(modal.roomId, modal.point, modal.from);
      return pl ? <PlanDrawer key={key} room={room} point={point} pl={pl} /> : null;
    }
  }
}
