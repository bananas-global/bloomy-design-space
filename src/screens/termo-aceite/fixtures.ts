import type { Fixture } from '@brucesantos/design-space';
import type { Acceptance, Document, Guardian, Report } from './model.js';
// Todos os dados são sintéticos. Hashes ilustrativos, sem documentos jurídicos associados.
const hash = (digit: string) => digit.repeat(64);
const common: Document[] = [
  { title: 'Contrato de Adesão aos Serviços Terapêuticos', hash: hash('b'), version: '1 e 2' },
  { title: 'Termo de Ciência e Consentimento Informado', hash: hash('c'), version: '1 e 2' },
];
export const documentsV1: Document[] = [{ title: 'Termos de Uso do Aplicativo Bloomy', hash: hash('a'), version: '1' }, ...common];
export const documentsV2: Document[] = [{ title: 'Termos de Uso do Aplicativo Bloomy', hash: hash('d'), version: '2' }, ...common,
  { title: 'Política de Assiduidade e Gestão de Faltas', hash: hash('e'), version: '2' }];
const acceptance = (id: string, version: '1' | '2', at: string): Acceptance => ({
  id, guardianId: 'responsavel-demo-1', at, version, source: 'legacy', ip: '192.0.2.10', device: 'Android · aparelho de demonstração',
  documents: version === '1' ? documentsV1 : documentsV2,
});
const v1 = acceptance('aceite-demo-1', '1', '2026-09-10T13:00:00Z');
const v2 = acceptance('aceite-demo-2', '2', '2026-10-20T13:00:00Z');
const duplicate = acceptance('aceite-demo-3', '2', '2026-10-20T13:00:05Z');
const mother: Guardian = { id: 'responsavel-demo-1', name: 'Helena Jardim', relation: 'Mãe', main: true, acceptances: [v1, v2, duplicate] };
const father: Guardian = { id: 'responsavel-demo-2', name: 'Caio Jardim', relation: 'Pai', acceptances: [] };
export type TermFixture = { guardians: Guardian[]; modal?: boolean; initialStatus?: Report['status']; fail?: boolean };
export const DEFAULT_FIXTURE: TermFixture = { guardians: [mother, father] };
export const TERM_FIXTURES: Fixture<TermFixture>[] = [
  { id: 'aceite.misto', label: 'Versões 1 e 2 · responsável sem aceite', data: DEFAULT_FIXTURE },
  { id: 'aceite.v1', label: 'Somente versão 1', data: { guardians: [{ ...mother, acceptances: [v1] }], modal: true } },
  { id: 'aceite.v2', label: 'Versão 2 · duplicados em 5 segundos', data: { guardians: [{ ...mother, acceptances: [v2, duplicate] }], modal: true } },
  { id: 'aceite.sem', label: 'Nenhum responsável com aceite', data: { guardians: [{ ...mother, acceptances: [] }, father], modal: true } },
  { id: 'aceite.vazio', label: 'Nenhum responsável vinculado', data: { guardians: [], modal: true } },
  { id: 'aceite.pronto', label: 'Relatórios gerados · duas fontes', data: { guardians: [mother, { ...father, acceptances: [{ ...v2, id: 'aceite-documento-demo', guardianId: father.id, source: 'documents', version: '3', documents: [{ title: 'Documento versionado de demonstração', hash: hash('f'), version: '3' }] }] }], initialStatus: 'ready' } },
  { id: 'aceite.gerando', label: 'Geração em andamento', data: { guardians: [mother, father], initialStatus: 'generating' } },
  { id: 'aceite.erro', label: 'Erro de geração', data: { guardians: [mother, father], initialStatus: 'error', fail: true } },
];
