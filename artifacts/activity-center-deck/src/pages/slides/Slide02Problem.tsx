export default function Slide02Problem() {
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
          The Problem
        </h2>
        <p style={{ color: "#666666", fontSize: "1.3vw", margin: "0 0 5vh 0", maxWidth: "50vw", textWrap: "pretty" }}>
          City of Burnaby rec classes are popular. Registration opens at 10 AM sharp — and fills up in minutes.
        </p>

        {/* Three problem cards */}
        <div style={{ display: "flex", gap: "2vw" }}>
          {/* Card 1 */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", padding: "2.5vw", border: "1px solid #E0E0E0", boxShadow: "0 1vh 2vh rgba(0,0,0,0.03)" }}>
            <div style={{ width: "2vw", height: "2vw", backgroundColor: "#EE6C4D", marginBottom: "2vh" }} />
            <h3 style={{ color: "#111111", fontSize: "1.5vw", fontWeight: 700, margin: "0 0 1.5vh 0", lineHeight: 1.2 }}>
              Spots fill in seconds
            </h3>
            <p style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              Burnaby Gliders 2 and Swimmer sessions sell out before most parents finish logging in. Being 90 seconds late means a waitlist — and months of waiting.
            </p>
          </div>

          {/* Card 2 */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", padding: "2.5vw", border: "1px solid #E0E0E0", boxShadow: "0 1vh 2vh rgba(0,0,0,0.03)" }}>
            <div style={{ width: "2vw", height: "2vw", backgroundColor: "#98C1D9", marginBottom: "2vh" }} />
            <h3 style={{ color: "#111111", fontSize: "1.5vw", fontWeight: 700, margin: "0 0 1.5vh 0", lineHeight: 1.2 }}>
              Fixed registration windows
            </h3>
            <p style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              Registration opens on a specific date at a specific time. No early access, no reminders from the city. Miss the window and the class is gone.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{ flex: 1, backgroundColor: "#FFFFFF", padding: "2.5vw", border: "1px solid #E0E0E0", boxShadow: "0 1vh 2vh rgba(0,0,0,0.03)" }}>
            <div style={{ width: "2vw", height: "2vw", backgroundColor: "#3D5A80", marginBottom: "2vh" }} />
            <h3 style={{ color: "#111111", fontSize: "1.5vw", fontWeight: 700, margin: "0 0 1.5vh 0", lineHeight: 1.2 }}>
              Manual process, every time
            </h3>
            <p style={{ color: "#666666", fontSize: "1.1vw", lineHeight: 1.6, margin: 0, textWrap: "pretty" }}>
              Log in, find the class, add to cart, check out — all before someone else takes the last spot. There was no automation. Until now.
            </p>
          </div>
        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600 }}>
        02
      </div>
    </div>
  );
}
