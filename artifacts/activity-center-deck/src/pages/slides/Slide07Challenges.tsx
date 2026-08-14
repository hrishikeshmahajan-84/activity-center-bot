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
        backgroundImage:
          "repeating-linear-gradient(to bottom, transparent 0, transparent calc(5vh - 1px), #F0F0F0 calc(5vh - 1px), #F0F0F0 5vh), repeating-linear-gradient(to right, transparent 0, transparent calc(5vw - 1px), #F0F0F0 calc(5vw - 1px), #F0F0F0 5vw)",
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
        <p style={{ color: "#666666", fontSize: "1.3vw", margin: "0 0 4vh 0" }}>
          Three problems that looked simple — and weren't.
        </p>

        <div style={{ display: "flex", gap: "2vw" }}>

          {/* Challenge 1 */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", padding: "2.5vw", border: "1px solid #E0E0E0" }}>
            <div style={{ fontSize: "3.5vw", fontWeight: 800, color: "#F0F0F0", lineHeight: 1, marginBottom: "1.5vh" }}>01</div>
            <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: "0 0 1.5vh 0", lineHeight: 1.2 }}>
              Browser session auth
            </h3>
            <p style={{ color: "#666666", fontSize: "1.05vw", lineHeight: 1.6, margin: "0 0 1.5vh 0", textWrap: "pretty" }}>
              Maintaining a logged-in Playwright session across many check cycles without triggering anti-bot detection required a singleton page model with an in-process lock and graceful re-auth on expiry.
            </p>
            <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Singleton page + error boundary
            </div>
          </div>

          {/* Challenge 2 */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", padding: "2.5vw", border: "1px solid #E0E0E0" }}>
            <div style={{ fontSize: "3.5vw", fontWeight: 800, color: "#F0F0F0", lineHeight: 1, marginBottom: "1.5vh" }}>02</div>
            <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: "0 0 1.5vh 0", lineHeight: 1.2 }}>
              Notification channel
            </h3>
            <p style={{ color: "#666666", fontSize: "1.05vw", lineHeight: 1.6, margin: "0 0 1.5vh 0", textWrap: "pretty" }}>
              Twilio's trial tier blocks custom SMS content with error 21608. WhatsApp sandbox required payment. The pivot: Telegram Bot API — free, instant, and more reliable. Now primary; Twilio is the fallback.
            </p>
            <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Telegram primary, Twilio fallback
            </div>
          </div>

          {/* Challenge 3 */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", padding: "2.5vw", border: "1px solid #E0E0E0" }}>
            <div style={{ fontSize: "3.5vw", fontWeight: 800, color: "#F0F0F0", lineHeight: 1, marginBottom: "1.5vh" }}>03</div>
            <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: "0 0 1.5vh 0", lineHeight: 1.2 }}>
              Production data isolation
            </h3>
            <p style={{ color: "#666666", fontSize: "1.05vw", lineHeight: 1.6, margin: "0 0 1.5vh 0", textWrap: "pretty" }}>
              The prod database is read-only from the workspace — no direct SQL fixes. Stale rows and wrong dates in production needed an idempotent startup reconciliation that runs before the scheduler on every boot.
            </p>
            <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Startup reconciliation pattern
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
