import { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-laranja text-white hover:bg-vermelho shadow-sm",
  secondary:
    "bg-bege text-preto hover:bg-[#f1ddc9] border border-[#ecd9c7]",
  ghost:
    "bg-transparent text-preto hover:bg-bege border border-[#e7e0d8]",
  danger:
    "bg-vermelho text-white hover:bg-[#c23315]",
};

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button className={clsx(baseClasses, variantClasses[variant], className)} {...props} />
  );
}

export function LinkButton({
  variant = "primary",
  className,
  href,
  children,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { variant?: Variant; href: string; children: ReactNode }) {
  return (
    <Link href={href} className={clsx(baseClasses, variantClasses[variant], className)} {...props}>
      {children}
    </Link>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-2xl border border-[#ece3d8] bg-white shadow-sm", className)}>
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-bege text-preto",
    success: "bg-[#e4f3e6] text-[#1f7a32]",
    warning: "bg-[#fff1da] text-[#a3650a]",
    danger: "bg-[#fde6e0] text-vermelho",
    info: "bg-[#ffe7d6] text-laranja",
  };
  return (
    <span className={clsx("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between border-b border-[#ece3d8] pb-6 mb-8">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl text-preto tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-[#7a716a]">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
