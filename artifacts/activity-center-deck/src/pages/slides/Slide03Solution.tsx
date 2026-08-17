export default function Slide03Solution() {
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

      {/* Left accent bar */}
      <div style={{ position: "absolute", left: "5vw", top: "20vh", width: "0.5vw", height: "60vh", backgroundColor: "#3D5A80", zIndex: 1 }} />

      <div style={{ position: "absolute", top: "20vh", left: "8vw", zIndex: 1, maxWidth: "55vw" }}>
        <div style={{ color: "#3D5A80", fontSize: "1.1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "3vh" }}>
          The Solution
        </div>
        <h2 style={{ color: "#111111", fontSize: "5.5vw", margin: "0 0 4vh 0", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.03em", textWrap: "balance" }}>
          A personal booking robot.
        </h2>
        <p style={{ color: "#444444", fontSize: "1.8vw", margin: "0 0 5vh 0", lineHeight: 1.5, textWrap: "pretty" }}>
          A server that wakes up at 9:50 AM on registration day, logs into the Burnaby portal, finds Agastya's class, and completes checkout — all before the coffee is ready.
        </p>

        {/* Three outcome chips */}
        <div style={{ display: "flex", gap: "1.5vw" }}>
          <div style={{ backgroundColor: "#F7F9FC", border: "1px solid #D0DCE8", padding: "1vh 1.5vw" }}>
            <span style={{ color: "#3D5A80", fontSize: "1.1vw", fontWeight: 600 }}>Logs in automatically</span>
          </div>
          <div style={{ backgroundColor: "#F7F9FC", border: "1px solid #D0DCE8", padding: "1vh 1.5vw" }}>
            <span style={{ color: "#3D5A80", fontSize: "1.1vw", fontWeight: 600 }}>Registers the class</span>
          </div>
          <div style={{ backgroundColor: "#F7F9FC", border: "1px solid #D0DCE8", padding: "1vh 1.5vw" }}>
            <span style={{ color: "#3D5A80", fontSize: "1.1vw", fontWeight: 600 }}>Sends a Telegram alert</span>
          </div>
        </div>
      </div>

      {/* Right side — large stat */}
      <div style={{ position: "absolute", right: "8vw", bottom: "15vh", zIndex: 1, textAlign: "right" }}>
        <div style={{ color: "#F0F0F0", fontSize: "20vw", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.05em", userSelect: "none" }}>
          0:00
        </div>
        <div style={{ color: "#3D5A80", fontSize: "1.2vw", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: "-4vh" }}>
          Time to spare
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600 }}>
        03
      </div>
    </div>
  );
}
