import { describe, expect, it } from 'vitest';
import { annexes, createReports, formatDate, groupAcceptances, type Acceptance, type Guardian } from '../src/screens/termo-aceite/model.js';
import { documentsV1, documentsV2 } from '../src/screens/termo-aceite/fixtures.js';
const acceptance = (seconds: number, changes: Partial<Acceptance> = {}): Acceptance => ({ id: `r${seconds}`, guardianId: 'g1', at: new Date(Date.UTC(2026, 9, 20, 13, 0, seconds)).toISOString(), ip: '192.0.2.1', device: 'Android', version: '2', source: 'legacy', documents: documentsV2, ...changes });
describe('agrupamento de aceites', () => {
  it('inclui o limite de 5 segundos, preserva IDs e não encadeia a janela', () => {
    const records = [acceptance(8), acceptance(5), acceptance(0)];
    expect(groupAcceptances(records).map((g) => g.ids)).toEqual([['r0', 'r5'], ['r8']]);
    expect(records[0]!.id).toBe('r8');
  });
  it('agrupa horários iguais e separa seis segundos', () => {
    expect(groupAcceptances([acceptance(0), acceptance(0, { id: 'dup' }), acceptance(6)]).map((g) => g.ids)).toEqual([['r0', 'dup'], ['r6']]);
  });
  it.each([{ guardianId: 'g2' }, { ip: '192.0.2.2' }, { device: 'iOS' }, { version: '1' }, { source: 'documents' as const }])('não mistura identidades, versões ou fontes: %j', (changes) => {
    expect(groupAcceptances([acceptance(0), acceptance(1, changes)])).toHaveLength(2);
  });
});
describe('anexos por versão', () => {
  it('v1 tem 3 anexos e v2 tem 4, preservando o contrato como Anexo 2', () => {
    expect(annexes([acceptance(0, { version: '1', documents: documentsV1 })])).toHaveLength(3);
    const docs = annexes([acceptance(0)]);
    expect(docs).toHaveLength(4);
    expect(docs[1]!.title).toBe('Contrato de Adesão aos Serviços Terapêuticos');
    expect(docs[3]!.title).toBe('Política de Assiduidade e Gestão de Faltas');
  });
  it('v1+v2 preservam textos diferentes e os aceites que cobrem cada hash', () => {
    const docs = annexes([acceptance(10), acceptance(0, { version: '1', documents: documentsV1 })]);
    expect(docs).toHaveLength(5);
    expect(docs[1]!.acceptances.map((a) => a.version)).toEqual(['1', '2']);
    expect(docs[0]!.acceptances.map((a) => a.version)).toEqual(['1']);
    expect(docs[3]!.acceptances.map((a) => a.version)).toEqual(['2']);
  });
});
describe('emissão', () => {
  const g = (id: string, acceptances: Acceptance[]): Guardian => ({ id, name: id, relation: 'Responsável legal', acceptances });
  it('gera um por responsável elegível, mesmo com duplicados, e aceita a nova fonte', () => {
    const reports = createReports([g('g1', [acceptance(0), acceptance(1)]), g('g2', []), g('g3', [acceptance(0, { guardianId: 'g3', source: 'documents' })])], '2026-10-23T13:00:00Z');
    expect(reports.map((r) => r.guardian.id)).toEqual(['g1', 'g3']);
  });
  it('bloqueia todos sem aceite, lista vazia e aceite de outro responsável', () => {
    expect(createReports([g('g1', [])], '')).toEqual([]);
    expect(createReports([], '')).toEqual([]);
    expect(createReports([g('g2', [acceptance(0)])], '')).toEqual([]);
  });
  it('mostra horário de Brasília inclusive na virada do dia UTC', () => {
    expect(formatDate('2026-10-20T01:00:00Z')).toBe('19/10/2026, 22:00:00');
  });
});
