
import React, { Component, ErrorInfo, ReactNode } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./app/App";
import { AuthProvider } from "./lib/auth";
import "./styles/global.css";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      message: error.message || "Unknown application error"
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("BLISS Academy startup error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="wrap">
          <h1>BLISS Academy</h1>
          <h2>Application Error</h2>
          <p>The application encountered an unexpected error.</p>
          <pre style={{ whiteSpace: "pre-wrap", color: "#c91d21" }}>
            {this.state.message}
          </pre>
          <button onClick={() => window.location.reload()}>
            Reload Application
          </button>
        </main>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("BLISS Academy: root element not found.");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
