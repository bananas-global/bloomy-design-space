import { useState } from "react";
import type { ScreenProps } from "@brucesantos/design-space";
import type {
  CredentialStatus,
  DocumentInsurer,
  DocumentState,
  InsurerDocumentsData,
  InsurerListData,
  InsurerProfile,
  TeamDocumentationRow,
} from "../contracts/index.js";
import { AppShell } from "../components/AppShell.js";
import { Icon } from "../components/Icon.js";
import { EmptyState, ErrorState, LoadingState } from "../components/primitives.js";
import { Button } from "../components/bloomy/Button.js";
import { Card } from "../components/bloomy/Card.js";
import { Input, Select } from "../components/bloomy/Input.js";
import { Avatar, SectionHeader } from "../components/bloomy/Layout.js";
import { Dropdown, DrawerModal, DropdownMenu } from "../components/bloomy/Overlay.js";
import { Table, type Coluna } from "../components/bloomy/Table.js";
import { ButtonTabs, LazyTabs, type ButtonTab, type LazyTabEntry } from "../components/bloomy/Tabs.js";
import { Tag } from "../components/bloomy/Tag.js";
import { UNIT_DOCUMENT_TYPES } from "../fixtures/documents.js";
import {
  abaBand,
  abaHours,
  credentialStatus,
  credentialStatusLabel,
  daysUntil,
  documentState,
  documentStateLabel,
  hasFile,
  missingForInsurer,
  STATE_SEVERITY,
  unitCredentialStatus,
  unitDocumentState,
  unitMissingForInsurer,
} from "../rules/documents.js";

/**
 * A ficha da operadora — aba Documentos.
 *
 * A mesma pasta vista do outro lado: aqui a pergunta não é "o que falta para a
 * Marina", é "quem desta clínica eu aceito". Por isso o escopo alterna entre
 * profissionais e unidades.
 */
export function InsurerDocuments({ params, context }: ScreenProps) {
  const { data, isLoading, error, permissions, can } = context;

  if (isLoading) return wrap(context, <LoadingState label="Carregando a operadora" />);
  if (error) return wrap(context, <ErrorState message={error.message} />);

  if (!can("health_cares.show")) {
    return wrap(
      context,
      <EmptyState
        title="Você não tem acesso à operadora"
        description="A ficha da operadora é de quem administra convênios. Fale com quem administra os acessos."
      />,
    );
  }

  /**
   * A lista e a ficha são o mesmo fluxo, e por isso a mesma fixture.
   *
   * Quando o dado vem da lista, a operadora é escolhida pelo id da rota. Duas
   * fixtures obrigariam a trocar o seletor de dados no meio do caminho — mesma
   * decisão da pasta da unidade.
   */
  const ficha = comoFicha(data, params.id);
  if (!ficha) {
    return wrap(
      context,
      <EmptyState
        title="Operadora não encontrada"
        description={`Nenhuma operadora com o identificador ${params.id ?? "informado"}.`}
      />,
    );
  }

  return <Conteudo context={context} ficha={ficha} permissions={permissions} />;
}

/** Aceita a ficha pronta ou a fixture da lista, escolhendo pelo id da rota. */
function comoFicha(data: unknown, id: string | undefined): InsurerDocumentsData | null {
  const bruto = data as (InsurerDocumentsData & Partial<InsurerListData>) | null;
  if (!bruto) return null;
  if (!bruto.insurers) return bruto;

  const linha = bruto.insurers.find((item) => item.insurer.id === id) ?? bruto.insurers[0];
  if (!linha) return null;

  return {
    now: bruto.now,
    insurer: linha.insurer,
    profile: linha.profile,
    professionals: linha.professionals,
    units: linha.units,
  };
}

function Etiqueta(props: React.ComponentProps<typeof Tag>) {
  return (
    <Tag {...props} className={["espelho-do-sistema", props.className].filter(Boolean).join(" ")} />
  );
}

type Escopo = "professionals" | "units";

/**
 * Os dois escopos da aba, no trilho de abas do sistema.
 *
 * Os ícones são os do menu do produto para cada assunto — `fa-user-md` para
 * profissionais, `fa-hospital` para unidades —, e não desenhos escolhidos aqui.
 */
const ESCOPOS: ButtonTab<Escopo>[] = [
  { id: "professionals", label: "Profissionais", icon: "fa-user-md" },
  { id: "units", label: "Unidades", icon: "fa-hospital" },
];

const TOM = {
  credentialed: "green",
  in_credentialing: "light-blue",
  not_credentialed: "brand",
  decredentialed: "red",
} as const;

function Conteudo({
  context,
  ficha,
  permissions,
}: {
  context: ScreenProps["context"];
  ficha: InsurerDocumentsData;
  permissions: string[];
}) {
  const hoje = ficha.now.slice(0, 10);
  const [escopo, setEscopo] = useState<Escopo>("professionals");
  const [aviso, setAviso] = useState("");
  const podeEditar = permissions.includes("health_cares.edit");

  /**
   * As linhas viram estado porque o drawer escreve nelas.
   *
   * Compartilhar é a única coisa que se decide desta tela, e a decisão precisa
   * aparecer: a contagem da coluna Documentos, a situação do credenciamento e a
   * própria ação da linha — que troca de Habilitar para Ações — são todas
   * derivadas do que está compartilhado. Sem estado, concluir o drawer não mudava
   * nada e a tela dizia a mesma coisa de antes.
   */
  const [linhas, setLinhas] = useState(ficha.professionals);
  const [unidades, setUnidades] = useState(ficha.units);
  /**
   * Quem está com o drawer aberto — profissional ou unidade.
   *
   * Guardamos o id e de qual tabela ele veio, e não o objeto: o objeto é
   * substituído a cada salvamento, e um estado com a cópia antiga reabriria o
   * drawer mostrando o que havia antes.
   */
  const [compartilhando, setCompartilhando] = useState<
    { escopo: "professionals"; id: string } | { escopo: "units"; id: string } | null
  >(null);

  /**
   * Um conjunto de filtros por escopo, e não um compartilhado.
   *
   * As duas tabelas têm colunas diferentes, e "situação" é a única pergunta que
   * as duas respondem. Um filtro só, guardado entre as abas, faria a pessoa
   * trocar de escopo e encontrar a lista já reduzida por um campo que a outra
   * tabela nem mostra.
   */
  const [filtrosProf, setFiltrosProf] = useState<FiltroDeProfissional>({
    nome: "",
    especialidade: "",
    formacao: "",
    credenciamento: "",
    situacao: "",
  });
  const [filtrosUnidade, setFiltrosUnidade] = useState<FiltroDeUnidade>({
    nome: "",
    cidade: "",
    situacao: "",
    credenciamento: "",
  });

  const situacaoDe = (linha: TeamDocumentationRow) =>
    credentialStatus(
      linha.links.find((item) => item.insurerId === ficha.insurer.id),
      linha.documents,
      ficha.insurer,
      hoje,
    );

  /** Quantos documentos com arquivo esta operadora já enxerga. */
  const compartilhadosDe = (linha: TeamDocumentationRow) =>
    linha.documents.filter(
      (doc) => hasFile(doc) && doc.sharedWith.some((s) => s.insurerId === ficha.insurer.id),
    ).length;

  /** O mesmo, do lado da unidade. */
  const compartilhadosDaUnidade = (item: InsurerDocumentsData["units"][number]) =>
    item.documents.filter((doc) => hasFile(doc) && doc.sharedWith.includes(ficha.insurer.id)).length;

  /**
   * O sujeito do drawer, montado a partir do estado atual.
   *
   * O tipo do documento é o que decide se ele é exigido, e os dois lados guardam
   * isso do mesmo jeito: `typeId` contra o `requires` da operadora. O nome do
   * documento da unidade sai do catálogo quando o registro não tem um próprio.
   */
  const sujeitoDoDrawer = (): SujeitoDoDrawer | null => {
    if (!compartilhando) return null;

    if (compartilhando.escopo === "professionals") {
      const linha = linhas.find((item) => item.professional.id === compartilhando.id);
      if (!linha) return null;
      const comArquivo = linha.documents.filter(hasFile);
      return {
        id: linha.professional.id,
        nome: linha.professional.name,
        detalhe: [
          linha.professional.specialty,
          linha.professional.council && `conselho ${linha.professional.council}`,
        ]
          .filter(Boolean)
          .join(" · "),
        rotuloDaLista: "Documentos do profissional",
        vazio: `${linha.professional.name} não tem anexo nenhum. A operadora audita o papel — anexe na pasta do profissional antes de compartilhar.`,
        itens: comArquivo.map((doc) => ({
          id: doc.id,
          nome: doc.name,
          file: doc.file,
          validUntil: doc.validUntil,
          estado: documentState(doc, hoje),
          exigido: ficha.insurer.requires.includes(doc.typeId),
        })),
        jaCompartilhados: comArquivo
          .filter((doc) => doc.sharedWith.some((s) => s.insurerId === ficha.insurer.id))
          .map((doc) => doc.id),
      };
    }

    const item = unidades.find((linha) => linha.unit.id === compartilhando.id);
    if (!item) return null;
    const comArquivo = item.documents.filter(hasFile);
    return {
      id: item.unit.id,
      nome: item.unit.name,
      detalhe: item.city,
      rotuloDaLista: "Documentos da unidade",
      vazio: `A ${item.unit.name} não tem anexo nenhum. A operadora audita o papel — anexe na pasta da unidade antes de compartilhar.`,
      itens: comArquivo.map((doc) => ({
        id: doc.id,
        nome:
          doc.name || UNIT_DOCUMENT_TYPES.find((tipo) => tipo.id === doc.typeId)?.name || "Documento",
        file: doc.file,
        validUntil: doc.validUntil,
        estado: unitDocumentState(doc, hoje),
        // A unidade credencia pelos doze documentos padrão do catálogo, e não pelo
        // `requires` da operadora — que lista tipos de profissional. É o mesmo
        // recorte de `unitMissingForInsurer`.
        exigido: UNIT_DOCUMENT_TYPES.some((tipo) => tipo.id === doc.typeId && tipo.standard),
      })),
      jaCompartilhados: comArquivo
        .filter((doc) => doc.sharedWith.includes(ficha.insurer.id))
        .map((doc) => doc.id),
    };
  };

  const contagem = {
    naoCredenciado: linhas.filter((l) => situacaoDe(l) === "not_credentialed").length,
    emCredenciamento: linhas.filter((l) => situacaoDe(l) === "in_credentialing").length,
    ativo: linhas.filter((l) => situacaoDe(l) === "credentialed").length,
    descredenciado: linhas.filter((l) => situacaoDe(l) === "decredentialed").length,
  };

  const unidadesCredenciadas = unidades.filter(
    (item) =>
      unitCredentialStatus(item.documents, UNIT_DOCUMENT_TYPES, ficha.insurer.id, hoje) ===
      "credentialed",
  ).length;

  const situacaoDaUnidade = (item: InsurerDocumentsData["units"][number]) =>
    unitCredentialStatus(item.documents, UNIT_DOCUMENT_TYPES, ficha.insurer.id, hoje);

  /**
   * As linhas que passam no filtro — e o resumo continua sendo do total.
   *
   * As pastilhas acima da tabela contam a lista inteira de propósito: elas dizem
   * quanto a operadora aceita da clínica, e essa resposta não muda porque alguém
   * digitou um nome na busca. O que o filtro muda é o rodapé de contagem.
   */
  const linhasVisiveis = linhas.filter((linha) =>
    passaProfissional(linha, filtrosProf, situacaoDe(linha), hoje),
  );
  const unidadesVisiveis = unidades.filter((item) =>
    passaUnidade(item, filtrosUnidade, situacaoDaUnidade(item), hoje),
  );

  const colunasProfissionais: Coluna<TeamDocumentationRow>[] = [
    {
      label: "Profissional",
      render: (linha) => (
        <div>
          <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
            {linha.professional.name}
          </p>
          <p className="m-0 text-sm text-[var(--fg-2)]">
            {linha.professional.active ? "" : "inativo na clínica"}
          </p>
        </div>
      ),
    },
    { label: "Especialidade", render: (linha) => linha.professional.specialty },
    {
      label: "Carga ABA",
      render: (linha) => {
        const horas = abaHours(linha.documents);
        return (
          <div>
            <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">{horas}h</p>
            <p className="m-0 text-sm text-[var(--fg-2)]">{abaBand(horas)}</p>
          </div>
        );
      },
    },
    {
      label: "Formações especiais",
      render: (linha) => {
        const formacoes = linha.documents
          .filter((doc) => doc.typeId === "special_training" && doc.training)
          .map((doc) => doc.training as string);
        return formacoes.length === 0 ? (
          <span className="text-[var(--fg-2)]">—</span>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {formacoes.map((nome) => (
              <Etiqueta key={nome} item={nome} variant="light-purple" />
            ))}
          </div>
        );
      },
    },
    {
      label: "Credenciamento",
      render: (linha) => {
        const situacao = situacaoDe(linha);
        return <Etiqueta item={credentialStatusLabel(situacao)} variant={TOM[situacao]} />;
      },
    },
    {
      label: "Documentos",
      render: (linha) => {
        const compartilhados = compartilhadosDe(linha);
        const faltando = missingForInsurer(linha.documents, ficha.insurer, hoje).length;
        return (
          <div className="flex items-center gap-2">
            <span>{compartilhados}</span>
            {faltando > 0 && (
              <span className="text-sm font-bold text-[var(--color-orange-dark)]">
                <Icon name="fa-triangle-exclamation" className="mr-1" />
                falta {faltando}
              </span>
            )}
          </div>
        );
      },
    },
  ];

  const colunasUnidades: Coluna<InsurerDocumentsData["units"][number]>[] = [
    {
      label: "Unidade",
      render: (item) => (
        <span className="font-bold text-[var(--color-brand-purple-dark)]">{item.unit.name}</span>
      ),
    },
    { label: "Cidade", render: (item) => item.city },
    {
      label: "Documentos compartilhados",
      render: (item) =>
        String(item.documents.filter((doc) => doc.sharedWith.includes(ficha.insurer.id)).length),
    },
    {
      label: "Pendências",
      render: (item) => {
        const faltando = unitMissingForInsurer(
          item.documents,
          UNIT_DOCUMENT_TYPES,
          ficha.insurer.id,
          hoje,
        ).length;
        return faltando === 0 ? (
          <span className="text-[var(--fg-2)]">—</span>
        ) : (
          <span className="text-sm font-bold text-[var(--color-orange-dark)]">
            <Icon name="fa-triangle-exclamation" className="mr-1" />
            falta {faltando}
          </span>
        );
      },
    },
    {
      label: "Credenciamento",
      render: (item) => {
        const situacao = unitCredentialStatus(
          item.documents,
          UNIT_DOCUMENT_TYPES,
          ficha.insurer.id,
          hoje,
        );
        return (
          <Etiqueta
            item={situacao === "credentialed" ? "Credenciada" : credentialStatusLabel(situacao)}
            variant={TOM[situacao]}
          />
        );
      },
    },
  ];

  return wrap(
    context,
    <div className="space-y-6">
      <LazyTabs
        className="espelho-do-sistema"
        id="abas-da-operadora"
        label="Ficha da operadora"
        value="documents"
        onChange={() => undefined}
        tabs={abasDaOperadora(podeEditar)}
        header={
          <CabecalhoDaOperadora
            insurer={ficha.insurer}
            perfil={ficha.profile}
            podeEditar={podeEditar}
          />
        }
      >
        <Card>
          {/* O trilho de abas do sistema, como nas outras duas pastas. Aqui ele
              é mais do que troca de visão: profissionais e unidades são dois
              conjuntos diferentes, e é exatamente para isso que `button_tabs/1`
              existe no produto. */}
          <ButtonTabs
            className="espelho-do-sistema"
            id="escopos-da-operadora"
            label="Escopo dos documentos"
            tabs={ESCOPOS}
            value={escopo}
            onChange={setEscopo}
            header={<SectionHeader variant="small">Documentos</SectionHeader>}
            panelClassName="space-y-6"
          >
          {escopo === "professionals" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Etiqueta item={`${contagem.naoCredenciado} não credenciados`} variant="brand" />
                <Etiqueta item={`${contagem.emCredenciamento} em credenciamento`} variant="light-blue" />
                <Etiqueta item={`${contagem.ativo} ativos`} variant="green" />
                <Etiqueta item={`${contagem.descredenciado} descredenciados`} variant="red" />
              </div>

              <FiltrosDeProfissional
                linhas={linhas}
                hoje={hoje}
                situacaoDe={situacaoDe}
                valores={filtrosProf}
                onChange={setFiltrosProf}
              />

              <Table
                id="profissionais-da-operadora"
                rows={linhasVisiveis}
                rowId={(linha) => linha.professional.id}
                cols={colunasProfissionais}
                actions={(linha) => (
                  <AcaoDaLinha
                    id={linha.professional.id}
                    compartilhados={compartilhadosDe(linha)}
                    podeEditar={podeEditar}
                    onCompartilhar={() =>
                      setCompartilhando({ escopo: "professionals", id: linha.professional.id })
                    }
                    onExportar={(modo) =>
                      setAviso(
                        `Exportação ${modo} dos documentos de ${linha.professional.name} preparada.`,
                      )
                    }
                  />
                )}
              />

              <Contagem
                mostrando={linhasVisiveis.length}
                total={linhas.length}
                singular="profissional"
                plural="profissionais"
              />
            </>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Etiqueta
                  item={`${unidades.length - unidadesCredenciadas} pendentes`}
                  variant="light-blue"
                />
                <Etiqueta item={`${unidadesCredenciadas} credenciadas`} variant="green" />
              </div>

              <FiltrosDeUnidade
                itens={unidades}
                hoje={hoje}
                situacaoDe={situacaoDaUnidade}
                valores={filtrosUnidade}
                onChange={setFiltrosUnidade}
              />

              <Table
                id="unidades-da-operadora"
                rows={unidadesVisiveis}
                rowId={(item) => item.unit.id}
                cols={colunasUnidades}
                actions={(item) => (
                  <AcaoDaLinha
                    id={item.unit.id}
                    compartilhados={compartilhadosDaUnidade(item)}
                    podeEditar={podeEditar}
                    onCompartilhar={() =>
                      setCompartilhando({ escopo: "units", id: item.unit.id })
                    }
                    onExportar={(modo) =>
                      setAviso(
                        `Exportação ${modo} dos documentos de ${item.unit.name} preparada.`,
                      )
                    }
                  />
                )}
              />

              <Contagem
                mostrando={unidadesVisiveis.length}
                total={unidades.length}
                singular="unidade"
                plural="unidades"
              />
            </>
          )}
          </ButtonTabs>
        </Card>
      </LazyTabs>

      <CompartilharComOperadora
        sujeito={sujeitoDoDrawer()}
        hoje={hoje}
        podeEditar={podeEditar}
        onClose={() => setCompartilhando(null)}
        onSave={(escolhidos) => {
          const alvo = compartilhando;
          if (!alvo) return;

          /**
           * O nome cru, sem artigo nem substantivo antes.
           *
           * "da unidade X" parece mais natural até o nome ser "Unidade Girassol",
           * e aí sai "da unidade Unidade Girassol"; "da Itu" é errado do outro
           * lado. "de X" está certo para todos os nomes das duas tabelas.
           */
          const nome =
            alvo.escopo === "professionals"
              ? (linhas.find((item) => item.professional.id === alvo.id)?.professional.name ?? "")
              : (unidades.find((item) => item.unit.id === alvo.id)?.unit.name ?? "");

          if (alvo.escopo === "professionals") {
            setLinhas((atuais) =>
              atuais.map((item) =>
                item.professional.id === alvo.id
                  ? aplicarCompartilhamento(item, ficha.insurer.id, escolhidos, hoje)
                  : item,
              ),
            );
          } else {
            setUnidades((atuais) =>
              atuais.map((item) =>
                item.unit.id === alvo.id
                  ? aplicarCompartilhamentoDaUnidade(item, ficha.insurer.id, escolhidos)
                  : item,
              ),
            );
          }

          setCompartilhando(null);
          // A concordância é do plural inteiro, e não só do substantivo: "1
          // documento compartilhados" perde a autoridade de uma especificação que
          // exige precisão de quem a implementa.
          setAviso(
            escolhidos.length === 0
              ? `Nenhum documento de ${nome} fica com ${ficha.insurer.name}.`
              : escolhidos.length === 1
                ? `1 documento de ${nome} compartilhado com ${ficha.insurer.name}.`
                : `${escolhidos.length} documentos de ${nome} compartilhados com ${ficha.insurer.name}.`,
          );
        }}
      />

      <p className="sr-only" role="status" aria-live="polite">
        {aviso}
      </p>
    </div>,
    ficha,
  );
}

/* ================================================================ filtros */

type FiltroDeProfissional = {
  nome: string;
  especialidade: string;
  formacao: string;
  credenciamento: string;
  situacao: string;
};

type FiltroDeUnidade = {
  nome: string;
  cidade: string;
  situacao: string;
  credenciamento: string;
};

/** O valor de "nada pendente", que não é um estado de documento. */
const EM_DIA = "em_dia";

/**
 * Os estados dos documentos de um profissional.
 *
 * **Registro sem arquivo é ausência**, a mesma leitura da lista de unidades:
 * `documentState` só responde `missing` para documento que não existe, e o que
 * existe sem anexo sairia como válido. A operadora audita o papel.
 */
function estadosDoProfissional(linha: TeamDocumentationRow, hoje: string): DocumentState[] {
  return linha.documents.map((doc) => (hasFile(doc) ? documentState(doc, hoje) : "missing"));
}

/** O mesmo, do lado da unidade — com o estado a mais, aguardando vigência. */
function estadosDaUnidade(
  item: InsurerDocumentsData["units"][number],
  hoje: string,
): (DocumentState | "not_in_force")[] {
  return item.documents.map((doc) => (hasFile(doc) ? unitDocumentState(doc, hoje) : "missing"));
}

/** Pendência é o que cobra trabalho: vencido, ausente ou a vencer. */
const PENDENTES: (DocumentState | "not_in_force")[] = ["expired", "missing", "expiring"];

/**
 * As opções de situação saem do que a lista tem, mais "Em dia".
 *
 * Derivar é a mesma regra dos filtros da pasta: um filtro que oferece "Vencido"
 * numa lista sem nenhum vencido ensina a pessoa a filtrar para o vazio. "Em dia"
 * é a exceção e entra sempre — ela é a ausência de pendência, não um estado.
 *
 * **Só os estados que pedem trabalho entram**, mais "Aguardando vigência". Aqui o
 * filtro é sobre a *pessoa*, e não sobre o documento como na pasta: "quem tem
 * algum documento válido" é quase todo mundo e não responde nada, enquanto na
 * pasta "Válido" separa um documento dos outros. Dispensado fica fora pelo mesmo
 * motivo — ele é a ausência de exigência.
 */
const SITUACOES_UTEIS: (DocumentState | "not_in_force")[] = [
  "expired",
  "missing",
  "expiring",
  "not_in_force",
];

function opcoesDeSituacao(estados: (DocumentState | "not_in_force")[][]) {
  const presentes = new Set(estados.flat());
  return [
    ...SITUACOES_UTEIS.filter((estado) => presentes.has(estado))
      .sort((a, b) => STATE_SEVERITY[a] - STATE_SEVERITY[b])
      .map((estado) => ({ label: documentStateLabel(estado), value: estado as string })),
    { label: "Em dia", value: EM_DIA },
  ];
}

/** As opções de credenciamento presentes, na ordem da fila de trabalho. */
function opcoesDeCredenciamento(situacoes: CredentialStatus[]) {
  const ordem: CredentialStatus[] = [
    "decredentialed",
    "not_credentialed",
    "in_credentialing",
    "credentialed",
  ];
  const presentes = new Set(situacoes);
  return ordem
    .filter((situacao) => presentes.has(situacao))
    .map((situacao) => ({ label: credentialStatusLabel(situacao), value: situacao }));
}

function combinaComSituacao(estados: (DocumentState | "not_in_force")[], escolhido: string) {
  if (!escolhido) return true;
  if (escolhido === EM_DIA) return !estados.some((estado) => PENDENTES.includes(estado));
  return estados.includes(escolhido as DocumentState | "not_in_force");
}

function contem(campo: string, busca: string) {
  const termo = busca.trim().toLowerCase();
  return !termo || campo.toLowerCase().includes(termo);
}

/** As formações especiais certificadas de um profissional. */
function formacoesDe(linha: TeamDocumentationRow): string[] {
  return linha.documents
    .filter((doc) => doc.typeId === "special_training" && doc.training)
    .map((doc) => doc.training as string);
}

function passaProfissional(
  linha: TeamDocumentationRow,
  valores: FiltroDeProfissional,
  situacao: CredentialStatus,
  hoje: string,
): boolean {
  if (!contem(linha.professional.name, valores.nome)) return false;
  if (valores.especialidade && linha.professional.specialty !== valores.especialidade) return false;
  if (valores.formacao && !formacoesDe(linha).includes(valores.formacao)) return false;
  if (valores.credenciamento && situacao !== valores.credenciamento) return false;
  return combinaComSituacao(estadosDoProfissional(linha, hoje), valores.situacao);
}

function passaUnidade(
  item: InsurerDocumentsData["units"][number],
  valores: FiltroDeUnidade,
  situacao: CredentialStatus,
  hoje: string,
): boolean {
  if (!contem(item.unit.name, valores.nome)) return false;
  if (valores.cidade && item.city !== valores.cidade) return false;
  if (valores.credenciamento && situacao !== valores.credenciamento) return false;
  return combinaComSituacao(estadosDaUnidade(item, hoje), valores.situacao);
}

/** Grade dos filtros. Cinco campos no profissional, quatro na unidade. */
const GRADE = "grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5";

function FiltrosDeProfissional({
  linhas,
  hoje,
  situacaoDe,
  valores,
  onChange,
}: {
  linhas: TeamDocumentationRow[];
  hoje: string;
  situacaoDe: (linha: TeamDocumentationRow) => CredentialStatus;
  valores: FiltroDeProfissional;
  onChange: (valores: FiltroDeProfissional) => void;
}) {
  const especialidades = [...new Set(linhas.map((linha) => linha.professional.specialty))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ label: nome, value: nome }));

  const formacoes = [...new Set(linhas.flatMap(formacoesDe))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ label: nome, value: nome }));

  return (
    <div className={GRADE}>
      <Input
        id="operadora-prof-nome"
        label="Nome"
        placeholder="Buscar por nome"
        rightIcon="fa-search"
        value={valores.nome}
        onChange={(evento) => onChange({ ...valores, nome: evento.target.value })}
      />
      <Select
        id="operadora-prof-especialidade"
        label="Especialidade"
        prompt="Todas"
        value={valores.especialidade}
        options={especialidades}
        onChange={(especialidade) => onChange({ ...valores, especialidade })}
      />
      {/* Sem formação especial na clínica, o campo sairia com a lista vazia — e
          um seletor que só oferece "Todas" é um controle que não decide nada. */}
      {formacoes.length > 0 && (
        <Select
          id="operadora-prof-formacao"
          label="Formação especial"
          prompt="Todas"
          value={valores.formacao}
          options={formacoes}
          onChange={(formacao) => onChange({ ...valores, formacao })}
        />
      )}
      <Select
        id="operadora-prof-credenciamento"
        label="Credenciamento"
        prompt="Todos"
        value={valores.credenciamento}
        options={opcoesDeCredenciamento(linhas.map(situacaoDe))}
        onChange={(credenciamento) => onChange({ ...valores, credenciamento })}
      />
      <Select
        id="operadora-prof-situacao"
        label="Situação dos documentos"
        prompt="Todas"
        value={valores.situacao}
        options={opcoesDeSituacao(linhas.map((linha) => estadosDoProfissional(linha, hoje)))}
        onChange={(situacao) => onChange({ ...valores, situacao })}
      />
    </div>
  );
}

function FiltrosDeUnidade({
  itens,
  hoje,
  situacaoDe,
  valores,
  onChange,
}: {
  itens: InsurerDocumentsData["units"];
  hoje: string;
  situacaoDe: (item: InsurerDocumentsData["units"][number]) => CredentialStatus;
  valores: FiltroDeUnidade;
  onChange: (valores: FiltroDeUnidade) => void;
}) {
  const cidades = [...new Set(itens.map((item) => item.city))]
    .sort((a, b) => a.localeCompare(b, "pt-BR"))
    .map((nome) => ({ label: nome, value: nome }));

  return (
    <div className={GRADE}>
      <Input
        id="operadora-unidade-nome"
        label="Unidade"
        placeholder="Buscar por nome"
        rightIcon="fa-search"
        value={valores.nome}
        onChange={(evento) => onChange({ ...valores, nome: evento.target.value })}
      />
      <Select
        id="operadora-unidade-cidade"
        label="Cidade"
        prompt="Todas"
        value={valores.cidade}
        options={cidades}
        onChange={(cidade) => onChange({ ...valores, cidade })}
      />
      <Select
        id="operadora-unidade-situacao"
        label="Situação dos documentos"
        prompt="Todas"
        value={valores.situacao}
        options={opcoesDeSituacao(itens.map((item) => estadosDaUnidade(item, hoje)))}
        onChange={(situacao) => onChange({ ...valores, situacao })}
      />
      <Select
        id="operadora-unidade-credenciamento"
        label="Credenciamento"
        prompt="Todos"
        value={valores.credenciamento}
        options={opcoesDeCredenciamento(itens.map(situacaoDe))}
        onChange={(credenciamento) => onChange({ ...valores, credenciamento })}
      />
    </div>
  );
}

/** Rodapé de contagem, que é onde o filtro aparece. */
function Contagem({
  mostrando,
  total,
  singular,
  plural,
}: {
  mostrando: number;
  total: number;
  singular: string;
  plural: string;
}) {
  return (
    <p className="m-0 text-sm text-[var(--fg-2)]">
      Mostrando {mostrando} de {total} {total === 1 ? singular : plural}
    </p>
  );
}

/* ======================================================== ação da linha */

/**
 * O que a linha oferece depende de já haver algo compartilhado.
 *
 * **Sem nada compartilhado, a ação é uma só:** Habilitar, que abre o drawer para
 * escolher os documentos. Exportar não faz sentido antes disso — não há o que
 * exportar —, e um menu de três itens em que dois estão mortos ensina a pessoa a
 * abrir o menu para nada.
 *
 * **Com algo compartilhado, a ação vira menu:** Exportar separados, Exportar
 * consolidado e Compartilhamento, que reabre o mesmo drawer para revisar a
 * escolha.
 *
 * A pergunta é "há documento compartilhado", e não a situação do credenciamento.
 * As duas quase sempre coincidem e divergem justamente no caso que importa: o
 * descredenciado manual continua com os documentos que compartilhou, e precisa do
 * menu para que alguém consiga tirá-los.
 *
 * **Serve as duas tabelas da aba.** A pergunta que a operadora faz é a mesma dos
 * dois lados — "o que desta clínica eu já enxergo" —, e a unidade tem a mesma
 * resposta possível que o profissional: nada compartilhado, ou algo. Duas ações
 * diferentes para a mesma decisão obrigariam a aprender a tela duas vezes.
 */
function AcaoDaLinha({
  id,
  compartilhados,
  podeEditar,
  onCompartilhar,
  onExportar,
}: {
  id: string;
  compartilhados: number;
  podeEditar: boolean;
  onCompartilhar: () => void;
  onExportar: (modo: "separada" | "consolidada") => void;
}) {
  if (compartilhados === 0) {
    return (
      <Button
        className="espelho-do-sistema"
        size="small"
        variant="tint"
        leftIcon="fa-user-plus"
        disabled={!podeEditar}
        title={podeEditar ? undefined : "Compartilhar documento é de quem administra convênios."}
        onClick={onCompartilhar}
      >
        Habilitar
      </Button>
    );
  }

  const itemClasses =
    "flex h-12 w-full items-center gap-3 rounded-md border-0 bg-transparent px-3 text-left font-bold text-[var(--color-neutral-600)] hover:bg-[var(--color-brand-purple-dark)]/5 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <Dropdown
      id={`acoes-${id}`}
      trigger={
        <span className="espelho-do-sistema flex h-8 items-center gap-2 rounded-lg bg-[var(--color-brand-purple-dark)]/8 px-2 py-2.5 text-sm font-bold text-[var(--color-brand-purple-dark)]">
          <Icon name="fa-ellipsis-vertical" />
          Ações
        </span>
      }
    >
      <button type="button" className={itemClasses} onClick={() => onExportar("separada")}>
        <Icon name="fa-copy" className="text-[var(--color-blue)]" />
        Exportar separados
      </button>
      <button type="button" className={itemClasses} onClick={() => onExportar("consolidada")}>
        <Icon name="fa-file-pdf" className="text-[var(--color-blue)]" />
        Exportar consolidado
      </button>
      {/* Separador: as duas exportações não mudam nada, e compartilhar muda o
          que a operadora enxerga. É a única linha do menu que escreve. */}
      <div className="my-1 border-t border-[var(--color-neutral-200)]/70" aria-hidden="true" />
      <button
        type="button"
        className={itemClasses}
        disabled={!podeEditar}
        title={podeEditar ? undefined : "Compartilhar documento é de quem administra convênios."}
        onClick={onCompartilhar}
      >
        <Icon name="fa-share-nodes" className="text-[var(--color-blue)]" />
        Compartilhamento
      </button>
    </Dropdown>
  );
}

/* ======================================================== compartilhamento */

/**
 * Aplica a escolha do drawer aos documentos da linha.
 *
 * **Desmarcar é revogar,** a mesma decisão da pasta do profissional: o documento
 * que sai da seleção sai de `sharedWith`. E a data de compartilhamento dos que já
 * estavam lá é preservada — ela é quando a operadora passou a enxergar aquele
 * papel, não quando alguém abriu o drawer pela última vez.
 *
 * Sem `Date.now()`: a data de hoje vem do `now` declarado na fixture.
 */
function aplicarCompartilhamento(
  linha: TeamDocumentationRow,
  insurerId: string,
  escolhidos: string[],
  hoje: string,
): TeamDocumentationRow {
  return {
    ...linha,
    documents: linha.documents.map((doc) => {
      const jaTinha = doc.sharedWith.find((item) => item.insurerId === insurerId);
      const outras = doc.sharedWith.filter((item) => item.insurerId !== insurerId);
      if (!escolhidos.includes(doc.id)) return { ...doc, sharedWith: outras };
      return { ...doc, sharedWith: [...outras, { insurerId, at: jaTinha?.at ?? hoje }] };
    }),
  };
}

/**
 * O mesmo, do lado da unidade.
 *
 * A regra é idêntica e a estrutura não: `sharedWith` da unidade é uma lista de
 * ids, sem data. Não há o que preservar, e por isso não há `hoje` aqui — uma
 * assinatura simétrica com um parâmetro que ninguém usa é pior que duas honestas.
 */
function aplicarCompartilhamentoDaUnidade(
  item: InsurerDocumentsData["units"][number],
  insurerId: string,
  escolhidos: string[],
): InsurerDocumentsData["units"][number] {
  return {
    ...item,
    documents: item.documents.map((doc) => {
      const outras = doc.sharedWith.filter((id) => id !== insurerId);
      return {
        ...doc,
        sharedWith: escolhidos.includes(doc.id) ? [...outras, insurerId] : outras,
      };
    }),
  };
}

/**
 * O que o drawer precisa saber, dos dois lados.
 *
 * A pasta do profissional e a da unidade guardam o compartilhamento de formas
 * diferentes — lá `sharedWith` tem operadora e data, aqui é só a lista de ids — e
 * a unidade tem um estado que o profissional não tem, o alvará aguardando
 * vigência. Nada disso muda a escolha que a pessoa faz, então quem chama traduz e
 * o drawer é um só.
 */
type ItemCompartilhavel = {
  id: string;
  nome: string;
  file?: string;
  validUntil?: string;
  estado: DocumentState | "not_in_force";
  /** Esta operadora exige este tipo. */
  exigido: boolean;
};

/** Quem está compartilhando: o profissional ou a unidade. */
type SujeitoDoDrawer = {
  id: string;
  nome: string;
  /** A linha de baixo do cartão: especialidade e conselho, ou cidade. */
  detalhe: string;
  /** O rótulo da lista — "Documentos do profissional" ou "da unidade". */
  rotuloDaLista: string;
  /** O que dizer quando não há um único anexo. */
  vazio: string;
  itens: ItemCompartilhavel[];
  jaCompartilhados: string[];
};

/**
 * Escolher o que esta operadora enxerga.
 *
 * O drawer é o mesmo de sempre — moldura da decisão 0014, título preso no topo e
 * ação presa no rodapé —, e o conteúdo é uma lista de escolha: o sujeito em um
 * cartão, e abaixo um item por documento com a situação à direita.
 *
 * **Só documento com arquivo entra na lista.** É `canShare` dito em outra forma:
 * a operadora audita o papel, e um registro sem anexo é recusado como se não
 * existisse. Mostrar a linha desabilitada convidaria a marcá-la; o que falta ali
 * é o anexo, e ele se resolve na pasta de origem.
 *
 * A situação vem do mesmo `documentState` das outras telas, o que faz o drawer
 * dizer "Vencido" no documento que a operadora vai recusar — a escolha continua
 * possível, e é uma decisão de quem opera, não do formulário.
 */
function CompartilharComOperadora({
  sujeito,
  hoje,
  podeEditar,
  onClose,
  onSave,
}: {
  sujeito: SujeitoDoDrawer | null;
  hoje: string;
  podeEditar: boolean;
  onClose: () => void;
  onSave: (escolhidos: string[]) => void;
}) {
  const jaCompartilhados = sujeito?.jaCompartilhados ?? [];

  /**
   * `undefined` enquanto ninguém tocou: a lista abre com o que já está
   * compartilhado, e a chave do drawer reinicia isto a cada linha aberta.
   */
  const [escolhidos, setEscolhidos] = useState<string[] | undefined>(undefined);
  const selecionados = escolhidos ?? jaCompartilhados;

  const alterna = (id: string, marcado: boolean) =>
    setEscolhidos((atual) => {
      const base = atual ?? jaCompartilhados;
      return marcado ? [...base, id] : base.filter((item) => item !== id);
    });

  return (
    <DrawerModal
      id="compartilhar-com-operadora"
      key={sujeito?.id ?? "vazio"}
      show={sujeito !== null}
      onCancel={onClose}
      title="Compartilhar com operadora"
      variant="medium"
      footer={
        <div className="flex justify-end">
          <Button
            rightIcon="fa-check"
            disabled={!podeEditar}
            title={podeEditar ? undefined : "Compartilhar documento é de quem administra convênios."}
            onClick={() => onSave(selecionados)}
          >
            Concluir
          </Button>
        </div>
      }
    >
      {sujeito && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 rounded-xl bg-[var(--color-brand-purple-dark)]/5 p-4">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-blue)] text-xs font-black text-white"
            >
              {iniciais(sujeito.nome)}
            </span>
            <div className="min-w-0">
              <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">{sujeito.nome}</p>
              <p className="m-0 text-sm text-[var(--fg-2)]">{sujeito.detalhe}</p>
            </div>
          </div>

          <div>
            <p className="m-0 mb-2 text-xs font-bold uppercase tracking-wide text-[var(--fg-2)]">
              {sujeito.rotuloDaLista}
            </p>

            {sujeito.itens.length === 0 ? (
              <EmptyState title="Nenhum documento com arquivo" description={sujeito.vazio} />
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {sujeito.itens.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-4 rounded-xl border border-[var(--color-brand-purple-dark)]/10 p-4 transition-colors has-[input:checked]:border-[var(--color-brand-blue)] has-[input:checked]:bg-[var(--color-brand-blue)]/8">
                      <input
                        type="checkbox"
                        className="h-6 w-6 shrink-0 rounded border-2 border-[var(--color-brand-purple-dark)]/10 text-[var(--color-brand-blue)] checked:border-[var(--color-brand-blue)] focus:ring-0"
                        checked={selecionados.includes(item.id)}
                        disabled={!podeEditar}
                        onChange={(evento) => alterna(item.id, evento.target.checked)}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="m-0 font-bold text-[var(--color-brand-purple-dark)]">
                          {item.nome}
                          {/* O que esta operadora exige, marcado na própria
                              linha: é o que separa o documento que destrava o
                              credenciamento do que só engorda a pasta. */}
                          {item.exigido && (
                            <Etiqueta item="Exigido" variant="light-purple" className="ml-2" />
                          )}
                        </p>
                        <p className="m-0 text-sm text-[var(--fg-2)]">
                          {item.validUntil ? `válido até ${br(item.validUntil)}` : "sem validade"} ·{" "}
                          {item.file}
                        </p>
                      </div>
                      <Etiqueta
                        item={documentStateLabel(
                          item.estado,
                          item.validUntil ? daysUntil(item.validUntil, hoje) : undefined,
                        )}
                        variant={TOM_DO_ESTADO[item.estado]}
                      />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </DrawerModal>
  );
}

const TOM_DO_ESTADO = {
  valid: "green",
  no_expiry: "light-blue",
  expiring: "orange",
  expired: "red",
  missing: "yellow",
  waived: "brand",
  not_in_force: "light-blue",
} as const;

/** Duas iniciais, como no cabeçalho do sistema. */
function iniciais(nome: string): string {
  return nome
    .split(" ")
    .filter((parte) => parte.length > 2)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? "")
    .join("");
}

function br(iso: string | undefined): string {
  if (!iso) return "—";
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

/* ============================================================= cabeçalho */

/**
 * O cartão da ficha da operadora — espelho de `CardHeader`.
 *
 * O que estava aqui antes era desenho meu: etiqueta "Ativa" que a operadora não
 * tem, "Plano de saúde" que o sistema não escreve, e duas contagens de
 * credenciamento no lugar dos campos do cadastro. O original mostra outra coisa,
 * e mostra pouco: nome, registro ANS, quantos planos, telefone e e-mail.
 *
 * A anatomia é a de lá — avatar `extra_large` à esquerda, os três blocos em
 * `space-y-2`, a linha de contato em `gap-5`, e à direita o botão de observações
 * com o menu de três pontos.
 *
 * Duas coisas que valem saber antes de mexer:
 *
 * - **O ANS não é um número corrido.** O changeset valida `~r/\d{5}-\d/`, e o
 *   cabeçalho mostra o que está gravado. Sem registro, o original imprime
 *   `"ANS: -"` — a etiqueta aparece de todo jeito, e é isso que está reproduzido.
 * - **O sino no botão é `notification_badge`,** ligado a `observation not in ["",
 *   nil]`. É a única pista de que existe texto escrito ali, e sem ele ninguém abre
 *   o modal para descobrir.
 *
 * Origem: `lib/bloomy_web/backoffice/live/health_care_live/components/card_header.ex:8-81`.
 */
function CabecalhoDaOperadora({
  insurer,
  perfil,
  podeEditar,
}: {
  insurer: DocumentInsurer;
  perfil: InsurerProfile;
  podeEditar: boolean;
}) {
  return (
    <div className="espelho-do-sistema">
      <div className="flex flex-col items-center gap-4 md:flex-row md:justify-between">
        <div className="flex items-center gap-4">
          <Avatar title={insurer.name} size="extra_large" />

          <div className="space-y-2">
            <h1 className="m-0 text-2xl font-bold text-[var(--color-brand-purple-dark)]">
              {insurer.name}
            </h1>

            <div className="mt-2 flex gap-1.5">
              <Etiqueta
                item={`ANS: ${perfil.ansRegister ?? "-"}`}
                variant="light-purple"
                className="rounded-full"
                icon="fa-hashtag"
              />
            </div>

            {/* O original imprime `"-"` no telefone e no e-mail que faltam, e o
                traço no lugar do dado é mais honesto que a linha some. */}
            <div className="mt-3 flex flex-wrap gap-5 text-[var(--color-brand-purple-dark)]">
              <p className="m-0">
                <Icon name="fa-briefcase" className="mr-2" />
                {perfil.planCount === 1 ? "1 plano ativo" : `${perfil.planCount} planos ativos`}
              </p>
              <p className="m-0">
                <Icon name="fa-phone" className="mr-2" />
                {perfil.phone ?? "-"}
              </p>
              <p className="m-0">
                <Icon name="fa-envelope" className="mr-2" />
                {perfil.email ?? "-"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <Button
            className="espelho-do-sistema"
            variant="tint"
            color="blue"
            rightIcon="fa-notes"
            notificationBadge={
              perfil.observation !== undefined && perfil.observation.trim() !== ""
            }
          >
            Observações
          </Button>

          {/* Os mesmos dois itens do original: voltar para a lista e excluir.
              Excluir fica desabilitada sem `health_cares.edit`, com o motivo — a
              decisão 0003 vale para o item de menu como vale para o botão. No
              original o item é escondido nesse caso; aqui a convenção do produto
              para ação bloqueada é mostrar e desabilitar. */}
          <div className="flex flex-row gap-4">
            <DropdownMenu
              id="health_care_header_dropdown"
              items={[
                <a
                  key="voltar"
                  href={hrefDaLista()}
                  className="flex h-12 items-center gap-2 rounded-md px-3 font-bold text-[var(--color-neutral-600)] no-underline hover:bg-[var(--color-brand-purple-dark)]/5"
                >
                  <Icon name="fa-arrow-left" />
                  Voltar para lista
                </a>,
                <button
                  key="excluir"
                  type="button"
                  disabled={!podeEditar}
                  title={
                    podeEditar ? undefined : "Excluir operadora é de quem administra convênios."
                  }
                  className="flex h-12 w-full items-center gap-2 rounded-md border-0 bg-transparent px-3 font-bold text-[var(--color-brand-red)] hover:bg-[var(--color-brand-purple-dark)]/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon name="fa-trash-alt" />
                  Excluir Operadora
                </button>,
              ]}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * As abas da ficha da operadora.
 *
 * São as de `health_care_live/show.ex`, na ordem de lá, com **Documentos**
 * acrescentada — é a nova, e é a única portada. As outras aparecem desativadas de
 * propósito: esconder a lacuna faria a pasta parecer a ficha inteira da operadora.
 *
 * Documentos entra **depois de Contratos**, e não no fim. Duas razões: é onde ela
 * pertence pelo assunto — contrato e credenciamento são a mesma conversa, e
 * Auditoria e Usuários são as abas de administração do cadastro —, e no fim ela
 * ficava fora da tela, atrás da rolagem horizontal, com a aba ativa invisível ao
 * abrir a ficha.
 *
 * Duas fidelidades que não são enfeite:
 *
 * - **Financeiro é um menu, não uma aba.** No original é uma entrada com duas
 *   sub-abas, Autorizações e Faturamento, e é por isso que ela tem a seta.
 * - **Auditoria e Usuários dependem de `health_cares.edit`.** No `show.ex` as duas
 *   entradas são um `&&` com a policy: sem a permissão, elas não existem na lista.
 *   Aqui é o mesmo — não são as abas desativadas, são abas ausentes.
 *
 * Origem: `lib/bloomy_web/backoffice/live/health_care_live/show.ex:15-33`.
 */
function abasDaOperadora(podeEditar: boolean): LazyTabEntry<string>[] {
  return [
    { id: "health_care_data", label: "Dados da Operadora", disabled: true },
    { id: "address", label: "Endereço", disabled: true },
    { id: "plans", label: "Tipos de Planos", disabled: true },
    { id: "contracts", label: "Contratos", disabled: true },
    { id: "documents", label: "Documentos" },
    {
      id: "financial",
      label: "Financeiro",
      tabs: [
        { id: "authorizations", label: "Autorizações", disabled: true },
        { id: "invoices", label: "Faturamento", disabled: true },
      ],
    },
    ...(podeEditar
      ? ([
          { id: "audit", label: "Auditoria", disabled: true },
          { id: "users", label: "Usuários", disabled: true },
        ] as LazyTabEntry<string>[])
      : []),
  ];
}

/** A lista, com a busca da URL — que carrega cenário e fixture. */
function hrefDaLista(): string {
  const busca = typeof window === "undefined" ? "" : window.location.search;
  return `/insurers/documents${busca}`;
}

function wrap(
  context: ScreenProps["context"],
  children: React.ReactNode,
  ficha?: InsurerDocumentsData | null,
) {
  return (
    <AppShell
      context={context}
      title={ficha?.insurer.name ?? "Operadora"}
      breadcrumb={[
        { label: "Operadoras", path: hrefDaLista() },
        { label: ficha?.insurer.name ?? "Operadora" },
        { label: "Documentos" },
      ]}
      showPageHeading={false}
    >
      {children}
    </AppShell>
  );
}
