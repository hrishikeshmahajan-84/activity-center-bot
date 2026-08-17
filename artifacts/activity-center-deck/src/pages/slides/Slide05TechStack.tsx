export default function Slide05TechStack() {
  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#FFFFFF",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        backgroundImage: "radial-gradient(circle, #E8E8E8 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }}
    >
      <div style={{ position: "absolute", top: "5vh", left: "5vw", width: "3vw", height: "3vw", backgroundColor: "#3D5A80", zIndex: 1 }} />
      <div style={{ position: "absolute", top: "5vh", right: "5vw", zIndex: 1, textAlign: "right" }}>
        <div style={{ color: "#3D5A80", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Activity Center Bot
        </div>
      </div>

      <div style={{ position: "absolute", top: "18vh", left: "10vw", zIndex: 1, width: "80vw" }}>
        <h2 style={{ color: "#111111", fontSize: "4vw", margin: "0 0 1.5vh 0", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
          The Stack
        </h2>
        <p style={{ color: "#666666", fontSize: "1.3vw", margin: "0 0 4vh 0" }}>
          A pnpm monorepo with a shared OpenAPI contract between frontend and backend.
        </p>

        <div style={{ display: "flex", gap: "3vw" }}>

          {/* Backend column */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", border: "1px solid #E0E0E0", padding: "2.5vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2.5vh" }}>
              <div style={{ width: "2vw", height: "2vw", backgroundColor: "#3D5A80" }} />
              <h3 style={{ color: "#111111", fontSize: "1.6vw", fontWeight: 700, margin: 0 }}>Backend — API Server</h3>
            </div>
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: "2vh" }}>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Automation</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Playwright (headless Chromium)</div>
              </div>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Runtime</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Node.js + Express</div>
              </div>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Database</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>PostgreSQL + Drizzle ORM</div>
              </div>
              <div>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Notifications</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Telegram Bot API + Twilio SMS</div>
              </div>
            </div>
          </div>

          {/* Frontend column */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", border: "1px solid #E0E0E0", padding: "2.5vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2.5vh" }}>
              <div style={{ width: "2vw", height: "2vw", backgroundColor: "#98C1D9" }} />
              <h3 style={{ color: "#111111", fontSize: "1.6vw", fontWeight: 700, margin: 0 }}>Frontend — Dashboard</h3>
            </div>
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: "2vh" }}>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Framework</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>React 19 + Vite</div>
              </div>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>API Layer</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>OpenAPI spec + Orval codegen + React Query</div>
              </div>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Styling</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Tailwind CSS + shadcn/ui</div>
              </div>
              <div>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Catalog Data</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Public Burnaby ActiveNet REST API</div>
              </div>
            </div>
          </div>

          {/* Infra column */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", border: "1px solid #E0E0E0", padding: "2.5vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "2.5vh" }}>
              <div style={{ width: "2vw", height: "2vw", backgroundColor: "#EE6C4D" }} />
              <h3 style={{ color: "#111111", fontSize: "1.6vw", fontWeight: 700, margin: 0 }}>Infrastructure</h3>
            </div>
            <div style={{ borderTop: "1px solid #F0F0F0", paddingTop: "2vh" }}>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Platform</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Replit (Autoscale deployment)</div>
              </div>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Workspace</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>pnpm monorepo, TypeScript</div>
              </div>
              <div style={{ marginBottom: "1.5vh" }}>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Secrets</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Replit Secrets (env vars)</div>
              </div>
              <div>
                <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.5vh" }}>Database</div>
                <div style={{ color: "#333333", fontSize: "1.15vw", fontWeight: 500 }}>Replit managed PostgreSQL</div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600 }}>
        05
      </div>
    </div>
  );
}
