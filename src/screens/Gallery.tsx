import type { ScreenProps } from "@brucesantos/design-space";
import { AppShell } from "../components/AppShell.js";
import { Card, CardHeader, Notice } from "../components/primitives.js";
import { GALLERY, pendentes, portados } from "../gallery/entries.js";

/**
 * Galeria de componentes.
 *
 * O índice que faltava. Os 47 componentes de `core_components.ex`, na ordem em
 * que aparecem lá, com o arquivo e a linha de cada um.
 *
 * Duas decisões:
 *
 * 1. **Os pendentes aparecem.** Um índice que só mostra o que já existe não
 *    serve para planejar, e esconde o tamanho do trabalho. É a mesma escolha
 *    dos itens de menu ainda não portados.
 *
 * 2. **As demonstrações são o componente de verdade**, não uma imagem dele.
 *    Uma galeria que mostra captura de tela desatualiza no primeiro commit.
 */
export function Gallery({ context }: ScreenProps) {
  const prontos = portados();
  const faltando = pendentes();

  return (
    <AppShell
      context={context}
      title="Componentes"
      subtitle={`${prontos.length} de ${GALLERY.length} portados do sistema`}
      breadcrumb={[{ label: "Design Space" }, { label: "Componentes" }]}
    >
      <div className="space-y-4">
        <Notice tone="info" title="O que esta lista é">
          <p className="m-0 max-w-[68ch]">
            Os {GALLERY.length} componentes de <span className="font-mono">core_components.ex</span>,
            na ordem do arquivo. Cada um traz a linha de origem, e as demonstrações usam o
            componente de verdade — não uma imagem dele.
          </p>
          <p className="m-0 mt-2 max-w-[68ch]">
            Os {faltando.length} que ainda não foram portados continuam na lista, com a descrição do
            que resolvem. Esconder faria o trabalho parecer menor do que é.
          </p>
        </Notice>

        {prontos.map((entrada) => (
          <Card as="section" key={entrada.name}>
            <CardHeader title={entrada.name} hint={entrada.descricao} />
            <div className="space-y-6 px-5 py-5">
              {entrada.demos?.map((demo) => (
                <div key={demo.titulo}>
                  <h3 className="m-0 mb-1 text-[0.9375rem] font-bold text-navy">{demo.titulo}</h3>
                  {demo.nota && (
                    <p className="m-0 mb-3 text-[0.8125rem] text-[var(--fg-2)]">{demo.nota}</p>
                  )}
                  <div className="rounded-field border border-[var(--border-soft)] bg-app px-4 py-4">
                    {demo.render()}
                  </div>
                </div>
              ))}
              <p className="m-0 text-[0.75rem] text-[var(--fg-3)]">
                Origem: <span className="font-mono">{entrada.origem}</span>
              </p>
            </div>
          </Card>
        ))}

        <Card as="section">
          <CardHeader title="Ainda não portados" hint={`${faltando.length} componentes`} />
          <div className="px-5 py-5">
            <ul className="m-0 list-none space-y-2 p-0">
              {faltando.map((entrada) => (
                <li
                  key={entrada.name}
                  className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-field border border-[var(--border-soft)] px-4 py-2.5"
                >
                  <span className="font-mono text-[0.875rem] font-semibold text-navy">
                    {entrada.name}
                  </span>
                  <span className="text-[0.875rem] text-[var(--fg-2)]">{entrada.descricao}</span>
                  <span className="text-[0.75rem] text-[var(--fg-3)]">
                    {entrada.origem.split(":").pop()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
