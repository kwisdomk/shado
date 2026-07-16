import { type ReactNode, type ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "ghost" | "danger";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  /** Render as full-width */
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "shado-btn-primary",
  ghost: "shado-btn-ghost",
  danger: "shado-btn-danger",
};

export default function Button({
  children,
  variant = "primary",
  fullWidth = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      className={`shado-btn ${variantClasses[variant]} ${className}`}
      style={fullWidth ? { width: "100%" } : undefined}
      {...props}
    >
      {children}
    </button>
  );
}
