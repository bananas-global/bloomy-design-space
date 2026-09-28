import { useRef, type FocusEvent, type KeyboardEvent } from "react";
import { Icon } from "./Icon.js";
import { cx, useMirror } from "./Input.js";

/**
 * `multi_tag_select_component.ex` → `BloomyWeb.MultiTagSelectComponent`
 * (`input/1` com `type="tags"`). Enter, Tab ou sair do campo adicionam;
 * Backspace no campo vazio remove a última, como o hook `MultiTagSelect`.
 */
export function MultiTagSelect({
  name,
  value = [],
  readonly = false,
  onChange,
}: {
  id?: string;
  name: string;
  value?: string[];
  readonly?: boolean;
  onChange?: (items: string[]) => void;
}) {
  const clean = Array.from(new Set(value.filter((item) => item !== null && item !== "")));
  const [items, setItems] = useMirror(clean);
  const input = useRef<HTMLInputElement>(null);

  const update = (next: string[]) => {
    setItems(next);
    onChange?.(next);
  };

  const handleAdd = (event: KeyboardEvent<HTMLInputElement> | FocusEvent<HTMLInputElement>) => {
    const target = event.currentTarget;
    const inputValue = target.value;
    const code = "code" in event ? event.code : undefined;
    if ((code && ["Enter", "Tab"].includes(code)) || event.type === "blur") {
      if (!(code === "Tab" && inputValue.length === 0)) event.preventDefault();
      const tag = inputValue.trim();
      if (tag.length > 0 && !readonly) update([...items, tag]);
      target.value = "";
    }
    if (code === "Backspace" && inputValue === "") update(items.slice(0, -1));
  };

  return (
    <div
      id={name}
      className={cx(
        "px-4 rounded-lg flex items-center justify-between mt-2 h-12 cursor-pointer overflow-hidden",
        "bg-brand-purple-dark/5",
        "border border-transparent has-[:focus]:border-brand-blue",
      )}
      tabIndex={0}
      onFocus={(event) => {
        if (event.target === event.currentTarget) input.current?.focus();
      }}
    >
      <div className="flex my-2.5 items-center flex-wrap gap-2">
        {items.map((item) => (
          <div
            key={item}
            className="uppercase bg-brand-blue/20 text-brand-blue-dark font-semibold text-sm py-0.5 px-1.5 rounded whitespace-nowrap"
          >
            {item}
            <input type="hidden" name={`${name}[]`} value={item} />
            <button
              type="button"
              title={`Remover ${item}`}
              onClick={() => !readonly && update(items.filter((other) => other !== item))}
            >
              <Icon name="fa-times" />
            </button>
          </div>
        ))}
        <input type="hidden" name={`${name}[]`} />
        <input
          ref={input}
          id={`${name}-input`}
          name={`${name}-input`}
          className="flex-1 bg-transparent appearance-none border-0 outline-hidden w-full"
          readOnly={readonly}
          onKeyDown={handleAdd}
          onBlur={handleAdd}
        />
      </div>
    </div>
  );
}
