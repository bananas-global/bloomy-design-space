/**
 * Mapa de Salas — a aba Salas da unidade: os `button_tabs` Salas / Bloqueios
 * de `unit_live/edit.ex` (id `room_scheduling`).
 *
 * Em Salas, o Mapa de Salas substitui as visões tabela e cartões de
 * `unit_rooms.ex`: ao lado das abas ficam o dia da semana e "Nova Sala". Em
 * Bloqueios, "Novo bloqueio".
 */
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { ButtonTabs } from "../../components/Tabs.js";
import { BlockingDrawer, BlockingInfoModal, BlockingsPanel } from "./Blockings.js";
import { Board } from "./Board.js";
import { dayShort, type DayKey } from "./model.js";
import { PlanDrawer } from "./PlanDrawer.js";
import { RoomDrawer } from "./RoomDrawer.js";
import { useRoomsMap } from "./store.js";

export function RoomsTab() {
  const { sub, setSub, tabsKey, days, day, setDay, canEdit, openModal } = useRoomsMap();

  const roomsActions = (
    <div className="flex flex-1 flex-wrap items-center justify-end gap-3">
      <RadioSelector
        field={{ id: "mapa-salas-dia", name: "mapa[dia]", value: day }}
        className="inline-flex"
        radio={days.map((k) => ({ value: k, label: dayShort(k) }))}
        onChange={(e) => setDay(e.target.value as DayKey)}
      />
      {canEdit && (
        <Button type="button" rightIcon="fa-plus" iconType="solid" onClick={() => openModal({ kind: "room", roomId: null })}>
          Nova Sala
        </Button>
      )}
    </div>
  );
  const blockingsActions = canEdit ? (
    <Button type="button" rightIcon="fa-plus" iconType="solid" onClick={() => openModal({ kind: "blocking" })}>
      Novo bloqueio
    </Button>
  ) : null;

  return (
    <ButtonTabs
      key={tabsKey}
      id="room_scheduling"
      className="flex-wrap gap-4"
      initialTab={sub === "blockings" ? 1 : 0}
      onChange={(i) => setSub(i === 1 ? "blockings" : "rooms")}
      actions={sub === "rooms" ? roomsActions : blockingsActions}
      tab={[
        { title: "Salas", content: <Board /> },
        { title: "Bloqueios", content: <BlockingsPanel /> },
      ]}
    />
  );
}

/** A gaveta ou modal aberto. Monta só quando aberto, para o formulário começar limpo. */
export function ModalHost() {
  const { modal, rooms, blockings, canEdit, findPlan } = useRoomsMap();
  if (!modal) return null;
  if (modal.kind === "blockingInfo") {
    const b = blockings.find((x) => x.id === modal.id);
    return b ? <BlockingInfoModal blocking={b} /> : null;
  }
  if (!canEdit) return null;
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
    case "blocking":
      return <BlockingDrawer />;
  }
}
