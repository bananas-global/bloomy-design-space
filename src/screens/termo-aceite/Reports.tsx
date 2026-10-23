import { useEffect, useState } from 'react';
import type { ScreenProps } from '@brucesantos/design-space';
import { Button } from '../../components/Button.js';
import { Input } from '../../components/Input.js';
import { Header } from '../../components/Layout.js';
import { Modal } from '../../components/Overlay.js';
import { Table } from '../../components/Table.js';
import { Tag } from '../../components/Tag.js';
import { showToast } from '../../components/Action.js';
import { BackofficeLayout } from '../../layouts/BackofficeLayout.js';
import { PatientLayout } from '../../layouts/PatientLayout.js';
import { AcceptanceDetails } from './AcceptanceDetails.js';
import { DEFAULT_FIXTURE, type TermFixture } from './fixtures.js';
import { createReports, eligibleGuardians, formatDate, groupAcceptances, NO_ACCEPTANCE, type Guardian, type Report } from './model.js';

const TYPE = 'Termo de Aceite Eletrônico';
const PATIENT = { name: 'Lia Jardim', age: 6, status: 'Ativo', unitName: 'Unidade Jardim', missedCancelledCount: 0 };
const STATUS = { generating: 'Gerando relatório...', ready: 'PDF gerado', error: 'Falha na geração' };
const REFERENCE_DATE = '2026-10-23T13:00:00Z';

export function Reports(props: ScreenProps) {
  // Trocar fixture/persona reinicia a demonstração, sem misturar relatórios entre cenários.
  return <ReportsScreen key={`${props.context.fixture?.id}-${props.context.persona?.id}`} {...props} />;
}
function ReportsScreen({ context }: ScreenProps) {
  const data = context.fixture?.data;
  const fixture = ((typeof data === 'function' ? data() : data) as TermFixture | undefined) ?? DEFAULT_FIXTURE;
  const allowed = context.can('patients.generate_report');
  const eligible = eligibleGuardians(fixture.guardians);
  const [open, setOpen] = useState(Boolean(fixture.modal));
  const [type, setType] = useState('legal_acceptance_term');
  const [selected, setSelected] = useState<Guardian | null>(null);
  const [reports, setReports] = useState<Report[]>(() => fixture.initialStatus ? createReports(fixture.guardians, REFERENCE_DATE).map((r) => ({ ...r, status: fixture.initialStatus! })) : []);
  const [running, setRunning] = useState(false);
  const [failedOnce, setFailedOnce] = useState(false);
  const [message, setMessage] = useState('');
  const busy = running || reports.some((report) => report.status === 'generating');
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => {
      const fails = fixture.fail && !failedOnce;
      setReports((items) => items.map((r) => r.status === 'generating' ? { ...r, status: fails ? 'error' : 'ready' } : r));
      setFailedOnce(true);
      setRunning(false);
      setMessage(fails ? 'Não foi possível gerar os termos. Tente novamente.' : 'Termos gerados para os responsáveis com aceite registrado.');
    }, 900);
    return () => window.clearTimeout(timer);
  }, [running, fixture.fail, failedOnce]);
  function generate() {
    if (!allowed || busy || type !== 'legal_acceptance_term') return;
    const next = createReports(fixture.guardians, new Date().toISOString());
    if (!next.length) { setMessage(NO_ACCEPTANCE); return; }
    setReports(next);
    setOpen(false);
    setMessage('Gerando um termo por responsável com aceite registrado.');
    setRunning(true);
  }
  function retry(guardianId: string) {
    if (!allowed || busy) return;
    setFailedOnce(true);
    setReports((items) => items.map((r) => r.guardian.id === guardianId && eligible.some((g) => g.id === guardianId) ? { ...r, status: 'generating' } : r));
    setRunning(true);
  }
  const content = <div className="space-y-6">
    <Header actions={allowed ? <Button rightIcon="fa-plus" onClick={() => setOpen(true)} disabled={busy}>Novo relatório</Button> : undefined}>Relatórios</Header>
    <p className="text-sm text-brand-purple-dark/70">Demonstração com dados fictícios. A emissão e o download de PDFs são simulados.</p>
    {message && <p role="status" className="rounded-lg bg-blue-light p-4 text-blue-dark">{message}</p>}
    <Table id="termos-relatorios" rows={reports} emptyMessage="Nenhum relatório relacionado ao paciente" col={[
      { label: 'Nome', render: (r) => `${TYPE} — ${r.guardian.name}` },
      { label: 'Status', render: (r) => <Tag item={STATUS[r.status]} variant={r.status === 'ready' ? 'green' : r.status === 'error' ? 'red' : 'yellow'} /> },
      { label: 'Tipo de relatório', render: () => TYPE },
      { label: 'Gerado em', render: (r) => formatDate(r.at) },
      { label: 'Ações', render: (r) => <div className="flex flex-wrap gap-2">
        {r.status === 'error' ? allowed && <Button size="small" variant="outline" disabled={busy} onClick={() => retry(r.guardian.id)}>Tentar novamente</Button> : <>
          <Button size="small" variant="ghost" disabled={r.status !== 'ready'} onClick={() => setSelected(r.guardian)} aria-label={`Visualizar termo de ${r.guardian.name}`}>Visualizar</Button>
          <Button size="small" variant="ghost" disabled={r.status !== 'ready'} onClick={() => showToast({ title: 'Demonstração', content: 'No sistema, esta ação baixa o PDF deste responsável. Nenhum documento foi emitido neste protótipo.', type: 'info' })} aria-label={`Baixar termo de ${r.guardian.name}`}>Baixar</Button>
        </>}
      </div> },
    ]} />
    <Modal id="novo-termo" show={open && allowed && !selected} onCancel={() => setOpen(false)} title="Novo relatório" variant="medium">
      <div className="space-y-6">
        <Input id="tipo-termo" name="report_type" type="select" label="Tipo" value={type} options={[[TYPE, 'legal_acceptance_term']]} onChange={(value) => setType(value ?? '')} />
        <p>Será gerado um PDF por responsável legal com aceite registrado, reunindo os documentos que ele aceitou.</p>
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-brand-purple-dark">Responsáveis do paciente</h2>
          {fixture.guardians.map((guardian) => {
            const hasAcceptance = eligible.some((g) => g.id === guardian.id);
            return <div key={guardian.id} className="rounded-lg border border-brand-purple-dark/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div><p className="font-bold text-brand-purple-dark">{guardian.name}</p><p className="text-sm">{guardian.relation}{guardian.main ? ' · responsável principal' : ''}</p>
                <div className="mt-2"><Tag item={hasAcceptance ? `${groupAcceptances(guardian.acceptances).length} aceite(s) registrado(s)` : 'Sem aceite registrado'} variant={hasAcceptance ? 'green' : 'yellow'} /></div>
                {!hasAcceptance && <p className="text-sm mt-2">Não será emitido termo para este responsável.</p>}
              </div>
              <Button variant="outline" size="medium" disabled={!hasAcceptance} onClick={() => setSelected(guardian)} aria-label={`Conferir aceites de ${guardian.name}`}>Conferir aceites</Button>
            </div>;
          })}
          {!fixture.guardians.length && <p>Nenhum responsável legal vinculado ao paciente.</p>}
        </div>
        {!eligible.length && <p role="alert" className="rounded-lg bg-yellow/20 text-yellow-dark p-4">{NO_ACCEPTANCE}</p>}
        <div className="flex flex-col md:flex-row justify-between gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!eligible.length || busy || type !== 'legal_acceptance_term'} onClick={generate}>Gerar {eligible.length === 1 ? '1 termo' : `${eligible.length} termos`}</Button>
        </div>
      </div>
    </Modal>
    <Modal id="conferencia-termo" show={Boolean(selected)} onCancel={() => setSelected(null)} title="Conferir termo de aceite" variant="medium">
      <p className="mb-6 text-sm text-brand-purple-dark/70">Prévia de conferência com dados e hashes ilustrativos. O PDF final contém a declaração completa e o inteiro teor dos anexos.</p>
      {selected && <AcceptanceDetails guardian={selected} />}
    </Modal>
  </div>;
  return <BackofficeLayout context={context} currentPath="/backoffice/pacientes" currentUnit="Unidade Jardim">
    <PatientLayout context={context} patient={PATIENT} activeTab="reports" renderTab={(tab) => tab === 'reports' ? content : <p>Selecione Relatórios para conferir o Termo de Aceite Eletrônico.</p>} />
  </BackofficeLayout>;
}
