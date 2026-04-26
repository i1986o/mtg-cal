import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ComponentProps } from "react";

const VARIANTS = {
  // Default — small light-gray chip. The canonical secondary-action style
  // used across public pages (Sign in, Subscribe, Share trigger, etc.).
  chip: "inline-flex items-center justify-center gap-1 h-7 px-2 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-100 dark:border-white/8 shadow-sm text-gray-700 dark:text-gray-300 text-xs font-medium hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white transition cursor-pointer",
  // Solid filled CTA — form submits and main confirm actions.
  primary: "inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50 transition cursor-pointer",
  // Borderless — cancel / dismiss / tertiary actions in forms.
  ghost: "inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer",
  // Square icon-only — admin row actions, modal close, info hints.
  icon: "inline-flex items-center justify-center w-7 h-7 rounded-md text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition cursor-pointer",
};

export type ButtonVariant = keyof typeof VARIANTS;

function classes(variant: ButtonVariant, className?: string): string {
  return className ? `${VARIANTS[variant]} ${className}` : VARIANTS[variant];
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "chip", className, type = "button", ...rest }, ref) => (
    <button ref={ref} type={type} className={classes(variant, className)} {...rest} />
  ),
);
Button.displayName = "Button";

type LinkButtonProps = ComponentProps<typeof Link> & {
  variant?: ButtonVariant;
};

export function LinkButton({ variant = "chip", className, ...rest }: LinkButtonProps) {
  return <Link className={classes(variant, className)} {...rest} />;
}
