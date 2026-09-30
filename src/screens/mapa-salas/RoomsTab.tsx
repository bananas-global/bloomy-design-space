/**
 * Mapa de Salas — a aba Salas da unidade: os `button_tabs` Salas / Bloqueios
 * de `unit_live/edit.ex` (id `room_scheduling`).
 *
 * Em Salas, o Mapa de Salas substitui as visões tabela e cartões de
 * `unit_rooms.ex`: ao lado das abas ficam o dia da semana, a vigência do
 * planejamento e "Nova Sala". Em Bloqueios, "Novo bloqueio".
 */
import { Button } from "../../components/Button.js";
import { RadioSelector } from "../../components/Choice.js";
import { Icon } from "../../components/Icon.js";
import { ButtonTabs } from "../../components/Tabs.js";
import { BlockingDrawer, BlockingInfoModal, BlockingsPanel } from "./Blockings.js";
import { Board } from "./Board.js";
import { dayShort, pluralize, type DayKey } from "./model.js";
import { PlanDrawer } from "./PlanDrawer.js";
import { ClosedVersionDrawer, RoomDrawer } from "./RoomDrawer.js";
import { useRoomsMap } from "./store.js";
import { NewVersionDrawer, PublishDrawer, VersionDropdown } from "./Versions.js";

/**
 * A barra do rascunho, presa no pé da página inteira (fora do card), na
 * largura do `main` do backoffice. Novo — não existe no Phoenix.
 */
export function DraftBar() {
  const { draft, discardDraft, openModal } = useRoomsMap();
  if (!draft) return null;
  return (
    <div className="sticky bottom-0 z-30 -mx-4 -mb-4 mt-6 flex flex-wrap items-center gap-2.5 border-t border-neutral-100 bg-white px-4 py-3.5 text-[13px] font-semibold text-brand-purple-dark shadow-main lg:-mx-8 lg:-mb-8 lg:px-8">
      <Icon name="fa-pen-to-square" type="solid" className="text-brand-blue" />
      <span>
        <strong>{`${pluralize(draft.n, "alteração não publicada", "alterações não publicadas")}`}</strong> no padrão em vigência.
      </span>
      <span className="ml-auto flex gap-2">
        <Button type="button" size="medium" variant="ghost" color="red" onClick={discardDraft}>
          Descartar
        </Button>
        <Button type="button" size="medium" rightIcon="fa-arrow-right" iconType="solid" onClick={() => openModal({ kind: "publish" })}>
          Publicar
        </Button>
      </span>
    </div>
  );
}

function RoomsPanel() {
  const { vStatus } = useRoomsMap();
  return (
    <div>
      {vStatus.order === 2 && (
        <div className="mt-3 flex items-center gap-2.5 rounded-lg bg-brand-purple-dark/5 px-3.5 py-2.5 text-[13px] font-semibold text-brand-purple-dark/70">
          <Icon name="fa-lock" type="solid" />
          Vigência encerrada · somente leitura. Para mudar o padrão, edite a vigência em curso ou uma futura.
        </div>
      )}
      <Board />
    </div>
  );
}

export function RoomsTab() {
  const { sub, setSub, tabsKey, days, day, setDay, canEdit, openModal } = useRoomsMap();

  const roomsActions = (
    <div className="flex flex-1 flex-wrap items-center justify-between gap-4">
      <RadioSelector
        field={{ id: "mapa-salas-dia", name: "mapa[dia]", value: day }}
        className="inline-flex"
        radio={days.map((k) => ({ value: k, label: dayShort(k) }))}
        onChange={(e) => setDay(e.target.value as DayKey)}
      />
      <div className="flex flex-wrap items-center gap-3">
        <VersionDropdown />
        {canEdit && (
          <Button type="button" rightIcon="fa-plus" iconType="solid" onClick={() => openModal({ kind: "room", roomId: null })}>
            Nova Sala
          </Button>
        )}
      </div>
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
        { title: "Salas", content: <RoomsPanel /> },
        { title: "Bloqueios", content: <BlockingsPanel /> },
      ]}
    />
  );
}

/** A gaveta ou modal aberto. Monta só quando aberto, para o formulário começar limpo. */
export function ModalHost() {
  const { modal, rooms, blockings, canEdit, vStatus, draft, findGap, findAlloc, commitPlan, commitGap, commitCard } = useRoomsMap();
  if (!modal) return null;
  if (modal.kind === "blockingInfo") {
    const b = blockings.find((x) => x.id === modal.id);
    return b ? <BlockingInfoModal blocking={b} /> : null;
  }
  if (!canEdit) return null;
  const key = JSON.stringify(modal);
  switch (modal.kind) {
    case "room": {
      if (vStatus.order === 2) return <ClosedVersionDrawer />;
      const room = modal.roomId ? rooms.find((r) => r.id === modal.roomId) : null;
      return room === undefined ? null : <RoomDrawer key={key} room={room} />;
    }
    case "plan": {
      const room = rooms.find((r) => r.id === modal.roomId);
      const point = room?.servicePoints.find((sp) => sp.name === modal.point);
      if (!room || !point) return null;
      return <PlanDrawer key={key} room={room} point={point} from={modal.from} onSave={(entry, prof) => commitPlan(room, point, entry, prof)} />;
    }
    case "gap": {
      const gap = findGap(modal.roomId, modal.point, modal.from);
      if (!gap) return null;
      return <PlanDrawer key={key} room={gap.room} point={gap.point} gap={gap} onSave={(entry, prof) => commitGap(gap, entry, prof)} />;
    }
    case "card": {
      const room = rooms.find((r) => r.id === modal.roomId);
      const point = room?.servicePoints.find((sp) => sp.name === modal.point);
      const b = findAlloc(modal.roomId, modal.point, modal.from, modal.professional);
      if (!room || !point || !b) return null;
      return <PlanDrawer key={key} room={room} point={point} b={b} onSave={(entry, prof) => commitCard(room, point, b, entry, prof)} />;
    }
    case "version":
      return <NewVersionDrawer />;
    case "publish":
      return draft ? <PublishDrawer /> : null;
    case "blocking":
      return <BlockingDrawer />;
  }
}
