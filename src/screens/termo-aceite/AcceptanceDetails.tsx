import { Card } from '../../components/Card.js';
import { Header } from '../../components/Layout.js';
import { Table } from '../../components/Table.js';
import { Tag } from '../../components/Tag.js';
import { annexes, declarations, formatDate, groupAcceptances, type Guardian } from './model.js';

/** Composição específica desta tela; não é um novo componente do catálogo Phoenix. */
export function AcceptanceDetails({ guardian }: { guardian: Guardian }) {
  const groups = groupAcceptances(guardian.acceptances);
  const documents = annexes(guardian.acceptances);
  return <div className="space-y-6 text-brand-purple-dark">
    <Header subtitle={`${guardian.relation}${guardian.main ? ' · responsável principal' : ''}`}>{guardian.name}</Header>
    <section className="space-y-3">
      <Header variant="small">Registro do aceite</Header>
      <p className="text-sm">{groups.length} {groups.length === 1 ? 'aceite' : 'aceites'} · Horário de Brasília</p>
      <Table id="registros-aceite" rows={groups} rowId={(row) => row.id} col={[
        { label: 'Data e hora', render: (row) => formatDate(row.at) },
        { label: 'Versão', render: (row) => <Tag item={`v${row.version}`} /> },
        { label: 'Endereço IP', render: (row) => row.ip },
        { label: 'Dispositivo', render: (row) => row.device },
        { label: 'Identificadores', render: (row) => <div className="space-y-1">{row.ids.length > 1 && <Tag item={`${row.ids.length} registros agrupados`} variant="light-purple" />}{row.ids.map((id) => <div key={id} className="text-xs break-all">{id}</div>)}</div> },
      ]} />
    </section>
    <section className="space-y-3">
      <Header variant="small">Documentos aceitos · {documents.length} anexos</Header>
      {documents.map((doc) => <Card key={doc.hash}>
        <Header variant="small">Anexo {doc.number} — {doc.title} <span className="text-sm font-normal">· versão {[...new Set(doc.acceptances.map((a) => a.version))].join(' e ')}</span></Header>
        <div className="mt-3 space-y-2 text-sm">
          <p>SHA-256 do texto: <span className="break-all">{doc.hash}</span></p>
          {doc.acceptances.map((acceptance) => <p key={acceptance.id}>Aceito eletronicamente em {formatDate(acceptance.at)} (horário de Brasília) · v{acceptance.version} · IP {acceptance.ip} · {acceptance.device}</p>)}
        </div>
      </Card>)}
    </section>
    <section className="space-y-3">
      <Header variant="small">Declarações registradas no aplicativo</Header>
      {groups.filter((group) => group.source === 'legacy').map((group) => <Card key={group.id}>
        <Header variant="small">Versão {group.version} · {formatDate(group.at)}</Header>
        <p className="mt-3">“{declarations[group.version]}”</p>
      </Card>)}
      {groups.some((group) => group.source === 'documents') && <p>Documento aceito com assinatura eletrônica. A assinatura registrada integra o termo.</p>}
    </section>
  </div>;
}
