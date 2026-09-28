import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon.js";

/** `core_components.ex` → `button/1`. */

export type ButtonVariant = "default" | "outline" | "tint" | "ghost";
export type ButtonColor = "blue" | "red" | "green" | "purple" | "yellow";
export type ButtonSize = "small" | "medium" | "normal";

export function Button({
  type,
  variant = "default",
  color = "blue",
  size = "normal",
  className,
  rightIcon,
  leftIcon,
  iconType = "regular",
  title,
  notificationBadge = false,
  children,
  ...rest
}: {
  type?: "button" | "submit" | "reset";
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  className?: string;
  rightIcon?: string;
  leftIcon?: string;
  iconType?: "regular" | "solid";
  title?: string;
  notificationBadge?: boolean;
  children: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "color" | "title" | "className" | "children">) {
  return (
    <button
      type={type}
      title={title}
      className={[
        "relative phx-submit-loading:opacity-75 rounded-lg font-bold transition duration-200 ease-in-out active:scale-95",
        "disabled:active:scale-100",
        "flex justify-center",
        size === "normal" && "h-12 px-4 py-3 items-baseline",
        size === "small" && "h-8 min-w-8 px-2 py-2.5 text-sm items-center",
        size === "medium" && "h-9 min-w-9 px-2 py-2.5 text-sm items-center",
        variant === "default" && [
          color === "blue" && "bg-brand-blue text-white",
          color === "red" && "bg-red text-white",
          color === "green" && "bg-green text-white",
          color === "purple" && "bg-purple text-white",
          color === "yellow" && "bg-yellow text-black",
        ],
        variant === "outline" && [
          "border",
          color === "blue" && "border-blue text-blue",
          color === "red" && "border-red text-red",
          color === "green" && "border-green text-green",
          color === "purple" && "border-purple text-purple",
          color === "yellow" && "border-yellow text-yellow",
        ],
        variant === "tint" && [
          color === "blue" && "bg-blue-light text-blue-dark",
          color === "red" && "bg-red-light text-red-dark",
          color === "green" && "bg-green-light text-green-dark",
          color === "purple" && "bg-purple-light text-purple-dark",
          color === "yellow" && "bg-yellow/20 text-yellow-dark",
        ],
        variant === "ghost" && "bg-transparent text-neutral-600 hover:bg-brand-purple-dark/5",
        className,
      ]
        .flat()
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {notificationBadge && (
        <div className="w-5 h-5 bg-yellow text-white flex items-center justify-center absolute -top-1 -left-1 rounded-full">
          <Icon className="text-xs" name="fa-bell" />
        </div>
      )}
      {leftIcon && <Icon name={leftIcon} type={iconType} className="mr-2" />}
      {children}
      {rightIcon && <Icon name={rightIcon} type={iconType} className="ml-2" />}
    </button>
  );
}
