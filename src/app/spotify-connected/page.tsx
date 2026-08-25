export default function SpotifyConnected() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "24px",
        color: "white",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#1DB954",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
        }}
      >
        ✓
      </div>
      <h1 style={{ fontSize: 22, fontWeight: "bold", margin: 0 }}>
        Connected to Spotify
      </h1>
      <p style={{ color: "#888", margin: 0, maxWidth: 280, lineHeight: 1.5 }}>
        Your SOTD feed will be exported to a private playlist daily.
      </p>
      <p style={{ color: "#555", fontSize: 13, margin: 0 }}>
        You can close this tab and return to the app.
      </p>
    </div>
  );
}
