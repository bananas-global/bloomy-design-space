/**
 * Modais de uma solicitação: "Reatribuir profissional" (`RelReassignModal`) e
 * "Cancelar solicitação" (`RelCancelModal`). Abrem por
 * `openModal({ kind: "reassign" | "cancel", id })`.
 */
import { useState } from "react";
import { Button } from "../../components/Button.js";
import { Input } from "../../components/Input.js";
import { Modal } from "../../components/Overlay.js";
import { REL_PROFS, relTypeName, type Report } from "./model.js";
import { Callout } from "./parts.js";
import { useReports } from "./store.js";

const subtitle = (r: Report) => `${relTypeName(r)} · ${r.patient.name}`;

export function ReassignModal({ report }: { report: Report }) {
  const { closeModal, reassign } = useReports();
  const [profId, setProfId] = useState(report.prof?.id ?? "");
  const prof = REL_PROFS.find((p) => p.id === profId);
  const changed = Boolean(prof && (!report.prof || report.prof.id !== profId));

  return (
    <Modal id="relatorio-reatribuir" show onCancel={closeModal} title="Reatribuir profissional" variant="extra_small">
      <p className="mb-5 text-sm text-brand-purple-dark/60">{subtitle(report)}</p>
      <div className="flex flex-col gap-5">
        {report.prof && (
          <Callout tone="info" icon="fa-circle-info">
            Responsável atual: <strong>{report.prof.name}</strong>. Ao reatribuir, o novo profissional passa a ver a solicitação como tarefa e o anterior deixa de vê-la.
          </Callout>
        )}
        <Input
          id="reatribuir-profissional"
          type="select"
          label="Novo profissional responsável"
          prompt="Selecionar"
          value={profId}
          options={REL_PROFS.map((p) => [`${p.name} · ${p.specialty}`, p.id] as const)}
          onChange={(v) => setProfId(v ?? "")}
        />
        {changed && report.hasDraft && (
          <Callout tone="warn" icon="fa-triangle-exclamation">
            Existe um <strong>rascunho salvo</strong>. Ele permanece vinculado à solicitação e ficará visível ao novo responsável.
          </Callout>
        )}
      </div>
      <div className="mt-8 flex justify-end gap-3">
        <Button type="button" variant="tint" onClick={closeModal}>
          Cancelar
        </Button>
        <Button type="button" rightIcon="fa-user-pen" iconType="solid" disabled={!prof} className="disabled:opacity-50" onClick={() => prof && reassign(report.id, prof)}>
          Reatribuir
        </Button>
      </div>
    </Modal>
  );
}

export function CancelModal({ report }: { report: Report }) {
  const { closeModal, cancelRequest } = useReports();
  const [reason, setReason] = useState("");

  return (
    <Modal id="relatorio-cancelar" show onCancel={closeModal} title="Cancelar solicitação" variant="extra_small">
      <p className="mb-5 text-sm text-brand-purple-dark/60">{subtitle(report)}</p>
      <div className="flex flex-col gap-5">
        <Callout tone="danger" icon="fa-triangle-exclamation">
          O cancelamento mantém o registro no histórico. {report.hasDraft && "O rascunho salvo será preservado."}
        </Callout>
        <Input
          id="cancelar-motivo"
          type="textarea"
          label="Motivo do cancelamento"
          placeholder="Descreva o motivo — ficará visível no histórico e para o profissional."
          rows={4}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </div>
      <div className="mt-8 flex justify-end gap-3">
        <Button type="button" variant="tint" onClick={closeModal}>
          Voltar
        </Button>
        <Button type="button" color="red" rightIcon="fa-ban" iconType="solid" disabled={!reason.trim()} className="disabled:opacity-50" onClick={() => cancelRequest(report.id, reason.trim())}>
          Cancelar solicitação
        </Button>
      </div>
    </Modal>
  );
}
