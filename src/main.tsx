
import React from "react";
import ReactDOM from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
  document.body.innerHTML = `
    <div style="padding:30px;font-family:Arial">
      <h1>BLISS Academy</h1>
      <h2>Startup Error</h2>
      <p>The root element was not found in index.html.</p>
    </div>
  `;
} else {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <main
        style={{
          minHeight: "100vh",
          background: "#ffffff",
          color: "#0f1b2d",
          fontFamily: "Arial, sans-serif",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "24px",
          textAlign: "center",
          boxSizing: "border-box"
        }}
      >
        <h1 style={{ color: "#0b4da2" }}>
          BLISS Academy
        </h1>

        <h2>Frontend Startup Test</h2>

        <p style={{ fontSize: "17px" }}>
          React is successfully running!
        </p>

        <p>
          The website entry point has loaded correctly.
        </p>

        <p style={{ color: "#16803c", fontWeight: "bold" }}>
          STARTUP TEST PASSED
        </p>
      </main>
    </React.StrictMode>
  );
}
