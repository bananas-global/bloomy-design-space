/**
 * Combobox criável — select em que se digita para filtrar e, quando o texto não
 * bate com nenhuma opção, a lista oferece "Criar “texto”".
 *
 * COMPONENTE NOVO: não existe no Phoenix. O mais próximo é `select_search`,
 * que filtra mas não cria. A aparência segue o `custom_select` (mesmo campo,
 * mesmo painel, mesmas cores de item) e reaproveita os hooks do sistema
 * (`useFloatingPanel`, `useOptionKeys`). No Phoenix, a criação seria um
 * `phx-click` que cadastra a opção na tabela de apoio e já a seleciona.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Icon } from "../../components/Icon.js";
import { FieldError, Label, cx, useFloatingPanel, useOptionKeys } from "../../components/Input.js";

/** Compara sem acento e sem caixa: "Locacao" acha "Locação" e não deixa criar repetida. */
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();

export function ComboboxCriavel({
  id,
  label,
  prompt = "Selecione ou digite",
  options,
  value,
  errors = [],
  onChange,
  onCriar,
  artigo = "a",
}: {
  id: string;
  label?: string;
  prompt?: string;
  options: string[];
  value: string;
  errors?: string[];
  onChange: (value: string) => void;
  /** Cadastra a opção nova; quem chama a acrescenta em `options` e a seleciona. */
  onCriar: (descricao: string) => void;
  /** "a" ou "o", para "Criar nova"/"Criar novo" no rodapé da lista. */
  artigo?: "a" | "o";
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const q = norm(busca);
  const filtradas = q ? options.filter((o) => norm(o).includes(q)) : options;
  const exata = q !== "" && options.some((o) => norm(o) === q);
  const podeCriar = q !== "" && !exata;
  // A opção "Criar" é o último item navegável pelo teclado.
  const total = filtradas.length + (podeCriar ? 1 : 0);

  const fechar = () => {
    setOpen(false);
    setBusca("");
    setHighlight(-1);
  };
  const escolher = (v: string) => {
    onChange(v);
    fechar();
  };
  const criar = () => {
    const descricao = busca.trim().replace(/\s+/g, " ");
    if (!descricao) return;
    onCriar(descricao);
    fechar();
  };

  useFloatingPanel(open, (o) => (o ? setOpen(true) : fechar()), { reference: root, container, panel }, (target) =>
    Boolean(panel.current?.contains(target) || container.current?.contains(target)),
  );
  useOptionKeys(open, total, highlight, setHighlight, (i) => (i < filtradas.length ? escolher(filtradas[i]!) : criar()), fechar, input);
  useEffect(() => {
    panel.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  return (
    <div id={id} className="relative">
      {label && <Label htmlFor={`${id}-input`}>{label}</Label>}
      <div ref={root} className="relative w-full">
        <div
          ref={container}
          data-open={open ? "true" : "false"}
          onClick={() => {
            setOpen(true);
            input.current?.focus();
          }}
          className={cx(
            "group relative flex h-12 cursor-text items-center gap-2 overflow-hidden rounded-lg px-4",
            "bg-brand-purple-dark/10 border border-brand-purple-dark/10 data-[open=true]:border-brand-blue",
            errors.length > 0 && "border-brand-red",
            label && "mt-2",
          )}
        >
          <input
            ref={input}
            id={`${id}-input`}
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            autoComplete="off"
            value={open ? busca : value}
            placeholder={open && value ? value : prompt}
            onChange={(e) => {
              setBusca(e.target.value);
              setOpen(true);
              // Digitando, o primeiro item fica destacado na hora (Enter escolhe ou cria).
              setHighlight(norm(e.target.value) ? 0 : -1);
            }}
            onFocus={() => setOpen(true)}
            className={cx(
              "min-w-0 flex-1 border-0 bg-transparent p-0 font-normal outline-none focus:ring-0",
              "text-brand-purple-dark/80 placeholder:text-brand-purple-dark/60",
            )}
          />
          {value && !open && (
            <button
              type="button"
              title="Limpar seleção"
              className="w-6 rounded-full transition-all hover:bg-brand-purple-dark/10"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
            >
              <Icon className="text-brand-red" name="fa-times" />
            </button>
          )}
          <Icon className="text-brand-purple-dark/40 group-data-[open=true]:text-brand-blue" name="fa-chevron-down" />
        </div>

        <div
          ref={panel}
          className="fixed left-0 right-0 z-[9999] overflow-hidden rounded-lg border border-neutral-100 bg-white shadow will-change-transform"
          style={{ display: open ? "block" : "none" }}
        >
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto p-4 thin-scrollbar">
            {filtradas.length === 0 && !podeCriar && <li className="bg-white px-4 py-2 text-center text-blue-dark/80">Nenhuma opção encontrada</li>}
            {filtradas.map((o, i) => {
              const sel = o === value;
              return (
                <li
                  key={o}
                  role="option"
                  aria-selected={sel}
                  data-highlighted={i === highlight ? "true" : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => escolher(o)}
                  className={cx(
                    "flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 font-bold text-brand-purple-dark/60 transition-colors",
                    sel ? "bg-brand-purple-dark/10" : "bg-white hover:bg-brand-purple-dark/5 data-[highlighted]:bg-brand-purple-dark/10",
                  )}
                >
                  {o}
                  {sel && <Icon name="fa-check" />}
                </li>
              );
            })}
            {podeCriar && (
              <li
                role="option"
                aria-selected={false}
                data-highlighted={highlight === filtradas.length ? "true" : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={criar}
                className={cx(
                  "mt-1 flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-bold text-brand-blue-dark transition-colors",
                  filtradas.length > 0 && "border-t border-neutral-100",
                  "hover:bg-brand-blue/10 data-[highlighted]:bg-brand-blue/20",
                )}
              >
                <Icon name="fa-plus" />
                <span className="truncate">
                  Criar nov{artigo} “{busca.trim()}”
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
      {errors.map((m) => (
        <FieldError key={m} message={m} className="absolute -bottom-6 font-normal leading-none" />
      ))}
    </div>
  );
}

/**
 * Versão múltipla do combobox criável (também COMPONENTE NOVO). As escolhidas
 * viram etiquetas dentro do campo, no estilo do `multi_select_search`; a lista
 * fica aberta para marcar várias. Como sugere as opções que já existem e só
 * deixa criar quando nenhuma é igual (sem acento e sem caixa), evita que cada
 * pessoa cadastre o mesmo nome de um jeito diferente.
 */
export function MultiComboboxCriavel({
  id,
  label,
  prompt = "Selecione ou digite",
  options,
  value,
  errors = [],
  onChange,
  onCriar,
  artigo = "a",
}: {
  id: string;
  label?: string;
  prompt?: string;
  options: string[];
  value: string[];
  errors?: string[];
  onChange: (value: string[]) => void;
  /** Cadastra a opção nova; quem chama a acrescenta em `options` e em `value`. */
  onCriar: (descricao: string) => void;
  artigo?: "a" | "o";
}) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const root = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  const q = norm(busca);
  const filtradas = q ? options.filter((o) => norm(o).includes(q)) : options;
  const podeCriar = q !== "" && !options.some((o) => norm(o) === q);
  const total = filtradas.length + (podeCriar ? 1 : 0);

  const fechar = () => {
    setOpen(false);
    setBusca("");
    setHighlight(-1);
  };
  // Marcar ou desmarcar não fecha a lista: a busca limpa e o foco fica no campo para a próxima.
  const alternar = (o: string) => {
    onChange(value.includes(o) ? value.filter((v) => v !== o) : [...value, o]);
    setBusca("");
    setHighlight(-1);
    input.current?.focus();
  };
  const criar = () => {
    const descricao = busca.trim().replace(/\s+/g, " ");
    if (!descricao) return;
    onCriar(descricao);
    setBusca("");
    setHighlight(-1);
    input.current?.focus();
  };

  useFloatingPanel(open, (o) => (o ? setOpen(true) : fechar()), { reference: root, container, panel }, (target) =>
    Boolean(panel.current?.contains(target) || container.current?.contains(target)),
  );
  useOptionKeys(open, total, highlight, setHighlight, (i) => (i < filtradas.length ? alternar(filtradas[i]!) : criar()), fechar, input);
  useEffect(() => {
    panel.current?.querySelector("[data-highlighted]")?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  const tagClass = "inline-flex items-center gap-1 uppercase bg-brand-blue/20 text-brand-blue-dark font-semibold text-sm py-0.5 pl-1.5 pr-1 rounded whitespace-nowrap";

  return (
    <div id={id} className="relative">
      {label && <Label htmlFor={`${id}-input`}>{label}</Label>}
      <div ref={root} className="relative w-full">
        <div
          ref={container}
          data-open={open ? "true" : "false"}
          onClick={() => {
            setOpen(true);
            input.current?.focus();
          }}
          className={cx(
            "group relative flex min-h-12 cursor-text items-center gap-2 rounded-lg px-4 py-2",
            "bg-brand-purple-dark/10 border border-brand-purple-dark/10 data-[open=true]:border-brand-blue",
            errors.length > 0 && "border-brand-red",
            label && "mt-2",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {value.map((v) => (
              <span key={v} className={tagClass}>
                {v}
                <button
                  type="button"
                  aria-label={`Remover ${v}`}
                  className="flex h-4 w-4 items-center justify-center rounded hover:bg-brand-blue/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(value.filter((x) => x !== v));
                  }}
                >
                  <Icon name="fa-xmark" className="text-xs" />
                </button>
              </span>
            ))}
            <input
              ref={input}
              id={`${id}-input`}
              role="combobox"
              aria-expanded={open}
              aria-controls={listId}
              aria-autocomplete="list"
              autoComplete="off"
              value={busca}
              placeholder={value.length ? "" : prompt}
              onChange={(e) => {
                setBusca(e.target.value);
                setOpen(true);
                setHighlight(norm(e.target.value) ? 0 : -1);
              }}
              onKeyDown={(e) => {
                // Backspace com o campo vazio tira a última, como no `multi_tag_select`.
                if (e.key === "Backspace" && !busca && value.length) onChange(value.slice(0, -1));
              }}
              onFocus={() => setOpen(true)}
              className="min-w-24 flex-1 border-0 bg-transparent p-0 font-normal text-brand-purple-dark/80 outline-none placeholder:text-brand-purple-dark/60 focus:ring-0"
            />
          </div>
          {value.length > 0 && (
            <button
              type="button"
              title="Limpar seleção"
              className="w-6 rounded-full transition-all hover:bg-brand-purple-dark/10"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            >
              <Icon className="text-brand-red" name="fa-times" />
            </button>
          )}
          <Icon className="text-brand-purple-dark/40 group-data-[open=true]:text-brand-blue" name="fa-chevron-down" />
        </div>

        <div
          ref={panel}
          className="fixed left-0 right-0 z-[9999] overflow-hidden rounded-lg border border-neutral-100 bg-white shadow will-change-transform"
          style={{ display: open ? "block" : "none" }}
        >
          <ul id={listId} role="listbox" aria-multiselectable="true" className="max-h-64 space-y-1 overflow-y-auto p-4 thin-scrollbar">
            {filtradas.length === 0 && !podeCriar && <li className="bg-white px-4 py-2 text-center text-blue-dark/80">Nenhuma opção encontrada</li>}
            {filtradas.map((o, i) => {
              const sel = value.includes(o);
              return (
                <li
                  key={o}
                  role="option"
                  aria-selected={sel}
                  data-highlighted={i === highlight ? "true" : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => alternar(o)}
                  className={cx(
                    "flex cursor-pointer items-center justify-between rounded-lg px-4 py-2 font-bold text-brand-purple-dark/60 transition-colors",
                    sel ? "bg-brand-purple-dark/10" : "bg-white hover:bg-brand-purple-dark/5 data-[highlighted]:bg-brand-purple-dark/10",
                  )}
                >
                  {o}
                  {sel && <Icon name="fa-check" />}
                </li>
              );
            })}
            {podeCriar && (
              <li
                role="option"
                aria-selected={false}
                data-highlighted={highlight === filtradas.length ? "true" : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={criar}
                className={cx(
                  "flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 font-bold text-brand-blue-dark transition-colors",
                  filtradas.length > 0 && "border-t border-neutral-100",
                  "hover:bg-brand-blue/10 data-[highlighted]:bg-brand-blue/20",
                )}
              >
                <Icon name="fa-plus" />
                <span className="truncate">
                  Criar nov{artigo} “{busca.trim()}”
                </span>
              </li>
            )}
          </ul>
        </div>
      </div>
      {errors.map((m) => (
        <FieldError key={m} message={m} className="absolute -bottom-6 font-normal leading-none" />
      ))}
    </div>
  );
}
