import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";
import { AuthProvider } from "./lib/auth";
import { configMissing } from "./lib/supabase";
import "./styles/global.css";

const root = ReactDOM.createRoot(document.getElementById("root") !);

if (configMissing) {
  root.render(
    <div className="wrap">
      <h1>Setup needed</h1>
      <p className="muted">
        The Supabase settings are missing. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
        to your environment variables, then rebuild.
      </p>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}