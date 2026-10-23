import type { Feature } from '../../app/features.js';
import { Reports } from './Reports.js';
import { TERM_FIXTURES } from './fixtures.js';
const PATH = '/backoffice/pacientes/paciente-demo/relatorios';
const ticket = 'https://github.com/sidedoor-tech/bloomy/issues/1876';
const cases = [
  ['misto', 'Novo termo · versões combinadas', 'Conferir responsáveis antes da emissão.', ['Novo relatório abre o tipo Termo de Aceite Eletrônico, sem campos extras obrigatórios.', 'Um termo é gerado por responsável com aceite; responsáveis sem aceite aparecem com aviso e conferência desabilitada.', 'Versões combinadas preservam textos distintos e deduplicam apenas conteúdo idêntico; a declaração apresenta todas as datas.']],
  ['v1', 'Aceite da versão 1', 'Conferir documentos da versão 1.', ['A versão 1 apresenta três anexos e sua declaração original.']],
  ['v2', 'Versão 2 · duplicados agrupados', 'Conferir duplicados e novo anexo.', ['Registros do mesmo responsável, IP, dispositivo e versão em até cinco segundos aparecem em uma linha com todos os IDs.', 'A versão 2 apresenta quatro anexos; a Política de Assiduidade e Gestão de Faltas é o Anexo 4.', 'O Contrato de Adesão permanece como Anexo 2 e a declaração exibida corresponde à versão 2.']],
  ['sem', 'Nenhum responsável com aceite', 'Bloquear emissão sem evidência de aceite.', ['O formulário mostra: Nenhum aceite registrado para os responsáveis deste paciente.', 'Gerar fica desabilitado e nenhum relatório é criado.']],
  ['vazio', 'Nenhum responsável vinculado', 'Explicar a ausência de responsáveis.', ['A ausência de responsáveis é informada; a geração fica bloqueada.']],
  ['pronto', 'Termos gerados · legado e sistema novo', 'Consultar um relatório por responsável elegível.', ['A tabela apresenta nome do responsável, status, tipo, data, visualizar e baixar.', 'Aceites do sistema novo também habilitam a emissão e usam a versão do documento aceita.']],
  ['gerando', 'Geração em andamento', 'Evitar emissão repetida e acesso antecipado.', ['Durante a geração, visualizar e baixar ficam desabilitados e o status indica o processamento.']],
  ['erro', 'Falha na geração', 'Permitir recuperar uma emissão que falhou.', ['O relatório com falha oferece Tentar novamente, sem criar uma segunda linha para o mesmo responsável.']],
] as const;
export const feature: Feature = {
  fixtures: TERM_FIXTURES,
  routes: [{ path: PATH, screen: Reports, name: 'Termo de Aceite Eletrônico', group: 'Relatórios do paciente', description: 'Emissão e conferência de termos por responsável legal.', expected: [
    'Reutiliza o modal de Novo relatório e a listagem da aba Relatórios, com a permissão patients.generate_report.',
    'Geração e download são simulados no Design Space; o PDF jurídico será implementado no Phoenix.',
  ], components: ['layout.backoffice', 'layout.patient', 'core.header', 'core.button', 'core.input', 'core.table', 'core.tag', 'core.modal'] }],
  scenarios: [
    ...cases.map(([id, title, intent, expected]) => ({ id: `aceite.${id}`, title, intent, expected: [...expected], route: PATH, fixture: `aceite.${id}`, persona: 'admin', ticket })),
    { id: 'aceite.sem-permissao', title: 'Sem permissão para gerar', intent: 'Manter a política dos demais relatórios.', route: PATH, fixture: 'aceite.misto', persona: 'admin', permissions: [], ticket, expected: ['Novo relatório e geração não estão disponíveis sem a permissão patients.generate_report.'] },
  ],
};
