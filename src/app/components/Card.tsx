import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  /** Optional icon element rendered above the content */
  icon?: ReactNode;
  /** Extra CSS class names */
  className?: string;
  /** Animation delay class for staggered reveal */
  revealDelay?: string;
};

export default function Card({
  children,
  icon,
  className = "",
  revealDelay = "",
}: CardProps) {
  return (
    <div
      className={`shado-card glow-halo animate-reveal ${revealDelay} ${className}`}
    >
      {icon && (
        <div
          style={{
            marginBottom: "var(--space-md)",
            fontSize: "1.75rem",
            lineHeight: 1,
          }}
        >
          {icon}
        </div>
      )}
      {children}
    </div>
  );
}
