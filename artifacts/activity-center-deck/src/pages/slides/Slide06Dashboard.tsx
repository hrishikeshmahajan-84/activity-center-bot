export default function Slide06Dashboard() {
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
          Activity Center Dashboard
        </h2>
        <p style={{ color: "#666666", fontSize: "1.3vw", margin: "0 0 4vh 0", maxWidth: "55vw", textWrap: "pretty" }}>
          A web app that gives a full view of what the robot is targeting, what is coming up, and what it has already booked.
        </p>

        {/* Two-col layout */}
        <div style={{ display: "flex", gap: "3vw", alignItems: "flex-start" }}>

          {/* Left: feature list */}
          <div style={{ flex: 1 }}>
            {/* Feature row 1 */}
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", marginBottom: "3vh", paddingBottom: "3vh", borderBottom: "1px solid #F0F0F0" }}>
              <div style={{ width: "1vw", height: "1vw", backgroundColor: "#3D5A80", marginTop: "0.4vh", flexShrink: 0 }} />
              <div>
                <div style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, marginBottom: "0.5vh" }}>Up Next</div>
                <div style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, textWrap: "pretty" }}>Shows upcoming Gliders, Swimmer, and Skater classes at Edmonds and Rosemary Brown — filtered by registration status and date.</div>
              </div>
            </div>

            {/* Feature row 2 */}
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start", marginBottom: "3vh", paddingBottom: "3vh", borderBottom: "1px solid #F0F0F0" }}>
              <div style={{ width: "1vw", height: "1vw", backgroundColor: "#98C1D9", marginTop: "0.4vh", flexShrink: 0 }} />
              <div>
                <div style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, marginBottom: "0.5vh" }}>Robot Helper</div>
                <div style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, textWrap: "pretty" }}>Manage the robot's targets — set the activity name, level, and registration date. The exact class the robot will book on the day.</div>
              </div>
            </div>

            {/* Feature row 3 */}
            <div style={{ display: "flex", gap: "1.5vw", alignItems: "flex-start" }}>
              <div style={{ width: "1vw", height: "1vw", backgroundColor: "#EE6C4D", marginTop: "0.4vh", flexShrink: 0 }} />
              <div>
                <div style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, marginBottom: "0.5vh" }}>Booking History</div>
                <div style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, textWrap: "pretty" }}>A full log of every booking attempt — outcome, confirmation number, class date, and error details if something went wrong.</div>
              </div>
            </div>
          </div>

          {/* Right: mock UI card */}
          <div style={{ flex: 1, border: "1px solid #E0E0E0", backgroundColor: "#FAFAFA", padding: "2vw" }}>
            {/* Mock header */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", marginBottom: "2vh", paddingBottom: "1.5vh", borderBottom: "1px solid #E0E0E0" }}>
              <div style={{ width: "1.2vw", height: "1.2vw", backgroundColor: "#3D5A80" }} />
              <span style={{ color: "#3D5A80", fontSize: "1.1vw", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Robot Helper</span>
            </div>
            {/* Mock target card */}
            <div style={{ backgroundColor: "#FFFFFF", border: "1px solid #E0E0E0", padding: "1.5vw", marginBottom: "1.5vh" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ color: "#111111", fontSize: "1.2vw", fontWeight: 700 }}>Ice Skating</div>
                  <div style={{ color: "#3D5A80", fontSize: "1vw", fontWeight: 600 }}>Gliders 2</div>
                </div>
                <div style={{ backgroundColor: "#EEF4E8", color: "#3A7D27", fontSize: "0.9vw", fontWeight: 600, padding: "0.4vh 0.8vw", border: "1px solid #B8DAA0" }}>
                  active
                </div>
              </div>
              <div style={{ color: "#666666", fontSize: "0.95vw", marginTop: "1vh" }}>
                Reg. date: 2026-08-15 — window 09:50 – 10:10 AM
              </div>
            </div>
            {/* "Robot is on it" badge */}
            <div style={{ backgroundColor: "#3D5A80", color: "#FFFFFF", padding: "1vh 1.5vw", textAlign: "center", fontSize: "1vw", fontWeight: 600, letterSpacing: "0.05em" }}>
              Robot is on it
            </div>
          </div>

        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600 }}>
        06
      </div>
    </div>
  );
}
