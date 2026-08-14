export default function Slide04HowItWorks() {
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
          How It Works
        </h2>
        <p style={{ color: "#666666", fontSize: "1.3vw", margin: "0 0 5vh 0", textWrap: "pretty" }}>
          Every 60 seconds on registration day, the scheduler wakes and checks the time. Here is what happens inside the 9:50–10:10 AM window.
        </p>

        {/* 4-step flow */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0" }}>

          {/* Step 1 */}
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ backgroundColor: "#3D5A80", color: "#FFFFFF", width: "3.5vw", height: "3.5vw", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6vw", fontWeight: 800, marginBottom: "2vh" }}>
              1
            </div>
            <div style={{ position: "absolute", top: "1.75vw", left: "3.5vw", right: 0, height: "1px", backgroundColor: "#D0DCE8" }} />
            <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: "0 0 1vh 0" }}>Scheduler wakes</h3>
            <p style={{ color: "#666666", fontSize: "1.05vw", lineHeight: 1.6, margin: 0, paddingRight: "2vw", textWrap: "pretty" }}>
              A Node.js scheduler runs every 60 seconds. On registration day, between 9:50 and 10:10 AM Vancouver time, it fires the booking job.
            </p>
          </div>

          {/* Step 2 */}
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ backgroundColor: "#3D5A80", color: "#FFFFFF", width: "3.5vw", height: "3.5vw", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6vw", fontWeight: 800, marginBottom: "2vh" }}>
              2
            </div>
            <div style={{ position: "absolute", top: "1.75vw", left: "3.5vw", right: 0, height: "1px", backgroundColor: "#D0DCE8" }} />
            <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: "0 0 1vh 0" }}>Playwright logs in</h3>
            <p style={{ color: "#666666", fontSize: "1.05vw", lineHeight: 1.6, margin: 0, paddingRight: "2vw", textWrap: "pretty" }}>
              A headless Chromium browser opens the Burnaby portal, authenticates with Agastya's family account, and navigates to the activity search page.
            </p>
          </div>

          {/* Step 3 */}
          <div style={{ flex: 1, position: "relative" }}>
            <div style={{ backgroundColor: "#3D5A80", color: "#FFFFFF", width: "3.5vw", height: "3.5vw", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6vw", fontWeight: 800, marginBottom: "2vh" }}>
              3
            </div>
            <div style={{ position: "absolute", top: "1.75vw", left: "3.5vw", right: 0, height: "1px", backgroundColor: "#D0DCE8" }} />
            <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: "0 0 1vh 0" }}>Class found and booked</h3>
            <p style={{ color: "#666666", fontSize: "1.05vw", lineHeight: 1.6, margin: 0, paddingRight: "2vw", textWrap: "pretty" }}>
              The scraper finds the target class by name and level, clicks "Add to cart," and completes checkout. If the site isn't ready yet, it retries next tick.
            </p>
          </div>

          {/* Step 4 */}
          <div style={{ flex: 1 }}>
            <div style={{ backgroundColor: "#EE6C4D", color: "#FFFFFF", width: "3.5vw", height: "3.5vw", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6vw", fontWeight: 800, marginBottom: "2vh" }}>
              4
            </div>
            <h3 style={{ color: "#111111", fontSize: "1.4vw", fontWeight: 700, margin: "0 0 1vh 0" }}>Telegram notification</h3>
            <p style={{ color: "#666666", fontSize: "1.05vw", lineHeight: 1.6, margin: 0, paddingRight: "2vw", textWrap: "pretty" }}>
              A Telegram message arrives instantly with the confirmation number, class date, time, and location. No app refresh needed.
            </p>
          </div>

        </div>
      </div>

      <div style={{ position: "absolute", bottom: "5vh", left: "5vw", color: "#999999", fontSize: "0.9vw", fontWeight: 600 }}>
        04
      </div>
    </div>
  );
}
