import Image from "next/image";

type ShadoLogoProps = {
  /** "full" shows logo + text lockup, "mark" shows just the logo image */
  variant?: "full" | "mark";
  /** Size of the logo mark in pixels */
  size?: number;
  className?: string;
};

export default function ShadoLogo({
  variant = "full",
  size = 36,
  className = "",
}: ShadoLogoProps) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-sm)",
      }}
    >
      <Image
        src="/logo.png"
        alt="SHADO logo mark"
        width={size}
        height={size}
        style={{
          objectFit: "contain",
          filter: "brightness(1.1)",
        }}
        priority
      />
      {variant === "full" && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: `${Math.max(size * 0.5, 14)}px`,
            letterSpacing: "0.08em",
            color: "var(--soft-white)",
            lineHeight: 1,
          }}
        >
          SHADO
        </span>
      )}
    </div>
  );
}
