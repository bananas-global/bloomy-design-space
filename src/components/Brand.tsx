import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon.js";
import { FieldError, cx, type FormField } from "./Input.js";

/** `brand_components.ex` → `brand_button/1`. */
export function BrandButton({
  type,
  color = "purple",
  size = "normal",
  variant = "default",
  className,
  rightIcon,
  leftIcon,
  children,
  ...rest
}: {
  type?: "button" | "submit" | "reset";
  color?: "purple" | "light-purple" | "red";
  size?: "small" | "normal";
  variant?: "default" | "tint";
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "color" | "className" | "children">) {
  return (
    <button
      type={type}
      className={cx(
        "phx-submit-loading:opacity-75 rounded-xl font-bold transition duration-200 ease-in-out active:scale-95",
        "flex justify-center",
        size === "normal" && "h-12 px-4 py-3 items-baseline",
        size === "small" && "h-8 px-2 py-2.5 text-sm items-center",
        variant === "default" && [
          color === "purple" && "bg-brand-purple text-white disabled:bg-purple-dark/30",
          color === "light-purple" && "bg-brand-purple-light text-white disabled:bg-purple-dark/30",
          color === "red" && "bg-brand-red text-white disabled:bg-brand-red/30",
        ],
        variant === "tint" && [color === "purple" && "bg-brand-purple/10 text-brand-purple disabled:bg-purple-dark/30"],
        className,
      )}
      {...rest}
    >
      {leftIcon && <Icon name={leftIcon} className="mr-2" />}
      {children}
      {rightIcon && <Icon name={rightIcon} className="ml-2" />}
    </button>
  );
}

/** `brand_components.ex` → `brand_input/1`. */
export function BrandInput({
  id,
  name,
  value,
  className,
  color = "white",
  type = "text",
  field,
  errors = [],
  errorTag = {},
  ...rest
}: {
  id?: string;
  name?: string;
  value?: unknown;
  className?: string;
  color?: "white" | "dark-purple";
  type?: "text" | "password" | "email";
  field?: FormField;
  errors?: string[];
  errorTag?: Record<string, string>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "name" | "value" | "className" | "color" | "type">) {
  if (field) {
    errors = field.errors ?? [];
    id = id ?? field.id;
    name = name ?? field.name;
    value = value !== undefined ? value : field.value;
    errorTag = errors.length === 0 ? {} : { "with-error": "true" };
  }
  const normalized = value === null || value === undefined ? undefined : String(value);
  return (
    <div className={cx("relative", className)}>
      <input
        type={type}
        name={name}
        id={id}
        {...(rest.onChange ? { value: normalized ?? "" } : { defaultValue: normalized })}
        className={cx(
          "block w-full p-6 h-12 rounded-2xl font-normal",
          "disabled:bg-purple-dark/[0.02] focus:ring-0 focus:border-solid focus:border transition-colors duration-200",
          color === "white" && [
            "bg-white text-brand-purple-dark",
            "placeholder:text-brand-purple-dark/45 focus:border-brand-purple-light",
            "shadow-[0_14px_14px_0] shadow-brand-purple-dark/10",
          ],
          color === "dark-purple" && [
            "bg-brand-purple-dark/5 text-brand-purple-dark",
            "placeholder:text-brand-purple-dark/45 focus:border-brand-purple-light",
          ],
          errors.length === 0 && " outline-hidden border border-transparent",
          errors.length > 0 && "border border-solid border-red",
        )}
        {...rest}
        {...errorTag}
      />
      {errors.map((msg) => (
        <FieldError key={msg} className="absolute -bottom-6" message={msg}>
          {msg}
        </FieldError>
      ))}
    </div>
  );
}
