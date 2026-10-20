import type { Feature } from "../../app/features.js";
import { CONTRATOS_FIXTURES } from "./fixtures.js";
import { aditivosVigencia } from "./telas/vigencia.js";
import { carteira } from "./telas/carteira.js";
import { cobranca } from "./telas/cobranca.js";
import { diff } from "./telas/diff.js";
import { dossie } from "./telas/dossie.js";
import { ficha } from "./telas/ficha.js";
import { minutas } from "./telas/minutas.js";
import { novoContrato } from "./telas/novo.js";
import { partes } from "./telas/partes.js";
import { tabelas } from "./telas/tabelas.js";
import { torre } from "./telas/torre.js";

/**
 * Gestão de Contratos: do cadastro da parte ao encerramento, passando por
 * aprovação, assinatura, vigência, dossiê e cobrança. Cada tela registra as
 * rotas e os cenários dela em `telas/<tela>.ts`; aqui só se juntam, na ordem
 * do caminho do contrato.
 */
const TELAS: Feature[] = [torre, carteira, novoContrato, ficha, minutas, diff, aditivosVigencia, dossie, cobranca, partes, tabelas];

export const feature: Feature = {
  routes: TELAS.flatMap((t) => t.routes ?? []),
  scenarios: TELAS.flatMap((t) => t.scenarios ?? []),
  fixtures: [...CONTRATOS_FIXTURES],
};
