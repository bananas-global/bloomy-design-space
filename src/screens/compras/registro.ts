import type { ControlGroup, Scenario } from "@brucesantos/design-space";
import type { Feature } from "../../app/features.js";
import { permissionsByRole, type Role } from "../../personas/permissions.js";
import { ComprasLista, PATH as LISTA } from "../ComprasLista.js";
import { ComprasSolicitacao, PATH as DETALHE } from "../ComprasSolicitacao.js";
import { COMPRAS_FIXTURES } from "./fixtures.js";
import { PAPEIS, type Papel } from "./model.js";
import { REGRAS } from "./regras.js";
import { PAPEL_CONTROL } from "./shared.js";

const FLOW = "Sistema de compras";
const sc = (id: string) => DETALHE.replace(":id", id);

/** Componentes do catálogo que as telas usam. */
const COMPONENTS = [
  "layout.backoffice", "core.breadcrumbs", "core.notification", "core.header", "core.card", "core.button", "core.input", "core.fake-input",
  "core.tag", "core.empty-state-card", "core.timeline-list",
];
const LISTA_COMPONENTS = [...COMPONENTS, "core.table", "core.drawer-modal", "core.file-uploader", "core.progress", "core.modal"];
const DETALHE_COMPONENTS = [...COMPONENTS, "core.drawer-modal", "core.item", "core.progress", "core.radio-group", "core.simple-table", "core.file-uploader", "core.checkgroup"];

const estado = (options: [string, string][]): ControlGroup => ({
  id: "situacao",
  title: "Situação da tela",
  controls: [{ id: "estado", label: "Estado", options: options.map(([value, label]) => ({ value, label })) }],
});
const visao = (p: Papel): ControlGroup => ({
  id: "visao",
  title: "Visão",
  note: "Quem está usando. Compras, Financeiro e CFO são papéis novos: no protótipo, a persona mais próxima mais as permissões purchases.*.",
  controls: [PAPEL_CONTROL(p)],
});

type S = Omit<Scenario, "fixture" | "persona" | "permissions" | "controls"> & {
  papel: Papel;
  fixture?: string;
  estado?: string;
  components: string[];
};

/** Cada cenário fixa a visão (controle `papel`) e herda a persona e as permissões dela. */
const scenario = ({ papel, estado: e, fixture = "compras.base", ...s }: S): Scenario => {
  const p = PAPEIS[papel];
  return {
    ...s,
    fixture,
    persona: p.persona,
    permissions: [...permissionsByRole[p.persona as Role], ...p.permissions],
    controls: { papel, ...(e ? { estado: e } : {}) },
    tags: [p.label, ...(s.tags ?? [])],
  };
};

const lista = (s: Omit<S, "route" | "components">) => scenario({ ...s, route: LISTA, components: LISTA_COMPONENTS });
const nova = (s: Omit<S, "route" | "components" | "papel"> & { papel?: Papel }) => scenario({ papel: "requisitante", ...s, route: LISTA, components: LISTA_COMPONENTS });
const detalhe = (id: string, s: Omit<S, "route" | "components">) => scenario({ ...s, route: sc(id), components: DETALHE_COMPONENTS });
const alcadas = (s: Omit<S, "route" | "components" | "estado"> & { estado?: string }) => scenario({ ...s, estado: s.estado ? `alcadas-${s.estado}` : "alcadas", route: LISTA, components: LISTA_COMPONENTS });

/** Sistema de compras: da solicitação na unidade à confirmação de chegada. */
export const feature: Feature = {
  rules: REGRAS,
  fixtures: [...COMPRAS_FIXTURES],
  scenarios: [
    /* --- Requisitante ------------------------------------------------ */
    nova({
      id: "compras.solicitacao",
      title: "Nova solicitação",
      estado: "nova",
      rules: ["compras.rn-01"],
      tags: ["celular"],
      intent: "A terapeuta, entre duas sessões, pede material pelo celular em menos de 30 segundos. Ver em viewport mobile.",
      expected: [
        "Drawer aberto pelo botão Nova solicitação da lista; no celular ocupa a tela toda.",
        "Três campos: o que precisa, quantidade e preciso até. A unidade não aparece: vem do vínculo de quem pede.",
        "Orçamento opcional: dá para enviar sem anexo.",
        "Rodapé fixo com Cancelar (ghost) à esquerda e Enviar para aprovação à direita, sempre à vista enquanto o formulário rola.",
      ],
    }),
    nova({
      id: "compras.solicitacao-erro",
      title: "Nova solicitação · erro de validação",
      estado: "nova-erro",
      tags: ["erro", "celular"],
      intent: "Enviar sem item, com quantidade zero e com data no passado.",
      expected: ["Aviso no topo e erro em cada campo: item, quantidade e data (\"Data já passou\").", "Corrigir um campo limpa o erro dele."],
    }),
    nova({
      id: "compras.solicitacao-enviada",
      title: "Solicitação enviada",
      estado: "enviada",
      tags: ["confirmação", "celular"],
      intent: "Depois de enviar, o drawer fecha e a solicitação aparece no topo da lista.",
      expected: ["Toast com o número (SC-0158) e com quem ela está.", "SC-0158 no topo de Minhas solicitações, em Aprovação da unidade."],
    }),
    lista({
      id: "compras.minhas",
      title: "Minhas solicitações",
      papel: "requisitante",
      rules: ["compras.rn-03", "compras.rf-02"],
      tags: ["celular"],
      intent: "A terapeuta acompanha o que pediu: a etapa, com quem está e, se voltou, o motivo.",
      expected: [
        "Cabeçalho e lista num cartão só: no celular, uma linha por solicitação; no desktop, tabela.",
        "Cada uma mostra a etapa (selo) e com quem está, com o cargo e há quanto tempo.",
        "Reprovada e devolvida têm um ícone ao lado da etapa; passar o mouse mostra o motivo.",
        "Clicar abre o detalhe na mesma visão (Juliana continua Juliana).",
        "Sino com o lembrete de confirmar a chegada da SC-0141.",
      ],
    }),
    lista({
      id: "compras.minhas-vazio",
      title: "Minhas solicitações · vazio",
      papel: "requisitante",
      fixture: "compras.vazio",
      tags: ["vazio"],
      intent: "Quem ainda não pediu nada.",
      expected: ["Estado vazio convidando a pedir; o botão Nova solicitação continua no cabeçalho."],
    }),
    detalhe("SC-0154", {
      id: "compras.ajuste",
      title: "Devolvida para ajuste",
      papel: "requisitante",
      rules: ["compras.rn-03"],
      intent: "A coordenação devolveu pedindo o modelo; a terapeuta corrige e reenvia.",
      expected: ["Motivo da devolução no topo do painel.", "Campos editáveis e Reenviar para aprovação, que volta a solicitação para a coordenação e entra no histórico."],
    }),
    detalhe("SC-0153", {
      id: "compras.reprovada",
      title: "Reprovada com motivo",
      papel: "requisitante",
      rules: ["compras.rn-03", "compras.rn-11"],
      tags: ["reprovação"],
      intent: "A terapeuta vê por que a coordenação reprovou.",
      expected: ["Etapa 2 (Aprovação da unidade) com o nó vermelho e o selo Reprovada.", "Motivo com quem reprovou; a solicitação está encerrada e não se edita.", "Atalho para uma nova solicitação."],
    }),

    /* --- Aprovador da unidade --------------------------------------- */
    lista({
      id: "compras.para-aprovar",
      title: "Para aprovar na unidade",
      papel: "aprovador",
      rules: ["compras.rn-02"],
      intent: "A coordenadora vê o que a unidade pediu e espera a decisão dela.",
      expected: ["Filtros: busca, Mostrar (Para aprovar (2), Da unidade, Minhas solicitações) e etapa.", "Abre em Para aprovar, com as solicitações da Unidade Jardim."],
    }),
    detalhe("SC-0156", {
      id: "compras.aprovacao-unidade",
      title: "Aprovação da unidade",
      papel: "aprovador",
      rules: ["compras.rn-02", "compras.rn-03"],
      intent: "A coordenadora decide se a unidade precisa do material.",
      expected: [
        "Resumo do pedido em uma frase, e o orçamento anexo no lado direito.",
        "Aprovar manda para a fila de Compras; Devolver para ajuste e Reprovar pedem um texto.",
        "A decisão entra no histórico com quem e quando.",
      ],
    }),
    detalhe("SC-0156", {
      id: "compras.devolver",
      title: "Devolver para ajuste",
      papel: "aprovador",
      estado: "devolver",
      rules: ["compras.rn-03"],
      intent: "Devolver pedindo o que falta, sem reprovar.",
      expected: ["Drawer com o que o requisitante precisa ajustar; Cancelar e Devolver no rodapé fixo.", "Ao devolver, a solicitação vai para \"Devolvida para ajuste\", com o requisitante."],
    }),
    detalhe("SC-0156", {
      id: "compras.reprovar",
      title: "Reprovar sem motivo",
      papel: "aprovador",
      estado: "reprovar-erro",
      rules: ["compras.rn-03"],
      tags: ["erro", "reprovação"],
      intent: "Tentar reprovar sem escrever o motivo.",
      expected: ["\"O motivo é obrigatório\" no campo; a reprovação não acontece sem texto."],
    }),
    detalhe("SC-0141", {
      id: "compras.chegada-aprovador",
      title: "Chegada confirmada pela coordenação",
      papel: "aprovador",
      rules: ["compras.rn-09"],
      intent: "A coordenadora recebeu a caixa e pode confirmar, mesmo sem ter pedido.",
      expected: ["Mesmo painel de chegada, com a nota de que o lembrete foi para a requisitante."],
    }),

    /* --- Comprador -------------------------------------------------- */
    lista({
      id: "compras.fila",
      title: "Todas as compras",
      papel: "comprador",
      rules: ["compras.rf-04", "compras.p-06"],
      intent: "Ana vê todas as compras numa lista só e filtra pela pendência para achar o que falta fazer.",
      expected: [
        "Uma tabela com as compras já aprovadas pelas unidades; as que ainda estão na unidade não aparecem.",
        "Filtros só em select, com rótulo: Mostrar (Todas as compras ou Notas com pendência), Pendência (Cotar, Aguardando aprovação de alçada, Aguardando nota, Aguardando confirmação de chegada, cada uma com a contagem), Etapa e Unidade.",
        "Sob o selo da etapa, há quanto tempo a compra está nela.",
        "Valor do pedido quando já existe; atalho para Alçadas no cabeçalho.",
      ],
    }),
    lista({
      id: "compras.fila-vazia",
      title: "Compras · vazio",
      papel: "comprador",
      fixture: "compras.vazio",
      tags: ["vazio"],
      intent: "Nenhuma compra ainda.",
      expected: ["Estado vazio explicando que as solicitações aprovadas pela unidade entram aqui."],
    }),
    detalhe("SC-0150", {
      id: "compras.cotacao",
      title: "Cotação com 3 fornecedores",
      papel: "comprador",
      rules: ["compras.rn-04", "compras.rn-05"],
      intent: "Cotar, negociar e escolher o vencedor, com as propostas uma abaixo da outra.",
      expected: [
        "Um cartão por fornecedor, um abaixo do outro: fornecedor, unitário, negociado, frete e prazo na mesma linha; pagamento e negociação abaixo; o total e Escolher no rodapé do cartão.",
        "Selo Menor total; Escolher marca o vencedor.",
        "Rodapé com o vencedor, o total e a alçada que o pedido vai precisar.",
        "Cadastrar fornecedor em cada cartão; Adicionar fornecedor, no fim da lista, abre um quarto cartão (ou mais), que pode ser removido. Sem rolagem horizontal.",
      ],
    }),
    detalhe("SC-0152", {
      id: "compras.cotacao-justificativa",
      title: "Menos de 3 cotações sem justificativa",
      papel: "comprador",
      estado: "justificativa-erro",
      rules: ["compras.rn-04"],
      tags: ["erro"],
      intent: "Só dois fabricantes vendem o balanço: emitir pede a justificativa.",
      expected: ["Selo \"2 de 3 cotações\" em amarelo.", "Bloco de justificativa com motivo (fornecedor único, urgência, outro) e texto, ambos obrigatórios para emitir."],
    }),
    detalhe("SC-0157", {
      id: "compras.cadastro-rapido",
      title: "Cadastro rápido de fornecedor",
      papel: "comprador",
      estado: "cadastro-fornecedor",
      rules: ["compras.rn-05"],
      intent: "O fornecedor cotado não existe no sistema; Ana cadastra sem sair da cotação.",
      expected: ["Drawer com CNPJ e razão social obrigatórios; contato e telefone opcionais.", "Ao salvar, o fornecedor entra no cartão de onde o cadastro foi aberto."],
    }),
    detalhe("SC-0157", {
      id: "compras.cadastro-item",
      title: "Cadastro rápido de item",
      papel: "comprador",
      estado: "cadastro-item",
      rules: ["compras.rn-05"],
      intent: "O item pedido não está no catálogo; o aviso no topo da cotação abre o cadastro.",
      expected: ["Nome já preenchido com o que o requisitante escreveu; unidade de medida e categoria."],
    }),
    detalhe("SC-0150", {
      id: "compras.pedido",
      title: "Emitir pedido dentro do limite",
      papel: "comprador",
      estado: "emitir",
      rules: ["compras.rn-06", "compras.rn-08"],
      intent: "Pedido de R$ 1.095,00: dentro do limite de Compras, sai aprovado.",
      expected: [
        "Número sequencial (PC-000323), fornecedor, quantidade e total.",
        "Os três níveis com Compras em destaque e \"Sai aprovado\".",
        "Consumo do limite de Compras no mês e no ano, já com este pedido; emitido, o valor soma no consumo que as Alçadas mostram.",
        "Aviso de que o pedido emitido não se edita.",
      ],
    }),
    detalhe("SC-0148", {
      id: "compras.pedido-financeiro",
      title: "Emitir pedido para o Financeiro",
      papel: "comprador",
      estado: "emitir",
      rules: ["compras.rn-06", "compras.rn-07"],
      intent: "Pedido de R$ 6.320,00: acima do limite de Compras, sobe para o Financeiro.",
      expected: ["Financeiro em destaque, com Rodrigo Kubo.", "O motivo: acima do limite por pedido de Compras (R$ 2.000,00).", "Botão Emitir e enviar ao Financeiro."],
    }),
    detalhe("SC-0152", {
      id: "compras.pedido-cfo",
      title: "Emitir pedido para o CFO",
      papel: "comprador",
      estado: "emitir",
      rules: ["compras.rn-06", "compras.rn-07"],
      intent: "Pedido de R$ 18.880,00: acima do limite do Financeiro, vai direto ao CFO.",
      expected: ["CFO em destaque; Compras e Financeiro aparecem como níveis ultrapassados.", "A justificativa das 2 cotações vai junto."],
    }),
    detalhe("SC-0147", {
      id: "compras.aguardando-alcada",
      title: "Pedido aguardando alçada",
      papel: "comprador",
      rules: ["compras.rn-07"],
      intent: "Ana acompanha o pedido que está com o Financeiro.",
      expected: ["O mesmo painel do Financeiro, só leitura, com o selo de com quem está."],
    }),
    detalhe("SC-0145", {
      id: "compras.pedido-aprovado",
      title: "Confirmar compra com o fornecedor",
      papel: "comprador",
      rules: ["compras.rn-08"],
      intent: "O pedido saiu aprovado; Ana fecha com o fornecedor e informa a previsão.",
      expected: ["Lembrete de passar o número do pedido ao fornecedor.", "Previsão de entrega obrigatória; ao confirmar, vai para Aguardando nota."],
    }),
    detalhe("SC-0144", {
      id: "compras.nota",
      title: "Vincular nota ao pedido",
      papel: "comprador",
      rules: ["compras.rn-08"],
      intent: "A nota chegou e confere com o pedido.",
      expected: [
        "Pedido e nota lado a lado: fornecedor e CNPJ, valor e itens, cada um com o ícone de que confere.",
        "Vincular ao pedido manda para a confirmação de chegada e lembra o requisitante.",
      ],
    }),
    detalhe("SC-0143", {
      id: "compras.nota-sem-cadastro",
      title: "Nota com fornecedor e item sem cadastro",
      papel: "financeiro",
      rules: ["compras.rn-05"],
      intent: "Ana cotou por telefone sem cadastrar; o Financeiro cadastra a partir da nota.",
      expected: [
        "Avisos de fornecedor e de item sem cadastro, cada um com o botão de cadastrar.",
        "Vincular só libera depois dos dois cadastros.",
      ],
    }),
    detalhe("SC-0143", {
      id: "compras.nota-cadastro-fornecedor",
      title: "Cadastrar fornecedor a partir da nota",
      papel: "financeiro",
      estado: "nota-fornecedor",
      rules: ["compras.rn-05"],
      intent: "CNPJ e razão social vêm da nota.",
      expected: ["CNPJ e razão social travados; contato e telefone opcionais."],
    }),
    detalhe("SC-0139", {
      id: "compras.divergencia",
      title: "Divergência registrada",
      papel: "comprador",
      rules: ["compras.rn-10"],
      intent: "Chegaram 8 de 12 potes; a divergência ficou registrada.",
      expected: ["Quem registrou, quando, o tipo e a descrição.", "A tratativa com o fornecedor é outro fluxo (fora deste card)."],
    }),

    /* --- Alçada ----------------------------------------------------- */
    lista({
      id: "compras.alcada-lista",
      title: "Pedidos para o Financeiro aprovar",
      papel: "financeiro",
      rules: ["compras.rn-06"],
      intent: "Rodrigo vê só o que passou do limite de Compras.",
      expected: ["Abre em Para aprovar (1); o filtro Mostrar troca para Todos os pedidos.", "Filtros de busca, etapa e unidade."],
    }),
    detalhe("SC-0147", {
      id: "compras.aprovacao-alcada",
      title: "Aprovação do Financeiro",
      papel: "financeiro",
      rules: ["compras.rn-06", "compras.rn-07", "compras.rn-11"],
      intent: "Rodrigo decide sobre um pedido de R$ 4.890,00.",
      expected: [
        "Por que está com ele: acima do limite por pedido de Compras.",
        "Os três níveis, com o Financeiro em destaque.",
        "Consumo do limite do Financeiro no mês e no ano, já com este pedido.",
        "As cotações comparadas, com o vencedor e a negociação.",
        "Aprovar, Pedir nova cotação ou Reprovar.",
      ],
    }),
    detalhe("SC-0147", {
      id: "compras.nova-cotacao",
      title: "Pedir nova cotação",
      papel: "financeiro",
      estado: "nova-cotacao",
      rules: ["compras.rn-07"],
      intent: "O problema é o preço, não a compra.",
      expected: ["Drawer com o que Compras deve buscar.", "O pedido é cancelado, o número não é reaproveitado e a solicitação volta para Cotação."],
    }),
    detalhe("SC-0146", {
      id: "compras.aprovacao-alcada-cfo",
      title: "Aprovação do CFO",
      papel: "cfo",
      rules: ["compras.rn-06", "compras.rn-07"],
      intent: "Rafael decide sobre um pedido de R$ 12.750,00, acima do limite do Financeiro.",
      expected: ["CFO em destaque; \"O CFO não tem limite\" no lugar do consumo.", "Mesmas três ações do Financeiro."],
    }),
    detalhe("SC-0146", {
      id: "compras.reprovar-pedido",
      title: "Reprovar pedido",
      papel: "cfo",
      estado: "reprovar-pedido",
      rules: ["compras.rn-07", "compras.rn-11"],
      tags: ["reprovação"],
      intent: "Reprovar o pedido; o requisitante é avisado com o motivo.",
      expected: ["Motivo obrigatório; a solicitação fica encerrada como Pedido reprovado."],
    }),

    /* --- Chegada e conclusão ---------------------------------------- */
    detalhe("SC-0141", {
      id: "compras.chegada",
      title: "Confirmar chegada",
      papel: "requisitante",
      rules: ["compras.rn-09", "compras.rn-10"],
      tags: ["celular"],
      intent: "A caixa chegou; a terapeuta confere e confirma.",
      expected: ["Quando o lembrete foi enviado.", "Uma pergunta, Chegou tudo certo?, com Sim e Não em radio; as perguntas da divergência só aparecem no Não.", "Confirmar conclui a compra."],
    }),
    detalhe("SC-0141", {
      id: "compras.chegada-divergencia",
      title: "Registrar divergência sem descrição",
      papel: "requisitante",
      estado: "divergencia-erro",
      rules: ["compras.rn-10"],
      tags: ["erro", "celular"],
      intent: "Escolher divergência e tentar registrar sem dizer o que aconteceu.",
      expected: ["Tipo (quantidade, item errado, avaria, devolução) e descrição obrigatórios; foto opcional.", "Botão vermelho Registrar divergência."],
    }),
    detalhe("SC-0138", {
      id: "compras.concluida",
      title: "Compra concluída",
      papel: "requisitante",
      rules: ["compras.rn-08", "compras.rn-11"],
      tags: ["confirmação"],
      intent: "O registro final: tudo ligado e o histórico completo.",
      expected: ["Todas as etapas do fluxo em verde.", "Solicitação → Pedido → Nota fiscal, pelos números.", "Histórico com cada decisão, de quem e quando."],
    }),

    /* --- Lacunas do card: propostas para o PO ------------------------- */
    detalhe("SC-0151", {
      id: "compras.autoaprovacao",
      title: "Pedido da própria coordenadora",
      papel: "aprovador",
      rules: ["compras.p-01"],
      tags: ["proposta"],
      intent: "Marina, que aprova a Unidade Jardim, pediu material: quem aprova é a supervisão.",
      expected: [
        "Com Renato Dias · Supervisão; Marina vê a solicitação como requisitante, sem Aprovar.",
        "A SC-0151 não aparece em Para aprovar da Marina.",
        "No rodapé, Cancelar minha solicitação.",
      ],
    }),
    detalhe("SC-0154", {
      id: "compras.cancelar",
      title: "Cancelar minha solicitação",
      papel: "requisitante",
      estado: "cancelar",
      rules: ["compras.p-04", "compras.rn-11"],
      tags: ["proposta"],
      intent: "Antes de chegar a Compras, quem pediu pode desistir.",
      expected: [
        "Drawer com o motivo opcional e o aviso de que só dá para cancelar antes de Compras.",
        "Cancelada, a solicitação encerra na etapa em que estava, com o nó Cancelada e o registro no histórico.",
      ],
    }),
    detalhe("SC-0148", {
      id: "compras.cotacao-prazo",
      title: "Fornecedor que entrega depois da data",
      papel: "comprador",
      rules: ["compras.p-05"],
      tags: ["proposta"],
      intent: "A unidade precisa até 10/11; um dos fornecedores entrega em 30 dias.",
      expected: [
        "No cartão da Movimento Kids, um selo vermelho: \"Entrega em 14/11, depois de 10/11\".",
        "Se o vencedor atrasa, o drawer de emissão avisa que a requisitante recebe o novo prazo.",
      ],
    }),
    detalhe("SC-0142", {
      id: "compras.nota-valor-diferente",
      title: "Nota com valor diferente do pedido",
      papel: "comprador",
      rules: ["compras.p-02", "compras.rn-08"],
      tags: ["proposta"],
      intent: "A nota veio R$ 45,00 acima do pedido: frete cobrado à parte.",
      expected: [
        "Linha Valor sem o ícone de confere; aviso \"A nota é R$ 45,00 maior que o pedido\".",
        "Justificativa obrigatória para vincular; o rodapé diz o que está pendente.",
        "Vinculada, a justificativa vai para o histórico e o Financeiro é avisado.",
      ],
    }),
    lista({
      id: "compras.notas-pendentes",
      title: "Notas com pendência do Financeiro",
      papel: "financeiro",
      estado: "notas",
      rules: ["compras.rn-05", "compras.p-02"],
      tags: ["proposta"],
      intent: "Rodrigo encontra as notas que não vinculam sem ele: fornecedor ou item sem cadastro, ou valor diferente.",
      expected: ["Mostrar: Notas com pendência (2), com a SC-0143 (cadastro) e a SC-0142 (valor)."],
    }),
    detalhe("SC-0140", {
      id: "compras.chegada-parcial",
      title: "Entrega parcial",
      papel: "requisitante",
      rules: ["compras.p-03", "compras.rn-09"],
      tags: ["proposta", "celular"],
      intent: "Chegaram 3 dos 6 bambolês; o resto vem depois.",
      expected: [
        "Aviso \"Entrega parcial: chegaram 3 de 6\".",
        "Pergunta \"O restante chegou?\" com Sim, Chegou mais uma parte e Não, houve divergência.",
        "Mais uma parte pede quantos chegaram e mantém a chegada pendente; Sim conclui.",
      ],
    }),
    detalhe("SC-0135", {
      id: "compras.pedido-reprovado",
      title: "Pedido reprovado na alçada",
      papel: "requisitante",
      rules: ["compras.rn-07", "compras.rn-11"],
      tags: ["reprovação"],
      intent: "Quem acompanha a solicitação vê por que o CFO reprovou o pedido da cama elástica.",
      expected: ["Fluxo encerrado na etapa Pedido, com o nó vermelho.", "Motivo do CFO e atalho para uma nova solicitação."],
    }),

    /* --- Configuração ----------------------------------------------- */
    alcadas({
      id: "compras.alcadas",
      title: "Configuração das alçadas",
      papel: "cfo",
      rules: ["compras.rn-06", "compras.rn-11"],
      intent: "Rafael ajusta os limites de Compras e do Financeiro.",
      expected: [
        "Drawer aberto pelo botão Alçadas da lista, com Cancelar e Salvar limites no rodapé fixo.",
        "Compras e Financeiro com limite por pedido, por mês e por ano, e o consumo atual.",
        "CFO sem limite.",
        "Alterações de limite no histórico.",
      ],
    }),
    alcadas({
      id: "compras.alcadas-erro",
      title: "Alçadas · limite inválido",
      papel: "cfo",
      estado: "erro",
      tags: ["erro"],
      intent: "O limite do Financeiro ficou abaixo do de Compras.",
      expected: ["\"Abaixo do de Compras\" no limite por pedido do Financeiro; nada é salvo."],
    }),
    alcadas({
      id: "compras.alcadas-confirmar",
      title: "Alçadas · confirmar alteração",
      papel: "financeiro",
      estado: "confirmar",
      rules: ["compras.rn-11"],
      intent: "Salvar pede o motivo, que vai para o histórico.",
      expected: ["Os novos limites valem para os próximos pedidos; os já aprovados não mudam."],
    }),
    alcadas({
      id: "compras.alcadas-leitura",
      title: "Alçadas · somente leitura",
      papel: "comprador",
      intent: "Compras consulta os limites, mas não altera.",
      expected: ["Campos desabilitados, o aviso de que o Financeiro e o CFO definem os limites e só Fechar no rodapé."],
    }),
  ],
  routes: [
    {
      path: LISTA,
      screen: ComprasLista,
      name: "Compras",
      group: FLOW,
      description: "As listas de cada papel: minhas solicitações, para aprovar, a fila do comprador e os pedidos da alçada. A nova solicitação e as alçadas abrem em drawers daqui.",
      controls: [visao("comprador"), estado([["lista", "Lista"], ["nova", "Nova solicitação"], ["nova-erro", "Nova solicitação com erro"], ["enviada", "Solicitação enviada"], ["notas", "Notas com pendência"], ["alcadas", "Alçadas"], ["alcadas-erro", "Alçadas · limite inválido"], ["alcadas-confirmar", "Alçadas · confirmar alteração"]])],
      components: LISTA_COMPONENTS,
    },
    {
      path: DETALHE,
      params: { id: "SC-0150" },
      screen: ComprasSolicitacao,
      name: "Solicitação",
      group: FLOW,
      description: "A solicitação em qualquer etapa: quem está com ela, o histórico e a ação da etapa atual.",
      controls: [
        visao("comprador"),
        estado([
          ["padrao", "Padrão"],
          ["devolver", "Devolver para ajuste"],
          ["reprovar", "Reprovar"],
          ["reprovar-erro", "Reprovar sem motivo"],
          ["cadastro-item", "Cadastro de item"],
          ["cadastro-fornecedor", "Cadastro de fornecedor"],
          ["justificativa-erro", "Cotação sem justificativa"],
          ["emitir", "Emitir pedido"],
          ["nova-cotacao", "Pedir nova cotação"],
          ["reprovar-pedido", "Reprovar pedido"],
          ["nota-fornecedor", "Cadastro pela nota"],
          ["divergencia", "Divergência na chegada"],
          ["divergencia-erro", "Divergência sem descrição"],
          ["cancelar", "Cancelar minha solicitação"],
        ]),
      ],
      expected: [
        "No topo, num cartão só: número, item, selo da etapa, quem pediu e o fluxo na horizontal (anterior, atual e próxima etapa com nome, estado e o que registraram).",
        "Colunas: dados da solicitação à esquerda; etapa atual e histórico no meio; o pedido à direita, quando já existe.",
        "As ações da etapa ficam no rodapé fixo, que some para quem não pode agir.",
      ],
      components: DETALHE_COMPONENTS,
    },
  ],
};
