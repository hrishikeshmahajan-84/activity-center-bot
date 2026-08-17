export default function Slide08Lessons() {
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
          What I Learned
        </h2>
        <p style={{ color: "#666666", fontSize: "1.3vw", margin: "0 0 4vh 0" }}>
          Building a personal automation project that has to work exactly once — at exactly the right time.
        </p>

        {/* 2x2 grid of lessons — written inline, no map */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2vw" }}>

          {/* Lesson 1 */}
          <div style={{ backgroundColor: "#FAFAFA", border: "1px solid #E0E0E0", padding: "2vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "1.5vh" }}>
              <div style={{ width: "0.5vw", height: "3vh", backgroundColor: "#3D5A80", flexShrink: 0 }} />
              <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: 0 }}>Ship the scraper first</h3>
            </div>
            <p style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              Browser automation is the hardest and riskiest part of any booking bot. Everything else — the scheduler, the dashboard, the notifications — can be iterated on. Validate the scraper end-to-end before building anything else.
            </p>
          </div>

          {/* Lesson 2 */}
          <div style={{ backgroundColor: "#FAFAFA", border: "1px solid #E0E0E0", padding: "2vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "1.5vh" }}>
              <div style={{ width: "0.5vw", height: "3vh", backgroundColor: "#98C1D9", flexShrink: 0 }} />
              <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: 0 }}>Design for failure at every step</h3>
            </div>
            <p style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              Every check cycle assumes the site might be down, the session might have expired, and the class might already be full. Returning structured errors instead of throwing means the scheduler always knows what happened.
            </p>
          </div>

          {/* Lesson 3 */}
          <div style={{ backgroundColor: "#FAFAFA", border: "1px solid #E0E0E0", padding: "2vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "1.5vh" }}>
              <div style={{ width: "0.5vw", height: "3vh", backgroundColor: "#EE6C4D", flexShrink: 0 }} />
              <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: 0 }}>Notifications are the product</h3>
            </div>
            <p style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              A silent success is a missed opportunity. The Telegram message confirming the booking is the actual deliverable — everything else is infrastructure. When Twilio blocked custom content, pivoting to Telegram took one afternoon.
            </p>
          </div>

          {/* Lesson 4 */}
          <div style={{ backgroundColor: "#FAFAFA", border: "1px solid #E0E0E0", padding: "2vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1vw", marginBottom: "1.5vh" }}>
              <div style={{ width: "0.5vw", height: "3vh", backgroundColor: "#EE6C4D", flexShrink: 0 }} />
              <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: 0 }}>Match deployment type to workload</h3>
            </div>
            <p style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              Autoscale is right for APIs and dashboards — wrong for bots. On registration day the server was asleep at 10:00 AM and missed the window entirely. A scheduler running inside an Autoscale process is not a scheduler; it's a wish. Always-on hosting (Reserved VM) is non-negotiable for time-critical automation.
            </p>
          </div>

        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600 }}>
        08
      </div>
    </div>
  );
}
