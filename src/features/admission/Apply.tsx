
import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import VerifyContact from "./VerifyContact";

const COUNTRY_MIN = 2;

type PlatformFeatures = {
  email_verification_required: boolean;
  kyc_required: boolean;
};

const DEFAULT_FEATURES: PlatformFeatures = {
  email_verification_required: false,
  kyc_required: false,
};

export default function Apply() {
  const { profile, session, signOut } = useAuth();

  const [f, setF] = useState({
    full_name: "",
    email: "",
    whatsapp: "",
    country: "",
    password: "",
    dob: "",
  });

  const [features, setFeatures] =
    useState<PlatformFeatures>(DEFAULT_FEATURES);

  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const set =
    (k: keyof typeof f) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setF({ ...f, [k]: e.target.value });

  // Read Owner Admin verification settings.
  useEffect(() => {
    let active = true;

    async function loadSettings() {
      const { data, error: settingsError } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "platform_features")
        .maybeSingle();

      if (!active) return;

      if (!settingsError && data?.value) {
        setFeatures({
          email_verification_required:
            data.value.email_verification_required === true,
          kyc_required:
            data.value.kyc_required === true,
        });
      }

      setSettingsLoaded(true);
    }

    void loadSettings();

    return () => {
      active = false;
    };
  }, []);

  // Read the current applicant's admission status.
  useEffect(() => {
    if (!session) {
      setLoaded(true);
      setStatus(null);
      return;
    }

    let active = true;

    async function loadAdmission() {
      const { data, error: admissionError } = await supabase
        .from("admissions")
        .select("status")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!active) return;

      if (!admissionError) {
        setStatus(data?.[0]?.status ?? null);
      }

      setLoaded(true);
    }

    void loadAdmission();

    return () => {
      active = false;
    };
  }, [session]);

  async function signUp(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMsg("");

    const wa = f.whatsapp.replace(/[\s\-().]/g, "");

    if (!/^\+?[0-9]{7,15}$/.test(wa)) {
      setError(
        "Enter a valid WhatsApp number, e.g. +2348012345678."
      );
      setBusy(false);
      return;
    }

    if (f.country.trim().length < COUNTRY_MIN) {
      setError("Country is required.");
      setBusy(false);
      return;
    }

    const { data, error: err } = await supabase.auth.signUp({
      email: f.email.trim(),
      password: f.password,
      options: {
        data: {
          full_name: f.full_name.trim(),
          whatsapp: wa,
          country: f.country.trim(),
        },
      },
    });

    setBusy(false);

    if (err) {
      setError(err.message);
      return;
    }

    if (data.session) {
      setMsg("Account created successfully. You can continue.");
    } else {
      setMsg(
        "Account created. Please log in to continue. If email confirmation is enabled by the authentication provider, confirm your email first."
 
      );
    }
  }

  async function submitAdmission(e: FormEvent) {
    e.preventDefault();

    setBusy(true);
    setError("");
    setMsg("");

    const { error: err } = await supabase.rpc("submit_admission", {
      p_dob: f.dob || null,
    });

    setBusy(false);

    if (err) {
      setError(err.message);
      return;
    }

    setMsg("Application submitted successfully.");
    setStatus("submitted");
  }

  // Logged-in applicant.
  if (session && profile?.role === "applicant") {
    return (
      <div className="wrap">
        <h1>Admission</h1>

        <p className="muted">
          Hello {profile.full_name}.
        </p>

        {!settingsLoaded ? (
          <p className="muted">Loading platform settings…</p>
        ) : (
          <>
            {/* Email verification appears only when Owner Admin enables it. */}
            {features.email_verification_required && (
              <VerifyContact channel="email" />
            )}

            {/* WhatsApp verification is not a requirement for application submission. */}

            {!features.email_verification_required &&
              !features.kyc_required && (
                <div className="card">
                  <p className="ok">
                    Verification is currently not required for admission.
                  </p>
                  <p className="muted">
                    You can continue with your application.
                  </p>
                </div>
              )}

            {!loaded ? (
              <p className="muted">
                Loading application status…
              </p>
            ) : status ? (
              <div className="card">
                <b>
                  Application status:{" "}
                  {status === "kyc_pending" &&
                  !features.kyc_required
                    ? "submitted"
                    : status.replace("_", " ")}
                </b>

                {(status === "submitted" ||
                  (status === "kyc_pending" &&
                    !features.kyc_required)) && (
                  <p className="muted">
                    Your application is awaiting review by BLISS Academy.
                  </p>
                )}

                {status === "kyc_pending" &&
                  features.kyc_required && (
                  <p className="muted">
                    Identity verification is required for your
                    application to continue.
                  </p>
                )}

                {status === "under_review" && (
                  <p className="muted">
                    Your application is currently being reviewed.
                  </p>
                )}

                {status === "approved" && (
                  <p className="ok">
                    Approved. Payment and course selection open next.
                  </p>
                )}

                {status === "rejected" && (
                  <p className="err">
                    Your application was not approved.
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={submitAdmission}>
                <label>Date of birth</label>

                <input
                  type="date"
                  value={f.dob}
                  onChange={set("dob")}
                  required
                />

                {error && <div className="err">{error}</div>}

                <button disabled={busy}>
                  {busy
                    ? "Submitting…"
                    : "Submit application"}
                </button>
              </form>
            )}
          </>
        )}

        {msg && <div className="ok">{msg}</div>}

        <button className="ghost" onClick={signOut}>
          Log out
        </button>
      </div>
    );
  }

  // Other authenticated roles.
  if (session && profile && profile.role !== "applicant") {
    return (
      <div className="wrap">
        <h1>Apply to BLISS Academy</h1>

        <p className="muted">
          You are already signed in.
        </p>

        <Link
          to={
            profile.role === "superadmin"
              ? "/admin/overview"
              : "/dashboard"
          }
        >
          <button>Go to my dashboard</button>
        </Link>
      </div>
    );
  }

  // New applicant registration.
  return (
    <form className="wrap" onSubmit={signUp}>
      <h1>Apply to BLISS Academy</h1>

      <label>Full legal name</label>
      <input
        value={f.full_name}
        onChange={set("full_name")}
        required
        minLength={2}
      />

      <label>Email</label>
      <input
        type="email"
        value={f.email}
        onChange={set("email")}
        required
      />

      <label>WhatsApp number</label>
      <input
        value={f.whatsapp}
        onChange={set("whatsapp")}
        required
        placeholder="+2348012345678"
      />

      <label>Country</label>
      <input
        value={f.country}
        onChange={set("country")}
        required
      />

      <label>Password</label>
      <input
        type="password"
        minLength={8}
        value={f.password}
        onChange={set("password")}
        required
      />

      {error && <div className="err">{error}</div>}
      {msg && <div className="ok">{msg}</div>}

      <button disabled={busy}>
        {busy ? "Creating account…" : "Create account"}
      </button>

      <p className="muted">
        Already applied? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
