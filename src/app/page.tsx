import ShadoLogo from "./components/ShadoLogo";
import Card from "./components/Card";
import Button from "./components/Button";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <header
        className="animate-reveal"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--space-lg) var(--space-xl)",
          maxWidth: 1080,
          margin: "0 auto",
        }}
      >
        <ShadoLogo variant="full" size={32} />
        <div className="shado-badge">Personal Safety</div>
      </header>

      {/* ── Hero Section ── */}
      <section
        className="grain"
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "var(--space-3xl) var(--space-xl)",
          maxWidth: 720,
          margin: "0 auto",
          minHeight: "60vh",
        }}
      >
        {/* Ambient glow behind hero */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, var(--violet-glow) 0%, transparent 70%)",
            filter: "blur(60px)",
            pointerEvents: "none",
          }}
        />

        <p
          className="animate-reveal reveal-delay-1"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "0.8rem",
            fontWeight: 500,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "var(--violet)",
            marginBottom: "var(--space-lg)",
          }}
        >
          Personal Digital Safety
        </p>

        <h1
          className="glitch-text animate-reveal reveal-delay-2"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(3.5rem, 10vw, 6rem)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "var(--soft-white)",
            margin: 0,
            position: "relative",
            zIndex: 1,
          }}
        >
          SHADO
        </h1>

        <h2
          className="animate-reveal reveal-delay-3"
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.25rem, 3vw, 1.75rem)",
            fontWeight: 600,
            color: "var(--soft-white)",
            marginTop: "var(--space-lg)",
            marginBottom: 0,
          }}
        >
          Check a suspicious message safely
        </h2>

        <p
          className="animate-reveal reveal-delay-4"
          style={{
            fontSize: "1.05rem",
            color: "var(--smoke)",
            maxWidth: 420,
            marginTop: "var(--space-md)",
            lineHeight: 1.7,
          }}
        >
          Local-first risk assessment for Kenyan mobile messages.
          <br />
          Not a fraud verdict.
        </p>

        <div
          className="animate-reveal reveal-delay-5"
          style={{
            display: "flex",
            gap: "var(--space-md)",
            marginTop: "var(--space-xl)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Button variant="primary">Analyze a Message</Button>
          <Button variant="ghost">How It Works</Button>
        </div>
      </section>

      {/* ── Feature Cards ── */}
      <section
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "var(--space-2xl) var(--space-xl)",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-lg)",
        }}
      >
        <Card icon={<span>🛡️</span>} revealDelay="reveal-delay-3">
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "var(--soft-white)",
              margin: "0 0 var(--space-sm) 0",
            }}
          >
            Local Analysis
          </h3>
          <p
            style={{
              color: "var(--smoke)",
              fontSize: "0.9rem",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Works offline. Your message never leaves your device unless you
            explicitly opt in to AI-assisted review.
          </p>
        </Card>

        <Card icon={<span>📊</span>} revealDelay="reveal-delay-4">
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "var(--soft-white)",
              margin: "0 0 var(--space-sm) 0",
            }}
          >
            Risk Assessment
          </h3>
          <p
            style={{
              color: "var(--smoke)",
              fontSize: "0.9rem",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Evidence-based indicator scores — not a probability of fraud.
            Transparent about what it found and what it means.
          </p>
        </Card>

        <Card icon={<span>🚀</span>} revealDelay="reveal-delay-5">
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.2rem",
              fontWeight: 600,
              color: "var(--soft-white)",
              margin: "0 0 var(--space-sm) 0",
            }}
          >
            Safe Actions
          </h3>
          <p
            style={{
              color: "var(--smoke)",
              fontSize: "0.9rem",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            Clear next steps from a reviewed catalogue. SHADO never clicks
            suspicious links or generates contact numbers.
          </p>
        </Card>
      </section>

      {/* ── Footer ── */}
      <footer
        className="animate-reveal reveal-delay-6"
        style={{
          maxWidth: 1080,
          margin: "0 auto",
          padding: "var(--space-2xl) var(--space-xl) var(--space-3xl)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-md)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "var(--space-sm)",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <span className="shado-badge">Local-first</span>
          <span className="shado-badge">Open Source</span>
          <span className="shado-badge">Kenya 🇰🇪</span>
        </div>
        <p
          style={{
            color: "var(--smoke)",
            fontSize: "0.8rem",
            maxWidth: 480,
            margin: 0,
            lineHeight: 1.6,
          }}
        >
          SHADO provides a risk assessment, not a guarantee. Always verify
          unexpected messages independently through official channels.
        </p>
        <ShadoLogo variant="mark" size={24} />
      </footer>
    </main>
  );
}
