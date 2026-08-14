const base = import.meta.env.BASE_URL;

export default function Slide01Title() {
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
      {/* Top-left blue square */}
      <div style={{ position: "absolute", top: "5vh", left: "5vw", width: "3vw", height: "3vw", backgroundColor: "#3D5A80", zIndex: 1 }} />

      {/* Top-right label */}
      <div style={{ position: "absolute", top: "5vh", right: "5vw", zIndex: 1, textAlign: "right" }}>
        <div style={{ color: "#3D5A80", fontSize: "0.9vw", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.5vh" }}>
          Personal Automation Project
        </div>
        <div style={{ color: "#999999", fontSize: "0.8vw", textTransform: "uppercase", letterSpacing: "0.1em" }}>
          August 2026
        </div>
      </div>

      {/* Hero image — right half */}
      <div style={{ position: "absolute", right: 0, top: 0, width: "50vw", height: "100vh", zIndex: 1, overflow: "hidden" }}>
        <img
          src={`${base}hero.png`}
          crossOrigin="anonymous"
          alt="Robot booking a class"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center" }}
        />
        {/* Gradient fade to white on the left edge */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #FFFFFF 0%, transparent 30%)" }} />
      </div>

      {/* Title block — bottom left */}
      <div style={{ position: "absolute", bottom: "10vh", left: "10vw", zIndex: 2, maxWidth: "50vw" }}>
        <div style={{ color: "#3D5A80", fontSize: "1.1vw", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: "2vh" }}>
          Built on Replit
        </div>
        <h1 style={{ color: "#111111", fontSize: "6.5vw", margin: "0 0 2vh 0", fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.03em", textWrap: "balance" }}>
          Activity Center Bot
        </h1>
        <p style={{ color: "#666666", fontSize: "1.8vw", margin: 0, fontWeight: 400, lineHeight: 1.4, maxWidth: "42vw", textWrap: "pretty" }}>
          Automated rec class registration for Agastya — so no one misses Gliders 2.
        </p>
      </div>

      {/* Slide number */}
      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600, zIndex: 2 }}>
        01
      </div>
    </div>
  );
}
