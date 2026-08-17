export default function Slide09Closing() {
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
          Personal Automation Project
        </div>
        <div style={{ color: "#999999", fontSize: "0.8vw", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          August 2026
        </div>
      </div>

      {/* Large background text watermark */}
      <div style={{ position: "absolute", bottom: "-4vh", right: "-2vw", color: "#F5F5F5", fontSize: "22vw", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.05em", userSelect: "none", zIndex: 0 }}>
        G2
      </div>

      {/* Main content — center stage */}
      <div style={{ position: "absolute", top: "25vh", left: "10vw", zIndex: 1, maxWidth: "60vw" }}>
        <div style={{ color: "#3D5A80", fontSize: "1.1vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: "3vh" }}>
          Status: Ready to book
        </div>
        <h2 style={{ color: "#111111", fontSize: "6vw", margin: "0 0 3vh 0", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.04em", textWrap: "balance" }}>
          Gliders 2, here we come.
        </h2>
        <p style={{ color: "#555555", fontSize: "1.8vw", margin: "0 0 5vh 0", lineHeight: 1.5, maxWidth: "48vw", textWrap: "pretty" }}>
          Built with code. Registered by robot. Skated by Agastya.
        </p>

        {/* Two detail chips */}
        <div style={{ display: "flex", gap: "2vw", alignItems: "center" }}>
          <div style={{ backgroundColor: "#3D5A80", color: "#FFFFFF", padding: "1.2vh 2vw", fontSize: "1.1vw", fontWeight: 600, letterSpacing: "0.04em" }}>
            Reg. opens Aug 15 at 10:00 AM
          </div>
          <div style={{ border: "2px solid #3D5A80", color: "#3D5A80", padding: "1.2vh 2vw", fontSize: "1.1vw", fontWeight: 600, letterSpacing: "0.04em" }}>
            Robot checks from 9:50 AM
          </div>
        </div>
      </div>

      {/* Bottom-right credit */}
      <div style={{ position: "absolute", bottom: "8vh", right: "5vw", zIndex: 1, textAlign: "right" }}>
        <div style={{ color: "#999999", fontSize: "1vw", lineHeight: 1.6 }}>
          Built on Replit — 2026
        </div>
        <div style={{ color: "#CCCCCC", fontSize: "0.9vw" }}>
          active-communities-bot.replit.app
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600, zIndex: 1 }}>
        09
      </div>
    </div>
  );
}
