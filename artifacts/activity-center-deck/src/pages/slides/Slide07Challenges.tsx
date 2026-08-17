export default function Slide07Challenges() {
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
          Challenges Solved
        </h2>
        <p style={{ color: "#666666", fontSize: "1.3vw", margin: "0 0 3vh 0" }}>
          Four problems that looked simple — and weren't.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5vw" }}>

          {/* Challenge 1 */}
          <div style={{ backgroundColor: "#FFFFFF", padding: "2vw", border: "1px solid #E0E0E0" }}>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#F0F0F0", lineHeight: 1, marginBottom: "1vh" }}>01</div>
            <h3 style={{ color: "#111111", fontSize: "1.25vw", fontWeight: 700, margin: "0 0 1vh 0", lineHeight: 1.2 }}>
              Browser session auth
            </h3>
            <p style={{ color: "#666666", fontSize: "1vw", lineHeight: 1.6, margin: "0 0 1vh 0", textWrap: "pretty" }}>
              Maintaining a logged-in Playwright session across many check cycles without triggering anti-bot detection required a singleton page model with an in-process lock and graceful re-auth on expiry.
            </p>
            <div style={{ color: "#3D5A80", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Singleton page + error boundary
            </div>
          </div>

          {/* Challenge 2 */}
          <div style={{ backgroundColor: "#FFFFFF", padding: "2vw", border: "1px solid #E0E0E0" }}>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#F0F0F0", lineHeight: 1, marginBottom: "1vh" }}>02</div>
            <h3 style={{ color: "#111111", fontSize: "1.25vw", fontWeight: 700, margin: "0 0 1vh 0", lineHeight: 1.2 }}>
              Notification channel
            </h3>
            <p style={{ color: "#666666", fontSize: "1vw", lineHeight: 1.6, margin: "0 0 1vh 0", textWrap: "pretty" }}>
              Twilio's trial tier blocks custom SMS content with error 21608. WhatsApp sandbox required payment. The pivot: Telegram Bot API — free, instant, and more reliable. Now primary; Twilio is the fallback.
            </p>
            <div style={{ color: "#3D5A80", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Telegram primary, Twilio fallback
            </div>
          </div>

          {/* Challenge 3 */}
          <div style={{ backgroundColor: "#FFFFFF", padding: "2vw", border: "1px solid #E0E0E0" }}>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#F0F0F0", lineHeight: 1, marginBottom: "1vh" }}>03</div>
            <h3 style={{ color: "#111111", fontSize: "1.25vw", fontWeight: 700, margin: "0 0 1vh 0", lineHeight: 1.2 }}>
              Production data isolation
            </h3>
            <p style={{ color: "#666666", fontSize: "1vw", lineHeight: 1.6, margin: "0 0 1vh 0", textWrap: "pretty" }}>
              The prod database is read-only from the workspace — no direct SQL fixes. Stale rows and wrong dates in production needed an idempotent startup reconciliation that runs before the scheduler on every boot.
            </p>
            <div style={{ color: "#3D5A80", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Startup reconciliation pattern
            </div>
          </div>

          {/* Challenge 4 — learned day-of */}
          <div style={{ backgroundColor: "#FFFFFF", padding: "2vw", border: "1px solid #E0E0E0", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, right: 0, backgroundColor: "#EE6C4D", color: "#FFFFFF", fontSize: "0.75vw", fontWeight: 700, padding: "0.4vh 0.8vw", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Discovered live
            </div>
            <div style={{ fontSize: "3vw", fontWeight: 800, color: "#F0F0F0", lineHeight: 1, marginBottom: "1vh" }}>04</div>
            <h3 style={{ color: "#111111", fontSize: "1.25vw", fontWeight: 700, margin: "0 0 1vh 0", lineHeight: 1.2 }}>
              Autoscale sleeps
            </h3>
            <p style={{ color: "#666666", fontSize: "1vw", lineHeight: 1.6, margin: "0 0 1vh 0", textWrap: "pretty" }}>
              On registration day the bot missed the 10:00 AM window entirely — the server was asleep. Autoscale shuts down between visits; an in-process scheduler has no heartbeat to keep it alive. Bots need always-on hosting.
            </p>
            <div style={{ color: "#EE6C4D", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Reserved VM required
            </div>
          </div>

        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600 }}>
        07
      </div>
    </div>
  );
}
