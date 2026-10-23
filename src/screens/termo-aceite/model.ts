/** Regras demonstrativas do handoff #1876. Não emite documentos jurídicos. */
export type Document = { title: string; hash: string; version: string };
export type Acceptance = {
  id: string; guardianId: string; at: string; ip: string; device: string;
  version: string; source: 'legacy' | 'documents'; documents: Document[];
};
export type Guardian = { id: string; name: string; relation: string; main?: boolean; acceptances: Acceptance[] };
export type AcceptanceGroup = Acceptance & { ids: string[] };
export type Report = { guardian: Guardian; status: 'generating' | 'ready' | 'error'; at: string };
export const NO_ACCEPTANCE = 'Nenhum aceite registrado para os responsáveis deste paciente.';

/** build4.py: janela inclusiva a partir do primeiro registro, sem encadear 0s/4s/8s. */
export function groupAcceptances(records: Acceptance[]): AcceptanceGroup[] {
  const groups: AcceptanceGroup[] = [];
  for (const record of [...records].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))) {
    const last = groups.at(-1);
    if (last && record.source === 'legacy' && last.source === record.source &&
      last.guardianId === record.guardianId && last.ip === record.ip &&
      last.device === record.device && last.version === record.version &&
      Date.parse(record.at) - Date.parse(last.at) <= 5000) {
      last.ids.push(record.id);
    } else groups.push({ ...record, ids: [record.id] });
  }
  return groups;
}

export function annexes(records: Acceptance[]) {
  const result: (Document & { number: number; acceptances: AcceptanceGroup[] })[] = [];
  const groups = groupAcceptances(records).sort((a, b) => a.version.localeCompare(b.version, undefined, { numeric: true }));
  for (const group of groups) for (const document of group.documents) {
    let annex = result.find((item) => item.hash === document.hash);
    if (!annex) {
      annex = { ...document, number: result.length + 1, acceptances: [] };
      result.push(annex);
    }
    if (!annex.acceptances.includes(group)) annex.acceptances.push(group);
  }
  return result;
}
export const eligibleGuardians = (guardians: Guardian[]) => guardians.filter((g) => g.acceptances.some((a) => a.guardianId === g.id));
export function createReports(guardians: Guardian[], at: string): Report[] {
  return eligibleGuardians(guardians).map((guardian) => ({ guardian, at, status: 'generating' }));
}
export const formatDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'medium',
}).format(new Date(value));
export const declarations: Record<string, string> = {
  '1': 'Declaro que li, compreendi e concordo com os documentos acima.',
  '2': 'Lendo todos documentos, está declarando que leu, compreendeu e concordou com os documentos acima.',
};
